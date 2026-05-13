import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.modules.notification.models import DeliveryLog, DeviceToken
from app.modules.notification.schemas import DeliveryLogOut


async def list_by_recipient(session: AsyncSession, principal_id: str) -> list[DeliveryLogOut]:
    result = await session.execute(
        select(DeliveryLog)
        .where(DeliveryLog.recipient_principal_id == principal_id)
        .order_by(DeliveryLog.created_at.desc())
    )
    return [DeliveryLogOut.model_validate(row) for row in result.scalars()]


async def upsert_device_token(
    session: AsyncSession,
    principal_id: str,
    token: str,
    platform: str,
) -> DeviceToken:
    """Register or re-activate a push token. Deactivates the old token if it belongs to another user."""
    now = datetime.now(timezone.utc)

    # Check if token already exists (possibly for a different user)
    existing = await session.execute(
        select(DeviceToken).where(DeviceToken.token == token)
    )
    device = existing.scalar_one_or_none()

    if device:
        device.principal_id = principal_id
        device.platform = platform
        device.is_active = True
        device.last_used_at = now
    else:
        device = DeviceToken(
            id=str(uuid.uuid4()),
            principal_id=principal_id,
            token=token,
            platform=platform,
            is_active=True,
            registered_at=now,
            last_used_at=now,
        )
        session.add(device)

    await session.commit()
    return device


async def get_active_tokens_for_user(
    session: AsyncSession,
    principal_id: str,
) -> list[str]:
    result = await session.execute(
        select(DeviceToken.token)
        .where(
            DeviceToken.principal_id == principal_id,
            DeviceToken.is_active.is_(True),
        )
    )
    return list(result.scalars())


async def log_delivery(
    session: AsyncSession,
    principal_id: str,
    channel: str,
    destination: str,
    body: str,
    status: str,
    provider: str | None = None,
    provider_message_id: str | None = None,
) -> None:
    log = DeliveryLog(
        id=str(uuid.uuid4()),
        recipient_principal_id=principal_id,
        channel=channel,
        destination=destination,
        body=body,
        status=status,
        provider=provider,
        provider_message_id=provider_message_id,
        retry_count=0,
        created_at=datetime.now(timezone.utc),
    )
    session.add(log)
    await session.commit()
