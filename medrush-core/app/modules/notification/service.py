from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.notification.repository import list_by_recipient
from app.modules.notification.schemas import DeliveryLogOut


async def get_user_notifications(session: AsyncSession, principal_id: str) -> list[DeliveryLogOut]:
    return await list_by_recipient(session, principal_id)
