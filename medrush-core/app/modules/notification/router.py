from fastapi import APIRouter, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.deps import get_async_session
from app.modules.notification.schemas import DeliveryLogOut
from app.modules.notification import service

router = APIRouter()


@router.get("/", response_model=list[DeliveryLogOut])
async def list_notifications(
    x_user_id: str = Header(..., alias="x-user-id"),
    session: AsyncSession = Depends(get_async_session),
) -> list[DeliveryLogOut]:
    return await service.get_user_notifications(session, x_user_id)
