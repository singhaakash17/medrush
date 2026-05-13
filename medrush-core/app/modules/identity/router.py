from fastapi import APIRouter, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.deps import get_async_session
from app.modules.identity.schemas import (
    PrincipalOut,
    RoleAssignmentOut,
    OtpSendRequest,
    OtpSendResponse,
    OtpVerifyRequest,
    OtpVerifyResponse,
)
from app.modules.identity import service

router = APIRouter()


@router.post("/otp/send", response_model=OtpSendResponse)
async def send_otp(
    body: OtpSendRequest,
    session: AsyncSession = Depends(get_async_session),
) -> OtpSendResponse:
    """Create/upsert principal and issue a 6-digit OTP (logged to console in dev)."""
    await service.send_otp(session, body.phone_e164)
    return OtpSendResponse(message="OTP sent")


@router.post("/otp/verify", response_model=OtpVerifyResponse)
async def verify_otp(
    body: OtpVerifyRequest,
    session: AsyncSession = Depends(get_async_session),
) -> OtpVerifyResponse:
    """Verify the OTP and return the principal_id for the client to store."""
    return await service.verify_otp(session, body.phone_e164, body.otp)


@router.get("/me", response_model=PrincipalOut)
async def get_me(
    x_user_id: str = Header(..., alias="x-user-id"),
    session: AsyncSession = Depends(get_async_session),
) -> PrincipalOut:
    return await service.fetch_principal(session, x_user_id)


@router.get("/me/roles", response_model=list[RoleAssignmentOut])
async def get_my_roles(
    x_user_id: str = Header(..., alias="x-user-id"),
    session: AsyncSession = Depends(get_async_session),
) -> list[RoleAssignmentOut]:
    return await service.get_principal_roles(session, x_user_id)
