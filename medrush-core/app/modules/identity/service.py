import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.identity.repository import (
    get_principal_by_id, get_principal_by_phone,
    create_principal, create_role_assignment, list_roles,
)
from app.modules.identity.schemas import PrincipalOut, RoleAssignmentOut, OtpVerifyOut
from app.cache.redis import get_redis
from app.lib.errors import NotFoundError, AppValidationError

DEV_OTP = "000000"
OTP_TTL_SECONDS = 300


async def send_otp(phone_e164: str) -> None:
    redis = await get_redis()
    await redis.setex(f"otp:{phone_e164}", OTP_TTL_SECONDS, DEV_OTP)
    # TODO: replace DEV_OTP with random 6-digit code + Twilio SMS when going to prod


async def verify_otp(session: AsyncSession, phone_e164: str, otp: str) -> OtpVerifyOut:
    redis = await get_redis()
    stored = await redis.get(f"otp:{phone_e164}")

    if stored is None:
        raise AppValidationError("OTP expired or not requested")
    if stored != otp:
        raise AppValidationError("Invalid OTP")

    await redis.delete(f"otp:{phone_e164}")

    principal = await get_principal_by_phone(session, phone_e164)
    if not principal:
        principal_id = f"cust_{uuid.uuid4().hex[:10]}"
        principal = await create_principal(session, principal_id, phone_e164)
        await create_role_assignment(session, principal_id, "customer")
        await session.commit()

    # Look up actual role from role_assignments (rider, pharmacist, customer, etc.)
    roles = await list_roles(session, principal.id)
    role = roles[0].role if roles else "customer"

    return OtpVerifyOut(
        principal_id=principal.id,
        phone_e164=principal.phone_e164,
        role=role,
    )


async def fetch_principal(session: AsyncSession, principal_id: str) -> PrincipalOut:
    principal = await get_principal_by_id(session, principal_id)
    if not principal:
        raise NotFoundError(f"Principal {principal_id} not found")
    return principal


async def get_principal_roles(session: AsyncSession, principal_id: str) -> list[RoleAssignmentOut]:
    return await list_roles(session, principal_id)
