from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.audit.repository import find_by_target
from app.modules.audit.schemas import AuditLogOut


async def get_audit_trail(session: AsyncSession, target_type: str, target_id: str) -> list[AuditLogOut]:
    return await find_by_target(session, target_type, target_id)
