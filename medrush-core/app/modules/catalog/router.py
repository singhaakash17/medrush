from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.deps import get_async_session
from app.modules.catalog.schemas import MedicineOut, MedicineWarningOut, SubstituteOut
from app.modules.catalog import service

router = APIRouter()


@router.get("/medicines/featured", response_model=list[MedicineOut])
async def get_featured_medicines(
    session: AsyncSession = Depends(get_async_session),
) -> list[MedicineOut]:
    """Returns up to 10 medicines marked as featured (or top-10 by name as fallback)."""
    return await service.get_featured(session)


@router.get("/medicines", response_model=list[MedicineOut])
async def search_medicines(
    q: str = Query(..., min_length=2, description="Brand name, generic name, or salt"),
    session: AsyncSession = Depends(get_async_session),
) -> list[MedicineOut]:
    return await service.search(session, q)


@router.get("/medicines/{medicine_id}", response_model=MedicineOut)
async def get_medicine(
    medicine_id: str,
    session: AsyncSession = Depends(get_async_session),
) -> MedicineOut:
    return await service.fetch_medicine(session, medicine_id)


@router.get("/medicines/{medicine_id}/warnings", response_model=list[MedicineWarningOut])
async def get_warnings(
    medicine_id: str,
    session: AsyncSession = Depends(get_async_session),
) -> list[MedicineWarningOut]:
    return await service.get_warnings(session, medicine_id)


@router.get("/medicines/{medicine_id}/substitutes", response_model=list[SubstituteOut])
async def get_substitutes(
    medicine_id: str,
    session: AsyncSession = Depends(get_async_session),
) -> list[SubstituteOut]:
    return await service.get_substitutes_for(session, medicine_id)
