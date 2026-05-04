import hashlib
import json
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.modules.audit.models import AuditLog
from app.modules.audit.schemas import AuditLogOut


def _compute_row_hash(
    prev_hash: str | None,
    event_name: str,
    target_id: str,
    occurred_at: datetime,
    payload: dict,
) -> str:
    canonical = json.dumps(
        {
            "prev_hash": prev_hash,
            "event_name": event_name,
            "target_id": target_id,
            "occurred_at": occurred_at.isoformat(),
            "payload": payload,
        },
        sort_keys=True,
    )
    return hashlib.sha256(canonical.encode()).hexdigest()


async def insert(
    session: AsyncSession,
    event_name: str,
    target_type: str,
    target_id: str,
    payload: dict,
    actor_id: str | None = None,
    actor_role: str | None = None,
) -> AuditLogOut:
    result = await session.execute(
        select(AuditLog).order_by(AuditLog.occurred_at.desc()).limit(1)
    )
    last = result.scalar_one_or_none()
    prev_hash = last.row_hash if last else None

    occurred_at = datetime.now(timezone.utc)
    row_hash = _compute_row_hash(prev_hash, event_name, target_id, occurred_at, payload)

    log = AuditLog(
        event_name=event_name,
        actor_id=actor_id,
        actor_role=actor_role,
        target_type=target_type,
        target_id=target_id,
        payload=payload,
        prev_hash=prev_hash,
        row_hash=row_hash,
        occurred_at=occurred_at,
    )
    session.add(log)
    await session.flush()
    return AuditLogOut.model_validate(log)


async def find_by_target(session: AsyncSession, target_type: str, target_id: str) -> list[AuditLogOut]:
    result = await session.execute(
        select(AuditLog)
        .where(AuditLog.target_type == target_type, AuditLog.target_id == target_id)
        .order_by(AuditLog.occurred_at.desc())
    )
    return [AuditLogOut.model_validate(row) for row in result.scalars()]
