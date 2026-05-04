from fastapi import APIRouter, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.deps import get_async_session
from app.modules.identity.schemas import PrincipalOut, RoleAssignmentOut
from app.modules.identity import service

router = APIRouter()


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
