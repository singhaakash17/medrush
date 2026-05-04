from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.deps import get_async_session
from app.modules.catalog.schemas import MedicineOut, MedicineWarningOut
from app.modules.catalog import service

router = APIRouter()


@router.get("/medicines", response_model=list[MedicineOut])
async def search_medicines(
    q: str = Query(..., min_length=1),
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
