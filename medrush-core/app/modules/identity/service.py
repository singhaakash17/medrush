from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.identity.repository import get_principal_by_id, list_roles
from app.modules.identity.schemas import PrincipalOut, RoleAssignmentOut
from app.lib.errors import NotFoundError


async def fetch_principal(session: AsyncSession, principal_id: str) -> PrincipalOut:
    principal = await get_principal_by_id(session, principal_id)
    if not principal:
        raise NotFoundError(f"Principal {principal_id} not found")
    return principal


async def get_principal_roles(session: AsyncSession, principal_id: str) -> list[RoleAssignmentOut]:
    return await list_roles(session, principal_id)
