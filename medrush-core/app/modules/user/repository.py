from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.modules.user.models import Profile, Address, FamilyMember, RxVaultEntry
from app.modules.user.schemas import ProfileOut, AddressOut, FamilyMemberOut, RxVaultEntryOut


async def get_profile(session: AsyncSession, principal_id: str) -> ProfileOut | None:
    result = await session.execute(select(Profile).where(Profile.principal_id == principal_id))
    row = result.scalar_one_or_none()
    return ProfileOut.model_validate(row) if row else None


async def list_addresses(session: AsyncSession, principal_id: str) -> list[AddressOut]:
    result = await session.execute(
        select(Address).where(Address.principal_id == principal_id).order_by(Address.is_default.desc())
    )
    return [AddressOut.model_validate(row) for row in result.scalars()]


async def list_family_members(session: AsyncSession, principal_id: str) -> list[FamilyMemberOut]:
    result = await session.execute(
        select(FamilyMember).where(FamilyMember.principal_id == principal_id)
    )
    return [FamilyMemberOut.model_validate(row) for row in result.scalars()]


async def list_rx_vault(session: AsyncSession, principal_id: str) -> list[RxVaultEntryOut]:
    result = await session.execute(
        select(RxVaultEntry)
        .where(RxVaultEntry.principal_id == principal_id)
        .order_by(RxVaultEntry.added_at.desc())
    )
    return [RxVaultEntryOut.model_validate(row) for row in result.scalars()]
