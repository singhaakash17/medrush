from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from app.modules.geo.models import ServiceArea
from app.modules.geo.schemas import ServiceAreaOut, NearbyPharmacyOut


async def list_active_service_areas(session: AsyncSession, city: str | None = None) -> list[ServiceAreaOut]:
    q = select(ServiceArea).where(ServiceArea.is_active == True)  # noqa: E712
    if city:
        q = q.where(ServiceArea.city == city)
    result = await session.execute(q)
    return [ServiceAreaOut.model_validate(row) for row in result.scalars()]


async def get_service_area(session: AsyncSession, area_id: str) -> ServiceAreaOut | None:
    result = await session.execute(select(ServiceArea).where(ServiceArea.id == area_id))
    row = result.scalar_one_or_none()
    return ServiceAreaOut.model_validate(row) if row else None


async def find_nearby_pharmacies(
    session: AsyncSession,
    lat: float,
    lon: float,
    radius_m: int = 3000,
    medicine_id: str | None = None,
) -> list[NearbyPharmacyOut]:
    """
    Find open pharmacies within radius_m using PostGIS ST_DWithin.
    Optionally filter to those that have a specific medicine in stock.
    """
    if medicine_id:
        sql = text("""
            SELECT
                p.id            AS pharmacy_id,
                p.name,
                p.address_line1,
                p.city,
                p.phone,
                p.is_open_now,
                ROUND(ST_Distance(
                    p.geo_point::geography,
                    ST_MakePoint(:lon, :lat)::geography
                ))::int         AS distance_m,
                ST_Y(p.geo_point::geometry) AS lat,
                ST_X(p.geo_point::geometry) AS lon,
                inv.medicine_id,
                inv.qty_available,
                inv.selling_price_paise,
                inv.mrp_paise
            FROM pharmacy_m.pharmacies p
            JOIN inventory_m.inventory_items inv
                ON inv.pharmacy_id = p.id
                AND inv.medicine_id = :medicine_id
                AND inv.is_listed = TRUE
                AND inv.qty_available > 0
            WHERE p.status = 'active'
              AND p.is_open_now = TRUE
              AND ST_DWithin(
                    p.geo_point::geography,
                    ST_MakePoint(:lon, :lat)::geography,
                    :radius_m
              )
            ORDER BY distance_m
            LIMIT 10
        """)
        result = await session.execute(sql, {"lat": lat, "lon": lon, "radius_m": radius_m, "medicine_id": medicine_id})
    else:
        sql = text("""
            SELECT
                p.id            AS pharmacy_id,
                p.name,
                p.address_line1,
                p.city,
                p.phone,
                p.is_open_now,
                ROUND(ST_Distance(
                    p.geo_point::geography,
                    ST_MakePoint(:lon, :lat)::geography
                ))::int         AS distance_m,
                ST_Y(p.geo_point::geometry) AS lat,
                ST_X(p.geo_point::geometry) AS lon,
                NULL::text      AS medicine_id,
                NULL::int       AS qty_available,
                NULL::bigint    AS selling_price_paise,
                NULL::bigint    AS mrp_paise
            FROM pharmacy_m.pharmacies p
            WHERE p.status = 'active'
              AND p.is_open_now = TRUE
              AND ST_DWithin(
                    p.geo_point::geography,
                    ST_MakePoint(:lon, :lat)::geography,
                    :radius_m
              )
            ORDER BY distance_m
            LIMIT 15
        """)
        result = await session.execute(sql, {"lat": lat, "lon": lon, "radius_m": radius_m})

    rows = result.mappings().all()
    out: list[NearbyPharmacyOut] = []
    for row in rows:
        distance_m = row["distance_m"] or 0
        # Estimate ETA: assume avg speed 20 km/h in city + 2 min packing buffer
        eta_minutes = max(5, round((distance_m / 1000) / 20 * 60) + 3)
        out.append(NearbyPharmacyOut(
            pharmacy_id=row["pharmacy_id"],
            name=row["name"],
            address_line1=row["address_line1"],
            city=row["city"],
            phone=row["phone"],
            is_open_now=row["is_open_now"],
            distance_m=distance_m,
            eta_minutes=eta_minutes,
            lat=row["lat"],
            lon=row["lon"],
            medicine_id=row["medicine_id"],
            qty_available=row["qty_available"],
            selling_price_paise=row["selling_price_paise"],
            mrp_paise=row["mrp_paise"],
        ))
    return out
