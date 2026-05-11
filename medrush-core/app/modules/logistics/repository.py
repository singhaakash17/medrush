from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from geoalchemy2.elements import WKTElement

from app.modules.logistics.models import Rider, RiderShift, Assignment, RiderLocationPing
from app.modules.logistics.schemas import RiderOut, AssignmentOut, RiderShiftOut


async def get_rider_by_id(session: AsyncSession, rider_id: str) -> RiderOut | None:
    result = await session.execute(select(Rider).where(Rider.id == rider_id))
    row = result.scalar_one_or_none()
    return RiderOut.model_validate(row) if row else None


async def get_rider_row(session: AsyncSession, rider_id: str) -> Rider | None:
    result = await session.execute(select(Rider).where(Rider.id == rider_id))
    return result.scalar_one_or_none()


async def update_rider_status(session: AsyncSession, rider_id: str, status: str) -> None:
    now = datetime.now(timezone.utc)
    await session.execute(
        update(Rider).where(Rider.id == rider_id).values(status=status, updated_at=now)
    )
    await session.flush()


async def get_assignment_by_order(session: AsyncSession, order_id: str) -> AssignmentOut | None:
    result = await session.execute(select(Assignment).where(Assignment.order_id == order_id))
    row = result.scalar_one_or_none()
    return AssignmentOut.model_validate(row) if row else None


async def get_assignment_row(session: AsyncSession, assignment_id: str) -> Assignment | None:
    result = await session.execute(select(Assignment).where(Assignment.id == assignment_id))
    return result.scalar_one_or_none()


async def list_assignments_by_rider(session: AsyncSession, rider_id: str) -> list[AssignmentOut]:
    result = await session.execute(
        select(Assignment).where(Assignment.rider_id == rider_id).order_by(Assignment.assigned_at.desc())
    )
    return [AssignmentOut.model_validate(row) for row in result.scalars()]


async def create_assignment(session: AsyncSession, assignment: Assignment) -> Assignment:
    session.add(assignment)
    await session.flush()
    return assignment


async def update_assignment_status(
    session: AsyncSession,
    assignment_id: str,
    status: str,
    timestamp_field: str | None = None,
    failure_reason: str | None = None,
) -> None:
    values: dict = {"status": status}
    if timestamp_field:
        values[timestamp_field] = datetime.now(timezone.utc)
    if failure_reason:
        values["failure_reason"] = failure_reason
    await session.execute(update(Assignment).where(Assignment.id == assignment_id).values(**values))
    await session.flush()


async def record_location_ping(
    session: AsyncSession,
    rider_id: str,
    lat: float,
    lon: float,
    accuracy_m: int | None = None,
    assignment_id: str | None = None,
) -> None:
    ping = RiderLocationPing(
        rider_id=rider_id,
        assignment_id=assignment_id,
        geo_point=WKTElement(f"POINT({lon} {lat})", srid=4326),
        accuracy_m=accuracy_m,
        pinged_at=datetime.now(timezone.utc),
    )
    session.add(ping)
    await session.flush()


async def start_shift(session: AsyncSession, shift: RiderShift) -> RiderShift:
    session.add(shift)
    await session.flush()
    return shift


async def end_shift(session: AsyncSession, rider_id: str) -> None:
    now = datetime.now(timezone.utc)
    result = await session.execute(
        select(RiderShift)
        .where(RiderShift.rider_id == rider_id, RiderShift.ended_at.is_(None))
        .order_by(RiderShift.started_at.desc())
        .limit(1)
    )
    shift = result.scalar_one_or_none()
    if shift:
        await session.execute(
            update(RiderShift).where(RiderShift.id == shift.id).values(ended_at=now)
        )
        await session.flush()


async def get_active_shift(session: AsyncSession, rider_id: str) -> RiderShiftOut | None:
    result = await session.execute(
        select(RiderShift)
        .where(RiderShift.rider_id == rider_id, RiderShift.ended_at.is_(None))
        .order_by(RiderShift.started_at.desc())
        .limit(1)
    )
    row = result.scalar_one_or_none()
    return RiderShiftOut.model_validate(row) if row else None
