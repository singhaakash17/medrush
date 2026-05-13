from fastapi import APIRouter, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.deps import get_async_session
from app.modules.notification.schemas import DeliveryLogOut, RegisterDeviceTokenIn, DeviceTokenOut
from app.modules.notification import service

router = APIRouter()


@router.get("/", response_model=list[DeliveryLogOut])
async def list_notifications(
    x_user_id: str = Header(..., alias="x-user-id"),
    session: AsyncSession = Depends(get_async_session),
) -> list[DeliveryLogOut]:
    return await service.get_user_notifications(session, x_user_id)


@router.post("/device-token", response_model=DeviceTokenOut)
async def register_device_token(
    payload: RegisterDeviceTokenIn,
    x_user_id: str = Header(..., alias="x-user-id"),
    session: AsyncSession = Depends(get_async_session),
) -> DeviceTokenOut:
    """Register or refresh an Expo push token for the current user."""
    return await service.register_device_token(session, x_user_id, payload)


@router.delete("/device-token/{token}")
async def deregister_device_token(
    token: str,
    x_user_id: str = Header(..., alias="x-user-id"),
    session: AsyncSession = Depends(get_async_session),
) -> dict:
    """Deactivate a push token (e.g. on logout)."""
    from app.modules.notification.repository import upsert_device_token
    from sqlalchemy import update
    from app.modules.notification.models import DeviceToken
    await session.execute(
        update(DeviceToken)
        .where(
            DeviceToken.token == token,
            DeviceToken.principal_id == x_user_id,
        )
        .values(is_active=False)
    )
    await session.commit()
    return {"status": "deactivated"}
