from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.modules.identity.models import Principal, RoleAssignment
from app.modules.identity.schemas import PrincipalOut, RoleAssignmentOut


async def get_principal_by_id(session: AsyncSession, principal_id: str) -> PrincipalOut | None:
    result = await session.execute(select(Principal).where(Principal.id == principal_id))
    row = result.scalar_one_or_none()
    return PrincipalOut.model_validate(row) if row else None


async def get_principal_by_phone(session: AsyncSession, phone_e164: str) -> PrincipalOut | None:
    result = await session.execute(select(Principal).where(Principal.phone_e164 == phone_e164))
    row = result.scalar_one_or_none()
    return PrincipalOut.model_validate(row) if row else None


async def create_principal(session: AsyncSession, principal_id: str, phone_e164: str) -> PrincipalOut:
    now = datetime.now(timezone.utc)
    row = Principal(
        id=principal_id,
        phone_e164=phone_e164,
        email=None,
        is_verified=True,
        is_active=True,
        created_at=now,
        updated_at=now,
    )
    session.add(row)
    return PrincipalOut.model_validate(row)


async def create_role_assignment(session: AsyncSession, principal_id: str, role: str) -> None:
    now = datetime.now(timezone.utc)
    row = RoleAssignment(
        id=f"ra_{principal_id}",
        principal_id=principal_id,
        role=role,
        resource_type=None,
        resource_id=None,
        granted_by=None,
        created_at=now,
    )
    session.add(row)


async def list_roles(session: AsyncSession, principal_id: str) -> list[RoleAssignmentOut]:
    result = await session.execute(
        select(RoleAssignment).where(RoleAssignment.principal_id == principal_id)
    )
    return [RoleAssignmentOut.model_validate(row) for row in result.scalars()]
