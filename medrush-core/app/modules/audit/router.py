from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.deps import get_async_session
from app.modules.audit.schemas import AuditLogOut
from app.modules.audit import service

router = APIRouter()


@router.get("/", response_model=list[AuditLogOut])
async def get_audit_trail(
    target_type: str = Query(...),
    target_id: str = Query(...),
    session: AsyncSession = Depends(get_async_session),
) -> list[AuditLogOut]:
    return await service.get_audit_trail(session, target_type, target_id)
