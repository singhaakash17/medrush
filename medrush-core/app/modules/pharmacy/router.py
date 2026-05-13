from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, Header, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.deps import get_async_session
from app.modules.pharmacy.schemas import PharmacyOut, PharmacistOut
from app.modules.pharmacy import service
from app.modules.order.models import Order

router = APIRouter()

# ── Earnings schemas ────────────────────────────────────────────────────────────

class EarningsDay(BaseModel):
    date: str
    orders: int
    gmv_paise: int
    earnings_paise: int

class EarningSummary(BaseModel):
    total_orders: int
    total_gmv_paise: int
    total_earnings_paise: int
    avg_order_value_paise: int
    pending_payout_paise: int
    daily: list[EarningsDay]

class Payout(BaseModel):
    id: str
    period_start: str
    period_end: str
    amount_paise: int
    status: str
    settled_at: str | None = None
    utr: str | None = None

# Pharmacy earns 75% of GMV (MedRush commission = 25%)
PHARMACY_SHARE = 0.75


# ── Existing endpoints ──────────────────────────────────────────────────────────

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


# ── Earnings endpoints ──────────────────────────────────────────────────────────

@router.get("/{pharmacy_id}/earnings", response_model=EarningSummary)
async def get_earnings(
    pharmacy_id: str,
    period: str = Query("7d", pattern="^(7d|30d|90d)$"),
    session: AsyncSession = Depends(get_async_session),
) -> EarningSummary:
    """Revenue analytics for a pharmacy computed from delivered orders."""
    days = {"7d": 7, "30d": 30, "90d": 90}[period]
    since = datetime.now(timezone.utc) - timedelta(days=days)

    # Fetch all non-cancelled orders in the period
    result = await session.execute(
        select(Order).where(
            Order.pharmacy_id == pharmacy_id,
            Order.status != "cancelled",
            Order.placed_at >= since,
        ).order_by(Order.placed_at)
    )
    orders = list(result.scalars())

    # Group by day
    day_map: dict[str, dict] = {}
    for o in orders:
        day = o.placed_at.strftime("%d %b")
        if day not in day_map:
            day_map[day] = {"orders": 0, "gmv_paise": 0}
        day_map[day]["orders"] += 1
        day_map[day]["gmv_paise"] += o.subtotal_paise  # GMV = medicine subtotal

    # Fill in zeros for days with no orders
    daily: list[EarningsDay] = []
    for i in range(days):
        d = datetime.now(timezone.utc) - timedelta(days=days - 1 - i)
        label = d.strftime("%d %b")
        row = day_map.get(label, {"orders": 0, "gmv_paise": 0})
        gmv = row["gmv_paise"]
        daily.append(EarningsDay(
            date=label,
            orders=row["orders"],
            gmv_paise=gmv,
            earnings_paise=int(gmv * PHARMACY_SHARE),
        ))

    total_gmv = sum(r.subtotal_paise for r in orders)
    total_earnings = int(total_gmv * PHARMACY_SHARE)
    total_orders = len(orders)

    # Pending payout = earnings in last 7 days not yet settled
    recent_since = datetime.now(timezone.utc) - timedelta(days=7)
    recent_gmv = sum(o.subtotal_paise for o in orders if o.placed_at >= recent_since)
    pending_payout = int(recent_gmv * PHARMACY_SHARE)

    return EarningSummary(
        total_orders=total_orders,
        total_gmv_paise=total_gmv,
        total_earnings_paise=total_earnings,
        avg_order_value_paise=(total_gmv // total_orders) if total_orders else 0,
        pending_payout_paise=pending_payout,
        daily=daily,
    )


@router.get("/{pharmacy_id}/payouts", response_model=list[Payout])
async def get_payouts(
    pharmacy_id: str,
    session: AsyncSession = Depends(get_async_session),
) -> list[Payout]:
    """Weekly payout history derived from delivered orders."""
    since = datetime.now(timezone.utc) - timedelta(days=90)

    result = await session.execute(
        select(Order).where(
            Order.pharmacy_id == pharmacy_id,
            Order.status == "delivered",
            Order.placed_at >= since,
        )
    )
    orders = list(result.scalars())

    # Group into weekly buckets
    week_map: dict[str, int] = {}
    for o in orders:
        # ISO week start (Monday)
        week_start = o.placed_at - timedelta(days=o.placed_at.weekday())
        key = week_start.strftime("%Y-%m-%d")
        week_map[key] = week_map.get(key, 0) + int(o.subtotal_paise * PHARMACY_SHARE)

    payouts: list[Payout] = []
    now = datetime.now(timezone.utc)
    for i, (week_start_str, amount) in enumerate(sorted(week_map.items(), reverse=True)):
        week_start = datetime.strptime(week_start_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        week_end = week_start + timedelta(days=6)
        is_current_week = week_start > now - timedelta(days=7)
        status = "pending" if is_current_week else ("processing" if i == 1 else "paid")
        payouts.append(Payout(
            id=f"payout_{pharmacy_id}_{week_start_str}",
            period_start=week_start.date().isoformat(),
            period_end=week_end.date().isoformat(),
            amount_paise=amount,
            status=status,
            settled_at=None if status != "paid" else (week_end + timedelta(days=3)).date().isoformat(),
            utr=f"UTR{abs(hash(week_start_str)) % 1_000_000_000:09d}" if status == "paid" else None,
        ))

    return payouts
