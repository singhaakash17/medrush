from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.logistics.repository import get_rider_by_id, get_assignment_by_order, list_assignments_by_rider
from app.modules.logistics.schemas import RiderOut, AssignmentOut
from app.lib.errors import NotFoundError


async def fetch_rider(session: AsyncSession, rider_id: str) -> RiderOut:
    rider = await get_rider_by_id(session, rider_id)
    if not rider:
        raise NotFoundError(f"Rider {rider_id} not found")
    return rider


async def fetch_order_assignment(session: AsyncSession, order_id: str) -> AssignmentOut:
    assignment = await get_assignment_by_order(session, order_id)
    if not assignment:
        raise NotFoundError(f"Assignment for order {order_id} not found")
    return assignment


async def get_rider_assignments(session: AsyncSession, rider_id: str) -> list[AssignmentOut]:
    return await list_assignments_by_rider(session, rider_id)
