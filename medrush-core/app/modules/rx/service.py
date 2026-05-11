"""
Prescription (Rx) service.

Upload flow:
  1. Client calls GET /rx/presigned-upload  → gets a presigned S3 URL
  2. Client uploads image directly to S3
  3. Client calls POST /rx with the s3_key → triggers mock OCR → returns rx_id
  4. Frontend polls / WS for ocr_status change
  5. Pharmacy calls PATCH /rx/{rx_id}/verify to approve/reject

Mock OCR runs immediately in-process (will be replaced with real model later).
"""
import uuid
import random
from datetime import datetime, timezone, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.rx.repository import (
    get_prescription, list_by_user, list_rx_items, list_rx_flags,
    create_prescription, create_rx_items, create_rx_flags, update_ocr_result,
    verify_prescription, enqueue_for_verification,
)
from app.modules.rx.models import Prescription, RxItem, RxFlag, VerificationQueue
from app.modules.rx.schemas import (
    PrescriptionOut, RxItemOut, RxFlagOut, PrescriptionDetailOut,
    UploadRxIn, PresignedUploadOut, PharmacyVerifyRxIn,
)
from app.lib.errors import NotFoundError, ForbiddenError
from app.kafka.events import publish_event

# ─── Mock OCR ────────────────────────────────────────────────────────────────

_MOCK_OCR_MEDICINES = [
    {"raw_medicine_name": "Paracetamol 500mg", "dosage": "500 mg", "frequency": "TID", "duration_days": 5, "qty_prescribed": 15},
    {"raw_medicine_name": "Amoxicillin 250mg", "dosage": "250 mg", "frequency": "BID", "duration_days": 7, "qty_prescribed": 14},
    {"raw_medicine_name": "Metformin 500mg",   "dosage": "500 mg", "frequency": "BD",  "duration_days": 30, "qty_prescribed": 60},
    {"raw_medicine_name": "Atorvastatin 10mg", "dosage": "10 mg",  "frequency": "OD",  "duration_days": 30, "qty_prescribed": 30},
    {"raw_medicine_name": "Pantoprazole 40mg", "dosage": "40 mg",  "frequency": "OD",  "duration_days": 14, "qty_prescribed": 14},
]

_MOCK_DOCTORS = [
    ("Dr. Ramesh Kumar", "City General Hospital, Bengaluru"),
    ("Dr. Priya Sharma",  "Apollo Clinic, Indiranagar"),
    ("Dr. Suresh Rao",    "Manipal Hospital"),
]


def _run_mock_ocr(s3_key: str) -> dict:
    """Deterministic-ish mock OCR based on s3_key hash."""
    seed = sum(ord(c) for c in s3_key)
    random.seed(seed)
    n_items = random.randint(1, 3)
    items = random.sample(_MOCK_OCR_MEDICINES, n_items)
    doctor, hospital = random.choice(_MOCK_DOCTORS)
    confidence_bps = random.randint(7500, 9800)  # 75-98%
    return {
        "confidence_bps": confidence_bps,
        "doctor_name": doctor,
        "hospital_name": hospital,
        "items": items,
    }


# ─── Presigned Upload (stub – replace with boto3 in production) ───────────────

async def generate_presigned_url(principal_id: str) -> PresignedUploadOut:
    s3_key = f"rx/{principal_id}/{uuid.uuid4()}.jpg"
    # In production: use boto3.generate_presigned_post()
    upload_url = f"https://medrush-rx-vault.s3.ap-south-1.amazonaws.com/{s3_key}?mock=1"
    return PresignedUploadOut(upload_url=upload_url, s3_key=s3_key, expires_in=300)


# ─── Upload & OCR ─────────────────────────────────────────────────────────────

async def upload_prescription(
    session: AsyncSession,
    principal_id: str,
    payload: UploadRxIn,
) -> PrescriptionDetailOut:
    now = datetime.now(timezone.utc)
    rx_id = str(uuid.uuid4())
    retention_until = now + timedelta(days=5 * 365)  # 5-year audit retention

    rx = Prescription(
        id=rx_id,
        principal_id=principal_id,
        family_member_id=payload.family_member_id,
        s3_key=payload.s3_key,
        ocr_status="processing",
        retention_class="standard",
        retention_until=retention_until,
        is_verified=False,
        created_at=now,
        updated_at=now,
    )
    await create_prescription(session, rx)

    # Run mock OCR immediately (replace with background task / Celery later)
    ocr = _run_mock_ocr(payload.s3_key)
    await update_ocr_result(
        session, rx_id,
        ocr_status="done",
        confidence_bps=ocr["confidence_bps"],
        doctor_name=ocr["doctor_name"],
        hospital_name=ocr["hospital_name"],
    )

    # Persist extracted line items
    rx_items = [
        RxItem(
            id=str(uuid.uuid4()),
            rx_id=rx_id,
            raw_medicine_name=item["raw_medicine_name"],
            dosage=item.get("dosage"),
            frequency=item.get("frequency"),
            duration_days=item.get("duration_days"),
            qty_prescribed=item.get("qty_prescribed"),
        )
        for item in ocr["items"]
    ]
    await create_rx_items(session, rx_items)

    # Flag if confidence is low
    flags: list[RxFlag] = []
    if ocr["confidence_bps"] < 8000:
        flags.append(RxFlag(
            id=str(uuid.uuid4()),
            rx_id=rx_id,
            flag_type="low_confidence",
            description=f"OCR confidence {ocr['confidence_bps'] / 100:.1f}% — manual review recommended",
            severity="warn",
            created_at=now,
        ))
    if flags:
        await create_rx_flags(session, flags)

    # Enqueue for pharmacist verification
    queue_item = VerificationQueue(
        id=str(uuid.uuid4()),
        rx_id=rx_id,
        priority=5,
        status="pending",
        queued_at=now,
    )
    await enqueue_for_verification(session, queue_item)

    await session.commit()

    # Kafka audit event
    await publish_event("rx.uploaded", {
        "rx_id": rx_id,
        "principal_id": principal_id,
        "ocr_status": "done",
        "confidence_bps": ocr["confidence_bps"],
    })

    items_out = [
        RxItemOut(
            id=i.id, rx_id=i.rx_id, medicine_id=None,
            raw_medicine_name=i.raw_medicine_name,
            dosage=i.dosage, frequency=i.frequency,
            duration_days=i.duration_days, qty_prescribed=i.qty_prescribed,
        )
        for i in rx_items
    ]
    flags_out = [
        RxFlagOut(
            id=f.id, rx_id=f.rx_id, flag_type=f.flag_type,
            description=f.description, severity=f.severity, created_at=f.created_at,
        )
        for f in flags
    ]

    rx_out = await get_prescription(session, rx_id)
    return PrescriptionDetailOut(**rx_out.model_dump(), items=items_out, flags=flags_out)


# ─── Pharmacy verify ──────────────────────────────────────────────────────────

async def pharmacy_verify(
    session: AsyncSession,
    rx_id: str,
    pharmacist_id: str,
    payload: PharmacyVerifyRxIn,
) -> PrescriptionOut:
    rx = await get_prescription(session, rx_id)
    if not rx:
        raise NotFoundError(f"Prescription {rx_id} not found")

    await verify_prescription(session, rx_id, pharmacist_id, payload.approved)
    await session.commit()

    await publish_event("rx.verified", {
        "rx_id": rx_id,
        "pharmacist_id": pharmacist_id,
        "approved": payload.approved,
    })

    updated = await get_prescription(session, rx_id)
    return updated


# ─── Read ─────────────────────────────────────────────────────────────────────

async def fetch_prescription(session: AsyncSession, rx_id: str) -> PrescriptionOut:
    rx = await get_prescription(session, rx_id)
    if not rx:
        raise NotFoundError(f"Prescription {rx_id} not found")
    return rx


async def get_user_prescriptions(session: AsyncSession, principal_id: str) -> list[PrescriptionOut]:
    return await list_by_user(session, principal_id)


async def get_rx_items(session: AsyncSession, rx_id: str) -> list[RxItemOut]:
    return await list_rx_items(session, rx_id)


async def get_rx_flags(session: AsyncSession, rx_id: str) -> list[RxFlagOut]:
    return await list_rx_flags(session, rx_id)
