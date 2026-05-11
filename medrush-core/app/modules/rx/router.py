from fastapi import APIRouter, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.deps import get_async_session
from app.modules.rx.schemas import (
    PrescriptionOut, PrescriptionDetailOut, RxItemOut, RxFlagOut,
    UploadRxIn, PresignedUploadOut, PharmacyVerifyRxIn,
)
from app.modules.rx import service

router = APIRouter()


@router.get("/presigned-upload", response_model=PresignedUploadOut)
async def get_presigned_upload_url(
    x_user_id: str = Header(..., alias="x-user-id"),
) -> PresignedUploadOut:
    """Step 1: Get a presigned S3 URL to upload the prescription image."""
    return await service.generate_presigned_url(x_user_id)


@router.post("/", response_model=PrescriptionDetailOut, status_code=201)
async def upload_prescription(
    payload: UploadRxIn,
    x_user_id: str = Header(..., alias="x-user-id"),
    session: AsyncSession = Depends(get_async_session),
) -> PrescriptionDetailOut:
    """Step 2: After S3 upload, register Rx and run mock OCR."""
    return await service.upload_prescription(session, x_user_id, payload)


@router.get("/", response_model=list[PrescriptionOut])
async def list_prescriptions(
    x_user_id: str = Header(..., alias="x-user-id"),
    session: AsyncSession = Depends(get_async_session),
) -> list[PrescriptionOut]:
    return await service.get_user_prescriptions(session, x_user_id)


@router.get("/{rx_id}", response_model=PrescriptionOut)
async def get_prescription(
    rx_id: str,
    session: AsyncSession = Depends(get_async_session),
) -> PrescriptionOut:
    return await service.fetch_prescription(session, rx_id)


@router.get("/{rx_id}/items", response_model=list[RxItemOut])
async def get_rx_items(
    rx_id: str,
    session: AsyncSession = Depends(get_async_session),
) -> list[RxItemOut]:
    return await service.get_rx_items(session, rx_id)


@router.get("/{rx_id}/flags", response_model=list[RxFlagOut])
async def get_rx_flags(
    rx_id: str,
    session: AsyncSession = Depends(get_async_session),
) -> list[RxFlagOut]:
    return await service.get_rx_flags(session, rx_id)


@router.patch("/{rx_id}/verify", response_model=PrescriptionOut)
async def verify_prescription(
    rx_id: str,
    payload: PharmacyVerifyRxIn,
    x_user_id: str = Header(..., alias="x-user-id"),
    session: AsyncSession = Depends(get_async_session),
) -> PrescriptionOut:
    """Pharmacist approves or rejects an uploaded prescription."""
    return await service.pharmacy_verify(session, rx_id, x_user_id, payload)
