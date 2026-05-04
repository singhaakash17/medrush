from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.deps import get_async_session
from app.modules.logistics.schemas import RiderOut, AssignmentOut
from app.modules.logistics import service

router = APIRouter()


@router.get("/riders/{rider_id}", response_model=RiderOut)
async def get_rider(
    rider_id: str,
    session: AsyncSession = Depends(get_async_session),
) -> RiderOut:
    return await service.fetch_rider(session, rider_id)


@router.get("/orders/{order_id}/assignment", response_model=AssignmentOut)
async def get_order_assignment(
    order_id: str,
    session: AsyncSession = Depends(get_async_session),
) -> AssignmentOut:
    return await service.fetch_order_assignment(session, order_id)


@router.get("/riders/{rider_id}/assignments", response_model=list[AssignmentOut])
async def list_rider_assignments(
    rider_id: str,
    session: AsyncSession = Depends(get_async_session),
) -> list[AssignmentOut]:
    return await service.get_rider_assignments(session, rider_id)
