from fastapi import APIRouter, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.deps import get_async_session
from app.modules.identity.schemas import (
    PrincipalOut, RoleAssignmentOut, OtpSendIn, OtpVerifyIn, OtpVerifyOut,
)
from app.modules.identity import service

router = APIRouter()


@router.post("/otp/send", status_code=200)
async def otp_send(payload: OtpSendIn) -> dict:
    await service.send_otp(payload.phone_e164)
    return {"message": "OTP sent"}


@router.post("/otp/verify", response_model=OtpVerifyOut)
async def otp_verify(
    payload: OtpVerifyIn,
    session: AsyncSession = Depends(get_async_session),
) -> OtpVerifyOut:
    return await service.verify_otp(session, payload.phone_e164, payload.otp)


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
