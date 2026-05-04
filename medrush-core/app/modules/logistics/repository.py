from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.modules.logistics.models import Rider, Assignment
from app.modules.logistics.schemas import RiderOut, AssignmentOut


async def get_rider_by_id(session: AsyncSession, rider_id: str) -> RiderOut | None:
    result = await session.execute(select(Rider).where(Rider.id == rider_id))
    row = result.scalar_one_or_none()
    return RiderOut.model_validate(row) if row else None


async def get_assignment_by_order(session: AsyncSession, order_id: str) -> AssignmentOut | None:
    result = await session.execute(select(Assignment).where(Assignment.order_id == order_id))
    row = result.scalar_one_or_none()
    return AssignmentOut.model_validate(row) if row else None


async def list_assignments_by_rider(session: AsyncSession, rider_id: str) -> list[AssignmentOut]:
    result = await session.execute(
        select(Assignment).where(Assignment.rider_id == rider_id).order_by(Assignment.assigned_at.desc())
    )
    return [AssignmentOut.model_validate(row) for row in result.scalars()]
