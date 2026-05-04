from fastapi import APIRouter, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.deps import get_async_session
from app.modules.pharmacy.schemas import PharmacyOut, PharmacistOut
from app.modules.pharmacy import service

router = APIRouter()


@router.get("/", response_model=list[PharmacyOut])
async def list_my_pharmacies(
    x_user_id: str = Header(..., alias="x-user-id"),
    session: AsyncSession = Depends(get_async_session),
) -> list[PharmacyOut]:
    return await service.get_owner_pharmacies(session, x_user_id)


@router.get("/{pharmacy_id}", response_model=PharmacyOut)
async def get_pharmacy(
    pharmacy_id: str,
    session: AsyncSession = Depends(get_async_session),
) -> PharmacyOut:
    return await service.fetch_pharmacy(session, pharmacy_id)


@router.get("/{pharmacy_id}/pharmacists", response_model=list[PharmacistOut])
async def list_pharmacists(
    pharmacy_id: str,
    session: AsyncSession = Depends(get_async_session),
) -> list[PharmacistOut]:
    return await service.get_pharmacists(session, pharmacy_id)
