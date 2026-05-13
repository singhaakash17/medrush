from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.modules.user.models import Profile, Address, FamilyMember, RxVaultEntry
from app.modules.identity.models import Principal
from app.modules.order.models import Order
from app.modules.user.schemas import ProfileOut, AddressOut, FamilyMemberOut, RxVaultEntryOut


async def get_profile(session: AsyncSession, principal_id: str) -> ProfileOut | None:
    # 1. Fetch basic profile joined with principal for phone
    stmt = (
        select(Profile, Principal.phone_e164)
        .outerjoin(Principal, Principal.id == Profile.principal_id)
        .where(Profile.principal_id == principal_id)
    )
    result = await session.execute(stmt)
    row = result.first()
    if not row:
        return None

    profile_obj, phone = row

    # 2. Count orders
    order_stmt = select(func.count(Order.id)).where(Order.principal_id == principal_id)
    order_count = (await session.execute(order_stmt)).scalar() or 0

    # 3. Count rx entries
    rx_stmt = select(func.count(RxVaultEntry.id)).where(RxVaultEntry.principal_id == principal_id)
    rx_count = (await session.execute(rx_stmt)).scalar() or 0

    # 4. Get default address city as city
    addr_stmt = select(Address.city).where(Address.principal_id == principal_id, Address.is_default == True).limit(1)
    city = (await session.execute(addr_stmt)).scalar()

    # Map to schema
    out = ProfileOut.model_validate(profile_obj)
    out.phone = phone
    out.city = city
    out.order_count = order_count
    out.rx_count = rx_count
    return out


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
