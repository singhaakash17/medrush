from fastapi import APIRouter, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.deps import get_async_session
from app.modules.logistics.schemas import (
    RiderOut, AssignmentOut, AssignRiderIn, LocationPingIn,
    RiderStatusIn, RiderShiftOut, VerifyOtpIn,
)
from app.modules.logistics import service

router = APIRouter()


# ─── Rider ────────────────────────────────────────────────────────────────────

@router.get("/riders/{rider_id}", response_model=RiderOut)
async def get_rider(
    rider_id: str,
    session: AsyncSession = Depends(get_async_session),
) -> RiderOut:
    return await service.fetch_rider(session, rider_id)


@router.patch("/riders/{rider_id}/status", response_model=RiderOut)
async def set_rider_status(
    rider_id: str,
    payload: RiderStatusIn,
    session: AsyncSession = Depends(get_async_session),
) -> RiderOut:
    return await service.set_rider_status(session, rider_id, payload)


# ─── Shift ────────────────────────────────────────────────────────────────────

@router.post("/riders/{rider_id}/shift/start", response_model=RiderShiftOut, status_code=201)
async def start_shift(
    rider_id: str,
    session: AsyncSession = Depends(get_async_session),
) -> RiderShiftOut:
    return await service.start_rider_shift(session, rider_id)


@router.post("/riders/{rider_id}/shift/end", status_code=204)
async def end_shift(
    rider_id: str,
    session: AsyncSession = Depends(get_async_session),
) -> None:
    await service.end_rider_shift(session, rider_id)


# ─── GPS ──────────────────────────────────────────────────────────────────────

@router.post("/riders/{rider_id}/location", status_code=204)
async def ping_location(
    rider_id: str,
    payload: LocationPingIn,
    session: AsyncSession = Depends(get_async_session),
) -> None:
    await service.ping_location(session, rider_id, payload)


# ─── Assignment ───────────────────────────────────────────────────────────────

@router.post("/orders/{order_id}/assign", response_model=AssignmentOut, status_code=201)
async def assign_rider(
    order_id: str,
    payload: AssignRiderIn,
    x_user_id: str = Header(..., alias="x-user-id"),
    session: AsyncSession = Depends(get_async_session),
) -> AssignmentOut:
    return await service.assign_rider(session, order_id, payload, x_user_id)


@router.get("/orders/{order_id}/assignment", response_model=AssignmentOut)
async def get_order_assignment(
    order_id: str,
    session: AsyncSession = Depends(get_async_session),
) -> AssignmentOut:
    return await service.fetch_order_assignment(session, order_id)


@router.post("/assignments/{assignment_id}/pickup", response_model=AssignmentOut)
async def pickup_order(
    assignment_id: str,
    x_user_id: str = Header(..., alias="x-user-id"),
    session: AsyncSession = Depends(get_async_session),
) -> AssignmentOut:
    return await service.pickup_order(session, assignment_id, x_user_id)


@router.post("/assignments/{assignment_id}/verify-otp", response_model=AssignmentOut)
async def verify_otp(
    assignment_id: str,
    payload: VerifyOtpIn,
    x_user_id: str = Header(..., alias="x-user-id"),
    session: AsyncSession = Depends(get_async_session),
) -> AssignmentOut:
    return await service.verify_delivery_otp(session, assignment_id, x_user_id, payload.otp)


@router.get("/riders/{rider_id}/assignments", response_model=list[AssignmentOut])
async def list_rider_assignments(
    rider_id: str,
    session: AsyncSession = Depends(get_async_session),
) -> list[AssignmentOut]:
    return await service.get_rider_assignments(session, rider_id)
