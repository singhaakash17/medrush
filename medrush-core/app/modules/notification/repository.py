from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.modules.notification.models import DeliveryLog
from app.modules.notification.schemas import DeliveryLogOut


async def list_by_recipient(session: AsyncSession, principal_id: str) -> list[DeliveryLogOut]:
    result = await session.execute(
        select(DeliveryLog)
        .where(DeliveryLog.recipient_principal_id == principal_id)
        .order_by(DeliveryLog.created_at.desc())
    )
    return [DeliveryLogOut.model_validate(row) for row in result.scalars()]
