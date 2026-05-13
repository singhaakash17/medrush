import hashlib
import hmac
import random
import string
from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.modules.identity.models import Principal, OtpAttempt
from app.modules.identity.repository import get_principal_by_id, get_principal_by_phone, list_roles
from app.modules.identity.schemas import PrincipalOut, RoleAssignmentOut, OtpVerifyResponse
from app.lib.errors import NotFoundError, UnauthorizedError


# ── OTP helpers ──────────────────────────────────────────────────────────────

_OTP_TTL_MINUTES = 10
_OTP_SECRET = b"medrush-otp-secret"  # In prod: load from settings/env


def _hash_otp(otp: str) -> str:
    return hmac.new(_OTP_SECRET, otp.encode(), hashlib.sha256).hexdigest()


def _generate_otp(length: int = 6) -> str:
    return "".join(random.choices(string.digits, k=length))


def _import_uuid() -> str:
    import uuid
    return str(uuid.uuid4())


# ── Service functions ─────────────────────────────────────────────────────────

async def send_otp(session: AsyncSession, phone_e164: str) -> None:
    """Upsert principal for phone, generate OTP, store hash, print for dev."""
    # Upsert principal
    result = await session.execute(
        select(Principal).where(Principal.phone_e164 == phone_e164)
    )
    principal = result.scalar_one_or_none()

    now = datetime.now(timezone.utc)
    if principal is None:
        principal = Principal(
            id=_import_uuid(),
            phone_e164=phone_e164,
            is_verified=False,
            is_active=True,
            created_at=now,
            updated_at=now,
        )
        session.add(principal)
        await session.flush()

    # Generate & store OTP attempt
    otp = _generate_otp()
    otp_hash = _hash_otp(otp)
    attempt = OtpAttempt(
        principal_id=principal.id,
        otp_hash=otp_hash,
        channel="sms",
        is_used=False,
        expires_at=now + timedelta(minutes=_OTP_TTL_MINUTES),
        created_at=now,
    )
    session.add(attempt)
    await session.commit()

    # In dev: print OTP to console (replace with SMS provider in prod)
    print(f"[DEV OTP] phone={phone_e164}  otp={otp}  principal_id={principal.id}")


async def verify_otp(session: AsyncSession, phone_e164: str, otp: str) -> OtpVerifyResponse:
    """Verify OTP, mark as used, return principal_id and role."""
    result = await session.execute(
        select(Principal).where(Principal.phone_e164 == phone_e164)
    )
    principal = result.scalar_one_or_none()
    if not principal:
        raise UnauthorizedError("Phone number not found. Please request a new OTP.")

    otp_hash = _hash_otp(otp)
    now = datetime.now(timezone.utc)

    attempt_result = await session.execute(
        select(OtpAttempt)
        .where(
            OtpAttempt.principal_id == principal.id,
            OtpAttempt.otp_hash == otp_hash,
            OtpAttempt.is_used == False,  # noqa: E712
            OtpAttempt.expires_at > now,
        )
        .order_by(OtpAttempt.created_at.desc())
        .limit(1)
    )
    attempt = attempt_result.scalar_one_or_none()
    if not attempt:
        raise UnauthorizedError("Invalid or expired OTP.")

    # Mark used & verify principal
    attempt.is_used = True
    principal.is_verified = True
    principal.updated_at = now
    await session.commit()

    # Fetch primary role
    roles = await get_principal_roles(session, principal.id)
    primary_role = roles[0].role if roles else "customer"

    return OtpVerifyResponse(principal_id=principal.id, role=primary_role)


async def fetch_principal(session: AsyncSession, principal_id: str) -> PrincipalOut:
    principal = await get_principal_by_id(session, principal_id)
    if not principal:
        raise NotFoundError(f"Principal {principal_id} not found")
    return principal


async def get_principal_roles(session: AsyncSession, principal_id: str) -> list[RoleAssignmentOut]:
    return await list_roles(session, principal_id)
