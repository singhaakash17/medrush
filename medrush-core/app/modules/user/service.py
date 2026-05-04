from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.user.repository import get_profile, list_addresses, list_family_members, list_rx_vault
from app.modules.user.schemas import ProfileOut, AddressOut, FamilyMemberOut, RxVaultEntryOut
from app.lib.errors import NotFoundError


async def fetch_profile(session: AsyncSession, principal_id: str) -> ProfileOut:
    profile = await get_profile(session, principal_id)
    if not profile:
        raise NotFoundError(f"Profile for {principal_id} not found")
    return profile


async def get_addresses(session: AsyncSession, principal_id: str) -> list[AddressOut]:
    return await list_addresses(session, principal_id)


async def get_family(session: AsyncSession, principal_id: str) -> list[FamilyMemberOut]:
    return await list_family_members(session, principal_id)


async def get_rx_vault(session: AsyncSession, principal_id: str) -> list[RxVaultEntryOut]:
    return await list_rx_vault(session, principal_id)
