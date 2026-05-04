from fastapi import APIRouter, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.deps import get_async_session
from app.modules.user.schemas import ProfileOut, AddressOut, FamilyMemberOut, RxVaultEntryOut
from app.modules.user import service

router = APIRouter()


@router.get("/me", response_model=ProfileOut)
async def get_profile(
    x_user_id: str = Header(..., alias="x-user-id"),
    session: AsyncSession = Depends(get_async_session),
) -> ProfileOut:
    return await service.fetch_profile(session, x_user_id)


@router.get("/me/addresses", response_model=list[AddressOut])
async def list_addresses(
    x_user_id: str = Header(..., alias="x-user-id"),
    session: AsyncSession = Depends(get_async_session),
) -> list[AddressOut]:
    return await service.get_addresses(session, x_user_id)


@router.get("/me/family", response_model=list[FamilyMemberOut])
async def list_family(
    x_user_id: str = Header(..., alias="x-user-id"),
    session: AsyncSession = Depends(get_async_session),
) -> list[FamilyMemberOut]:
    return await service.get_family(session, x_user_id)


@router.get("/me/rx-vault", response_model=list[RxVaultEntryOut])
async def list_rx_vault(
    x_user_id: str = Header(..., alias="x-user-id"),
    session: AsyncSession = Depends(get_async_session),
) -> list[RxVaultEntryOut]:
    return await service.get_rx_vault(session, x_user_id)
