"""
Logistics service: rider management, assignment, OTP delivery verification, GPS.

OTP delivery flow:
  1. When order is dispatched, we generate a 4-digit OTP and store it in Redis (TTL 30 min).
  2. Rider app shows OTP prompt to customer.
  3. Customer tells rider the OTP.
  4. Rider calls POST /logistics/assignments/{id}/verify-otp.
  5. On success, assignment and order status move to delivered.
"""
import uuid
import random
from datetime import datetime, timezone
from geoalchemy2.elements import WKTElement

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.logistics.repository import (
    get_rider_by_id, get_assignment_by_order, list_assignments_by_rider,
    create_assignment, update_assignment_status, update_rider_status,
    record_location_ping, start_shift, end_shift, get_active_shift, get_assignment_row,
)
from app.modules.logistics.models import Assignment, RiderShift
from app.modules.logistics.schemas import (
    RiderOut, AssignmentOut, AssignRiderIn, LocationPingIn,
    RiderStatusIn, RiderShiftOut,
)
from app.cache.redis import get_redis
from app.kafka.events import publish_event
from app.modules.ws.manager import manager
from app.lib.errors import NotFoundError, AppValidationError


async def fetch_rider(session: AsyncSession, rider_id: str) -> RiderOut:
    rider = await get_rider_by_id(session, rider_id)
    if not rider:
        raise NotFoundError(f"Rider {rider_id} not found")
    return rider


async def set_rider_status(
    session: AsyncSession, rider_id: str, payload: RiderStatusIn
) -> RiderOut:
    await update_rider_status(session, rider_id, payload.status)
    await session.commit()
    return await fetch_rider(session, rider_id)


async def assign_rider(
    session: AsyncSession,
    order_id: str,
    payload: AssignRiderIn,
    dispatcher_id: str,
) -> AssignmentOut:
    now = datetime.now(timezone.utc)
    assignment_id = str(uuid.uuid4())

    assignment = Assignment(
        id=assignment_id,
        order_id=order_id,
        rider_id=payload.rider_id,
        status="assigned",
        pickup_geo=WKTElement(f"POINT({payload.pickup_lon} {payload.pickup_lat})", srid=4326),
        drop_geo=WKTElement(f"POINT({payload.drop_lon} {payload.drop_lat})", srid=4326),
        distance_m=payload.distance_m,
        eta_seconds=payload.eta_seconds,
        assigned_at=now,
    )
    await create_assignment(session, assignment)
    await update_rider_status(session, payload.rider_id, "on_delivery")

    # Generate and cache delivery OTP
    otp = str(random.randint(1000, 9999))
    redis = await get_redis()
    await redis.setex(f"otp:delivery:{order_id}", 1800, otp)

    await session.commit()

    # Notify rider
    await manager.send_to_room(
        f"rider:{payload.rider_id}",
        "new_assignment",
        {
            "assignment_id": assignment_id,
            "order_id": order_id,
            "pickup_lat": payload.pickup_lat,
            "pickup_lon": payload.pickup_lon,
            "drop_lat": payload.drop_lat,
            "drop_lon": payload.drop_lon,
            "distance_m": payload.distance_m,
            "eta_seconds": payload.eta_seconds,
        },
    )

    # Notify customer of rider assignment
    await manager.send_to_room(
        f"order:{order_id}",
        "rider_assigned",
        {
            "rider_id": payload.rider_id,
            "assignment_id": assignment_id,
            "eta_seconds": payload.eta_seconds,
        },
    )

    await publish_event("logistics.rider_assigned", {
        "order_id": order_id,
        "rider_id": payload.rider_id,
        "assignment_id": assignment_id,
    })

    return await fetch_order_assignment(session, order_id)


async def pickup_order(
    session: AsyncSession, assignment_id: str, rider_id: str
) -> AssignmentOut:
    assignment = await get_assignment_row(session, assignment_id)
    if not assignment or assignment.rider_id != rider_id:
        raise NotFoundError("Assignment not found")
    if assignment.status != "assigned":
        raise AppValidationError("Assignment is not in 'assigned' state")

    await update_assignment_status(session, assignment_id, "en_route", "picked_up_at")
    await session.commit()

    await manager.send_to_room(f"order:{assignment.order_id}", "rider_pickup", {
        "assignment_id": assignment_id,
        "picked_up_at": datetime.now(timezone.utc).isoformat(),
    })
    return await fetch_assignment(session, assignment_id)


async def verify_delivery_otp(
    session: AsyncSession, assignment_id: str, rider_id: str, otp: str
) -> AssignmentOut:
    assignment = await get_assignment_row(session, assignment_id)
    if not assignment or assignment.rider_id != rider_id:
        raise NotFoundError("Assignment not found")

    redis = await get_redis()
    cached_otp = await redis.get(f"otp:delivery:{assignment.order_id}")
    if not cached_otp or cached_otp.decode() != otp:
        raise AppValidationError("Invalid OTP")

    await redis.delete(f"otp:delivery:{assignment.order_id}")
    await update_assignment_status(session, assignment_id, "delivered", "delivered_at")
    await update_rider_status(session, rider_id, "online")
    await session.commit()

    # Trigger order status to delivered
    await manager.send_to_room(f"order:{assignment.order_id}", "status_update", {
        "order_id": assignment.order_id,
        "status": "delivered",
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })

    await publish_event("logistics.delivered", {
        "order_id": assignment.order_id,
        "assignment_id": assignment_id,
        "rider_id": rider_id,
    })

    return await fetch_assignment(session, assignment_id)


async def ping_location(
    session: AsyncSession, rider_id: str, payload: LocationPingIn
) -> None:
    await record_location_ping(
        session, rider_id, payload.lat, payload.lon,
        payload.accuracy_m, payload.assignment_id,
    )
    await session.commit()

    # Broadcast to order room if assignment exists
    if payload.assignment_id:
        assignment = await get_assignment_row(session, payload.assignment_id)
        if assignment:
            await manager.send_to_room(f"order:{assignment.order_id}", "rider_location", {
                "lat": payload.lat,
                "lon": payload.lon,
                "rider_id": rider_id,
            })


async def start_rider_shift(session: AsyncSession, rider_id: str) -> RiderShiftOut:
    now = datetime.now(timezone.utc)
    shift = RiderShift(
        id=str(uuid.uuid4()),
        rider_id=rider_id,
        started_at=now,
        orders_completed=0,
        earnings_paise=0,
    )
    await start_shift(session, shift)
    await update_rider_status(session, rider_id, "online")
    await session.commit()
    return await get_active_shift(session, rider_id)


async def end_rider_shift(session: AsyncSession, rider_id: str) -> None:
    await end_shift(session, rider_id)
    await update_rider_status(session, rider_id, "offline")
    await session.commit()


async def fetch_order_assignment(session: AsyncSession, order_id: str) -> AssignmentOut:
    assignment = await get_assignment_by_order(session, order_id)
    if not assignment:
        raise NotFoundError(f"Assignment for order {order_id} not found")
    return assignment


async def fetch_assignment(session: AsyncSession, assignment_id: str) -> AssignmentOut:
    from app.modules.logistics.schemas import AssignmentOut
    assignment = await get_assignment_row(session, assignment_id)
    if not assignment:
        raise NotFoundError(f"Assignment {assignment_id} not found")
    return AssignmentOut.model_validate(assignment)


async def get_rider_assignments(session: AsyncSession, rider_id: str) -> list[AssignmentOut]:
    return await list_assignments_by_rider(session, rider_id)
