from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, text
from app.modules.catalog.models import Medicine, MedicineWarning, Salt, MedicineSalt, SubstituteGroup, SubstituteMember
from app.modules.catalog.schemas import MedicineOut, MedicineWarningOut, SubstituteOut


async def get_medicine(session: AsyncSession, medicine_id: str) -> MedicineOut | None:
    result = await session.execute(
        select(Medicine).where(Medicine.id == medicine_id, Medicine.is_active == True)  # noqa: E712
    )
    row = result.scalar_one_or_none()
    return MedicineOut.model_validate(row) if row else None


async def search_medicines(session: AsyncSession, q: str, limit: int = 30) -> list[MedicineOut]:
    """Search by brand name, generic name, or salt name using full-text-style ilike."""
    # Search across brand_name and generic_name directly
    q_pat = f"%{q}%"
    stmt = (
        select(Medicine)
        .where(
            Medicine.is_active == True,  # noqa: E712
            Medicine.is_discontinued == False,  # noqa: E712
            or_(
                Medicine.brand_name.ilike(q_pat),
                Medicine.generic_name.ilike(q_pat),
            ),
        )
        .order_by(
            # Exact brand match first
            Medicine.brand_name.ilike(q).desc(),
            Medicine.brand_name,
        )
        .limit(limit)
    )
    result = await session.execute(stmt)
    brand_generic = [MedicineOut.model_validate(row) for row in result.scalars()]

    # Also search by salt name
    salt_stmt = (
        select(Medicine)
        .join(MedicineSalt, MedicineSalt.medicine_id == Medicine.id)
        .join(Salt, Salt.id == MedicineSalt.salt_id)
        .where(
            Medicine.is_active == True,  # noqa: E712
            Medicine.is_discontinued == False,  # noqa: E712
            Salt.name.ilike(q_pat),
        )
        .limit(limit)
    )
    salt_result = await session.execute(salt_stmt)
    salt_matches = [MedicineOut.model_validate(row) for row in salt_result.scalars()]

    # Deduplicate preserving order
    seen: set[str] = set()
    combined: list[MedicineOut] = []
    for m in brand_generic + salt_matches:
        if m.id not in seen:
            seen.add(m.id)
            combined.append(m)
    return combined[:limit]


async def list_warnings(session: AsyncSession, medicine_id: str) -> list[MedicineWarningOut]:
    result = await session.execute(
        select(MedicineWarning).where(MedicineWarning.medicine_id == medicine_id)
    )
    return [MedicineWarningOut.model_validate(row) for row in result.scalars()]


async def get_substitutes(session: AsyncSession, medicine_id: str) -> list[SubstituteOut]:
    """Return generic substitutes for a medicine (same salt group), ordered by rank."""
    # Find group(s) this medicine belongs to
    group_stmt = select(SubstituteMember.group_id).where(SubstituteMember.medicine_id == medicine_id)
    group_result = await session.execute(group_stmt)
    group_ids = [r for r in group_result.scalars()]
    if not group_ids:
        return []

    stmt = (
        select(Medicine, SubstituteMember.rank)
        .join(SubstituteMember, SubstituteMember.medicine_id == Medicine.id)
        .where(
            SubstituteMember.group_id.in_(group_ids),
            Medicine.id != medicine_id,
            Medicine.is_active == True,  # noqa: E712
            Medicine.is_discontinued == False,  # noqa: E712
        )
        .order_by(SubstituteMember.rank)
        .limit(5)
    )
    result = await session.execute(stmt)
    out: list[SubstituteOut] = []
    for row in result:
        med, rank = row
        out.append(SubstituteOut(
            id=med.id,
            brand_name=med.brand_name,
            generic_name=med.generic_name,
            form=med.form,
            strength=med.strength,
            mrp_paise=med.mrp_paise,
            rank=rank,
        ))
    return out
