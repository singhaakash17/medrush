"""
MedRush seed script — Bengaluru demo data.

Run:
    cd /Users/aakashsudhirkumarsingh/medrush/medrush-main/medrush-core
    source .venv/bin/activate
    python scripts/seed.py
"""

import asyncio
import random
import sys
import os
from datetime import date, datetime, timezone

# ---------------------------------------------------------------------------
# Make sure the project root is importable so we can reuse app models.
# ---------------------------------------------------------------------------
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

# ---- Async engine (asyncpg) ------------------------------------------------
DATABASE_URL = "postgresql+asyncpg://medrush:medrush_dev@localhost:5433/medrush_core"

engine = create_async_engine(DATABASE_URL, pool_pre_ping=True)
AsyncSessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

# ---- Import all models so metadata is populated ----------------------------
from app.db.base_model import Base  # noqa: E402

import app.modules.identity.models  # noqa: F401
import app.modules.user.models  # noqa: F401
import app.modules.catalog.models  # noqa: F401
import app.modules.pharmacy.models  # noqa: F401
import app.modules.geo.models  # noqa: F401
import app.modules.inventory.models  # noqa: F401
import app.modules.logistics.models  # noqa: F401
import app.modules.order.models  # noqa: F401
import app.modules.cart.models  # noqa: F401
import app.modules.payment.models  # noqa: F401
import app.modules.rx.models  # noqa: F401
import app.modules.audit.models  # noqa: F401
import app.modules.notification.models  # noqa: F401

NOW = datetime.now(timezone.utc)
rng = random.Random(42)  # deterministic


# ===========================================================================
# Helpers
# ===========================================================================

async def exec(session: AsyncSession, sql: str, params: dict) -> None:
    await session.execute(text(sql), params)


# ===========================================================================
# Main seed routine
# ===========================================================================

async def run() -> None:
    async with engine.begin() as conn:
        # -------------------------------------------------------------------
        # 1. Schemas
        # -------------------------------------------------------------------
        print("Creating schemas…")
        schemas = [
            "identity_m", "user_m", "catalog_m", "pharmacy_m",
            "geo_m", "inventory_m", "logistics_m", "order_m",
            "cart_m", "payment_m", "rx_m", "audit_m",
            "notification_m",
        ]
        for s in schemas:
            await conn.execute(text(f"CREATE SCHEMA IF NOT EXISTS {s}"))
        print("  Schemas OK")

    # -------------------------------------------------------------------
    # 2. Tables
    # -------------------------------------------------------------------
    print("Creating tables via metadata.create_all()…")

    # Two tables have DDL that SQLAlchemy emits incorrectly for asyncpg:
    #   - user_m.family_members:  GENERATED ALWAYS AS (CURRENT_DATE ...) — CURRENT_DATE
    #     is not immutable so PostgreSQL rejects it as a stored generated column.
    #   - audit_m.audit_log: server_default="gen_random_uuid()" is rendered as a
    #     string literal instead of a function call by asyncpg dialect.
    # We skip these two from create_all and create them manually below.
    SKIP_TABLES = {"user_m.family_members", "audit_m.audit_log"}

    def create_all_except(conn_sync):
        tables_to_create = [
            t for key, t in Base.metadata.tables.items()
            if key not in SKIP_TABLES
        ]
        Base.metadata.create_all(bind=conn_sync, tables=tables_to_create)

    async with engine.begin() as conn:
        await conn.run_sync(create_all_except)

    # Create skipped tables manually with corrected DDL
    async with engine.begin() as conn:
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS user_m.family_members (
                id TEXT NOT NULL PRIMARY KEY,
                principal_id TEXT NOT NULL,
                full_name TEXT NOT NULL,
                relationship TEXT NOT NULL,
                date_of_birth DATE,
                gender TEXT,
                is_minor BOOLEAN,
                allergies TEXT[],
                created_at TIMESTAMP WITH TIME ZONE NOT NULL
            )
        """))
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS audit_m.audit_log (
                id UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
                event_name TEXT NOT NULL,
                actor_id TEXT,
                actor_role TEXT,
                actor_ip INET,
                target_type TEXT NOT NULL,
                target_id TEXT NOT NULL,
                payload JSONB NOT NULL,
                prev_hash TEXT,
                row_hash TEXT NOT NULL,
                occurred_at TIMESTAMP WITH TIME ZONE NOT NULL
            )
        """))
    print("  Tables OK")

    # -------------------------------------------------------------------
    # 3. Principals
    # -------------------------------------------------------------------
    print("Seeding principals…")
    principals = []

    # customer
    principals.append({
        "id": "cust_test_01",
        "phone_e164": "+919876543210",
        "email": "test@medrush.in",
        "is_verified": True,
        "is_active": True,
        "created_at": NOW,
        "updated_at": NOW,
    })

    # rider
    principals.append({
        "id": "rider_test_01",
        "phone_e164": "+919876543211",
        "email": None,
        "is_verified": True,
        "is_active": True,
        "created_at": NOW,
        "updated_at": NOW,
    })

    # 25 pharmacy owners
    for i in range(1, 26):
        # unique phone: +91 98765 43212 + (i-1)
        phone_num = 9876543212 + (i - 1)
        principals.append({
            "id": f"owner_ph_{i:02d}",
            "phone_e164": f"+91{phone_num}",
            "email": None,
            "is_verified": True,
            "is_active": True,
            "created_at": NOW,
            "updated_at": NOW,
        })

    async with AsyncSessionLocal() as session:
        for p in principals:
            await session.execute(
                text(
                    "INSERT INTO identity_m.principals "
                    "(id, phone_e164, email, is_verified, is_active, created_at, updated_at) "
                    "VALUES (:id, :phone_e164, :email, :is_verified, :is_active, :created_at, :updated_at) "
                    "ON CONFLICT (id) DO NOTHING"
                ),
                p,
            )
        await session.commit()
    print(f"  {len(principals)} principals OK")

    # -------------------------------------------------------------------
    # 4. Role assignments
    # -------------------------------------------------------------------
    print("Seeding role assignments…")

    # pharmacy id list (used to map owners → pharmacies)
    all_ph_ids = (
        [f"ph_ind_{i:02d}" for i in range(1, 9)]
        + [f"ph_kor_{i:02d}" for i in range(1, 10)]
        + [f"ph_hsr_{i:02d}" for i in range(1, 9)]
    )

    role_rows = [
        {
            "id": "ra_cust_test_01",
            "principal_id": "cust_test_01",
            "role": "customer",
            "resource_type": None,
            "resource_id": None,
            "granted_by": None,
            "created_at": NOW,
        },
        {
            "id": "ra_rider_test_01",
            "principal_id": "rider_test_01",
            "role": "rider",
            "resource_type": None,
            "resource_id": None,
            "granted_by": None,
            "created_at": NOW,
        },
    ]
    for idx, ph_id in enumerate(all_ph_ids, start=1):
        owner_id = f"owner_ph_{idx:02d}"
        role_rows.append({
            "id": f"ra_{owner_id}",
            "principal_id": owner_id,
            "role": "pharmacy_owner",
            "resource_type": "pharmacy",
            "resource_id": ph_id,
            "granted_by": None,
            "created_at": NOW,
        })

    async with AsyncSessionLocal() as session:
        for r in role_rows:
            await session.execute(
                text(
                    "INSERT INTO identity_m.role_assignments "
                    "(id, principal_id, role, resource_type, resource_id, granted_by, created_at) "
                    "VALUES (:id, :principal_id, :role, :resource_type, :resource_id, :granted_by, :created_at) "
                    "ON CONFLICT (id) DO NOTHING"
                ),
                r,
            )
        await session.commit()
    print(f"  {len(role_rows)} role assignments OK")

    # -------------------------------------------------------------------
    # 5. Profiles
    # -------------------------------------------------------------------
    print("Seeding user profiles…")
    profiles = [
        {
            "principal_id": "cust_test_01",
            "full_name": "Rahul Sharma",
            "date_of_birth": date(1992, 6, 15),
            "gender": "male",
            "preferred_language": "en",
            "created_at": NOW,
            "updated_at": NOW,
        },
        {
            "principal_id": "rider_test_01",
            "full_name": "Kiran Kumar",
            "date_of_birth": date(1995, 3, 22),
            "gender": "male",
            "preferred_language": "kn",
            "created_at": NOW,
            "updated_at": NOW,
        },
    ]
    async with AsyncSessionLocal() as session:
        for p in profiles:
            await session.execute(
                text(
                    "INSERT INTO user_m.profiles "
                    "(principal_id, full_name, date_of_birth, gender, preferred_language, created_at, updated_at) "
                    "VALUES (:principal_id, :full_name, :date_of_birth, :gender, :preferred_language, :created_at, :updated_at) "
                    "ON CONFLICT (principal_id) DO NOTHING"
                ),
                p,
            )
        await session.commit()
    print("  Profiles OK")

    # -------------------------------------------------------------------
    # 6. Addresses
    # -------------------------------------------------------------------
    print("Seeding addresses…")
    addresses = [
        {
            "id": "addr_cust_01_home",
            "principal_id": "cust_test_01",
            "label": "Home",
            "line1": "42, 12th Main Road",
            "line2": "Indiranagar 1st Stage",
            "city": "Bengaluru",
            "state": "Karnataka",
            "pincode": "560038",
            "is_default": True,
            "created_at": NOW,
        },
        {
            "id": "addr_cust_01_work",
            "principal_id": "cust_test_01",
            "label": "Work",
            "line1": "Embassy Tech Village, Outer Ring Road",
            "line2": "Koramangala",
            "city": "Bengaluru",
            "state": "Karnataka",
            "pincode": "560095",
            "is_default": False,
            "created_at": NOW,
        },
        {
            "id": "addr_cust_01_gym",
            "principal_id": "cust_test_01",
            "label": "Gym",
            "line1": "27th Main Road, Sector 1",
            "line2": "HSR Layout",
            "city": "Bengaluru",
            "state": "Karnataka",
            "pincode": "560102",
            "is_default": False,
            "created_at": NOW,
        },
    ]
    async with AsyncSessionLocal() as session:
        for a in addresses:
            await session.execute(
                text(
                    "INSERT INTO user_m.addresses "
                    "(id, principal_id, label, line1, line2, city, state, pincode, is_default, created_at) "
                    "VALUES (:id, :principal_id, :label, :line1, :line2, :city, :state, :pincode, :is_default, :created_at) "
                    "ON CONFLICT (id) DO NOTHING"
                ),
                a,
            )
        await session.commit()
    print("  Addresses OK")

    # -------------------------------------------------------------------
    # 7. Manufacturers
    # -------------------------------------------------------------------
    print("Seeding manufacturers…")
    manufacturers = [
        {"id": "mfr_sun",       "name": "Sun Pharma",  "country": "India"},
        {"id": "mfr_cipla",     "name": "Cipla",        "country": "India"},
        {"id": "mfr_drl",       "name": "Dr Reddy's",   "country": "India"},
        {"id": "mfr_mankind",   "name": "Mankind",      "country": "India"},
        {"id": "mfr_abbott",    "name": "Abbott",       "country": "USA"},
        {"id": "mfr_alkem",     "name": "Alkem",        "country": "India"},
        {"id": "mfr_microlabs", "name": "Micro Labs",   "country": "India"},
        {"id": "mfr_zydus",     "name": "Zydus",        "country": "India"},
        {"id": "mfr_lupin",     "name": "Lupin",        "country": "India"},
        {"id": "mfr_pfizer",    "name": "Pfizer",       "country": "USA"},
    ]
    async with AsyncSessionLocal() as session:
        for m in manufacturers:
            await session.execute(
                text(
                    "INSERT INTO catalog_m.manufacturers (id, name, country, created_at) "
                    "VALUES (:id, :name, :country, :created_at) "
                    "ON CONFLICT (id) DO NOTHING"
                ),
                {**m, "created_at": NOW},
            )
        await session.commit()
    print("  Manufacturers OK")

    # -------------------------------------------------------------------
    # 8. Salts
    # -------------------------------------------------------------------
    print("Seeding salts…")
    salts = [
        {"id": "salt_para",  "name": "Paracetamol",     "who_essential": True},
        {"id": "salt_amox",  "name": "Amoxicillin",     "who_essential": True},
        {"id": "salt_panto", "name": "Pantoprazole",    "who_essential": False},
        {"id": "salt_met",   "name": "Metformin",       "who_essential": True},
        {"id": "salt_aml",   "name": "Amlodipine",      "who_essential": False},
        {"id": "salt_cet",   "name": "Cetirizine",      "who_essential": False},
        {"id": "salt_azith", "name": "Azithromycin",    "who_essential": True},
        {"id": "salt_ibup",  "name": "Ibuprofen",       "who_essential": True},
        {"id": "salt_ator",  "name": "Atorvastatin",    "who_essential": False},
        {"id": "salt_losa",  "name": "Losartan",        "who_essential": False},
        {"id": "salt_omep",  "name": "Omeprazole",      "who_essential": False},
        {"id": "salt_cipro", "name": "Ciprofloxacin",   "who_essential": True},
        {"id": "salt_clopi", "name": "Clopidogrel",     "who_essential": False},
        {"id": "salt_metop", "name": "Metoprolol",      "who_essential": False},
        {"id": "salt_asp",   "name": "Aspirin",         "who_essential": True},
        {"id": "salt_mont",  "name": "Montelukast",     "who_essential": False},
        {"id": "salt_fexo",  "name": "Fexofenadine",    "who_essential": False},
        {"id": "salt_telm",  "name": "Telmisartan",     "who_essential": False},
        {"id": "salt_vitd",  "name": "Cholecalciferol", "who_essential": False},
        {"id": "salt_salb",  "name": "Salbutamol",      "who_essential": True},
    ]
    async with AsyncSessionLocal() as session:
        for s in salts:
            await session.execute(
                text(
                    "INSERT INTO catalog_m.salts (id, name, who_essential, created_at) "
                    "VALUES (:id, :name, :who_essential, :created_at) "
                    "ON CONFLICT (id) DO NOTHING"
                ),
                {**s, "created_at": NOW},
            )
        await session.commit()
    print("  Salts OK")

    # -------------------------------------------------------------------
    # 9. Medicines (50+)
    # -------------------------------------------------------------------
    print("Seeding medicines…")
    # columns: id, brand_name, generic_name, mfr_id, form, strength,
    #          pack_size, pack_unit, mrp_paise, schedule, rx_required
    medicines = [
        ("med_dolo650",       "Dolo 650",              "Paracetamol 650mg",                          "mfr_microlabs", "Tablet",  "650mg",       15,  "strip",    3000, "H",   False),
        ("med_crocin650",     "Crocin 650",            "Paracetamol 650mg",                          "mfr_abbott",    "Tablet",  "650mg",       15,  "strip",    2800, None,  False),
        ("med_calpol500",     "Calpol 500",            "Paracetamol 500mg",                          "mfr_abbott",    "Tablet",  "500mg",       10,  "strip",    2200, None,  False),
        ("med_combiflam",     "Combiflam",             "Ibuprofen+Paracetamol 400/325mg",            "mfr_abbott",    "Tablet",  "400/325mg",   20,  "strip",    3500, None,  False),
        ("med_brufen400",     "Brufen 400",            "Ibuprofen 400mg",                            "mfr_abbott",    "Tablet",  "400mg",       15,  "strip",    2500, None,  False),
        ("med_amoxil500",     "Amoxil 500",            "Amoxicillin 500mg",                          "mfr_cipla",     "Capsule", "500mg",       10,  "strip",    8000, "H",   True),
        ("med_mox500",        "Mox 500",               "Amoxicillin 500mg",                          "mfr_mankind",   "Capsule", "500mg",       10,  "strip",    7500, "H",   True),
        ("med_augmentin625",  "Augmentin 625",         "Amoxicillin+Clavulanic Acid 625mg",          "mfr_alkem",     "Tablet",  "625mg",        6,  "strip",   21000, "H",   True),
        ("med_pan40",         "Pan 40",                "Pantoprazole 40mg",                          "mfr_alkem",     "Tablet",  "40mg",        15,  "strip",    6500, None,  False),
        ("med_pantop40",      "Pantop 40",             "Pantoprazole 40mg",                          "mfr_mankind",   "Tablet",  "40mg",        15,  "strip",    5500, None,  False),
        ("med_glycomet500",   "Glycomet 500",          "Metformin 500mg",                            "mfr_mankind",   "Tablet",  "500mg",       20,  "strip",    3200, None,  True),
        ("med_glucophage500", "Glucophage 500",        "Metformin 500mg",                            "mfr_drl",       "Tablet",  "500mg",       20,  "strip",    4500, None,  True),
        ("med_amlong5",       "Amlong 5",              "Amlodipine 5mg",                             "mfr_microlabs", "Tablet",  "5mg",         30,  "strip",    4500, None,  True),
        ("med_amlokind5",     "Amlokind 5",            "Amlodipine 5mg",                             "mfr_mankind",   "Tablet",  "5mg",         30,  "strip",    4200, None,  True),
        ("med_alerid10",      "Alerid 10",             "Cetirizine 10mg",                            "mfr_cipla",     "Tablet",  "10mg",        10,  "strip",    1800, None,  False),
        ("med_zyrtec10",      "Zyrtec 10",             "Cetirizine 10mg",                            "mfr_cipla",     "Tablet",  "10mg",         7,  "strip",    2100, None,  False),
        ("med_azee500",       "Azee 500",              "Azithromycin 500mg",                         "mfr_cipla",     "Tablet",  "500mg",        3,  "strip",    9500, "H",   True),
        ("med_azithral500",   "Azithral 500",          "Azithromycin 500mg",                         "mfr_alkem",     "Tablet",  "500mg",        3,  "strip",    8800, "H",   True),
        ("med_atorva10",      "Atorva 10",             "Atorvastatin 10mg",                          "mfr_zydus",     "Tablet",  "10mg",        15,  "strip",    4200, None,  True),
        ("med_storvas20",     "Storvas 20",            "Atorvastatin 20mg",                          "mfr_sun",       "Tablet",  "20mg",        15,  "strip",    7800, None,  True),
        ("med_losar50",       "Losar 50",              "Losartan 50mg",                              "mfr_cipla",     "Tablet",  "50mg",        15,  "strip",    5500, None,  True),
        ("med_omez20",        "Omez 20",               "Omeprazole 20mg",                            "mfr_drl",       "Capsule", "20mg",        15,  "strip",    4800, None,  False),
        ("med_ciprobid500",   "Ciprobid 500",          "Ciprofloxacin 500mg",                        "mfr_cipla",     "Tablet",  "500mg",       10,  "strip",   11000, "H",   True),
        ("med_clopitab75",    "Clopitab 75",           "Clopidogrel 75mg",                           "mfr_sun",       "Tablet",  "75mg",        14,  "strip",    9500, None,  True),
        ("med_betaloc25",     "Betaloc 25",            "Metoprolol 25mg",                            "mfr_sun",       "Tablet",  "25mg",        20,  "strip",    4200, None,  True),
        ("med_ecosprin75",    "Ecosprin 75",           "Aspirin 75mg",                               "mfr_alkem",     "Tablet",  "75mg",        28,  "strip",    2800, None,  False),
        ("med_montair10",     "Montair 10",            "Montelukast 10mg",                           "mfr_cipla",     "Tablet",  "10mg",        10,  "strip",    8500, None,  True),
        ("med_allegra120",    "Allegra 120",           "Fexofenadine 120mg",                         "mfr_sun",       "Tablet",  "120mg",       10,  "strip",    9800, None,  False),
        ("med_telma40",       "Telma 40",              "Telmisartan 40mg",                           "mfr_lupin",     "Tablet",  "40mg",        30,  "strip",   12000, None,  True),
        ("med_vitd360",       "Vitamin D3 60K",        "Cholecalciferol 60000IU",                    "mfr_zydus",     "Capsule", "60000IU",      4,  "strip",    8500, None,  False),
        ("med_shelcal500",    "Shelcal 500",           "Calcium+Vit D3 500mg+250IU",                 "mfr_alkem",     "Tablet",  "500mg+250IU", 15,  "strip",    4200, None,  False),
        ("med_neurobion",     "Neurobion Forte",       "Vitamin B Complex",                          "mfr_pfizer",    "Tablet",  None,          30,  "strip",    3200, None,  False),
        ("med_asthalin",      "Asthalin Inhaler",      "Salbutamol 100mcg",                          "mfr_cipla",     "Inhaler", "100mcg",       1,  "inhaler", 15000, None,  True),
        ("med_ors",           "Electral ORS Powder",   "ORS Powder",                                 "mfr_alkem",     "Powder",  None,          21,  "sachet",   1200, None,  False),
        ("med_digene",        "Digene Gel",            "Antacid Gel",                                "mfr_abbott",    "Gel",     None,         170,  "bottle",   8500, None,  False),
        ("med_volini",        "Volini Gel",            "Diclofenac+Methyl Salicylate",               "mfr_sun",       "Gel",     None,          30,  "tube",     9500, None,  False),
        ("med_bcold",         "B-Cold Tablet",         "Paracetamol+Phenylephrine+Cetirizine",       "mfr_mankind",   "Tablet",  None,          10,  "strip",    3800, None,  False),
        ("med_sinarest",      "Sinarest LP",           "Paracetamol+Phenylephrine+Chlorpheniramine", "mfr_alkem",     "Tablet",  None,          10,  "strip",    3200, None,  False),
        ("med_limcee",        "Limcee 500",            "Vitamin C 500mg",                            "mfr_abbott",    "Tablet",  "500mg",       15,  "strip",    2800, None,  False),
        ("med_cetzine10",     "Cetzine 10",            "Cetirizine 10mg",                            "mfr_sun",       "Tablet",  "10mg",        10,  "strip",    1500, None,  False),
        ("med_razo20",        "Razo 20",               "Rabeprazole 20mg",                           "mfr_drl",       "Tablet",  "20mg",        10,  "strip",    5500, None,  False),
        ("med_zincovit",      "Zincovit Tablet",       "Multivitamin+Zinc",                          "mfr_alkem",     "Tablet",  None,          15,  "strip",    6200, None,  False),
        ("med_revital",       "Revital H Capsule",     "Multivitamin+Minerals",                      "mfr_sun",       "Capsule", None,          30,  "strip",   31500, None,  False),
        ("med_bd_syringe",    "BD Insulin Syringe 1ml","Insulin Syringe",                            "mfr_alkem",     "Device",  "1ml",         10,  "box",      8000, None,  False),
        ("med_gluco_strip",   "Accu-Chek Active Strips","Glucometer Test Strips",                    "mfr_alkem",     "Strip",   None,          25,  "box",     52000, None,  False),
        ("med_doxybond",      "Doxybond LB",           "Doxycycline 100mg",                          "mfr_mankind",   "Capsule", "100mg",       10,  "strip",    7500, "H",   True),
        ("med_metrogyl400",   "Metrogyl 400",          "Metronidazole 400mg",                        "mfr_alkem",     "Tablet",  "400mg",       15,  "strip",    3800, None,  True),
        ("med_flucos",        "Flucos 150",            "Fluconazole 150mg",                          "mfr_cipla",     "Tablet",  "150mg",        1,  "strip",    4500, "H",   True),
        ("med_sporidex",      "Sporidex 500",          "Cephalexin 500mg",                           "mfr_cipla",     "Capsule", "500mg",       10,  "strip",    9800, "H",   True),
    ]

    ALL_MED_IDS = [m[0] for m in medicines]
    med_mrp_map = {m[0]: m[8] for m in medicines}
    med_rx_map = {m[0]: m[10] for m in medicines}

    async with AsyncSessionLocal() as session:
        for (
            mid, brand, generic, mfr_id, form, strength, pack_size, pack_unit,
            mrp_paise, schedule, rx_required,
        ) in medicines:
            await session.execute(
                text(
                    "INSERT INTO catalog_m.medicines "
                    "(id, brand_name, generic_name, manufacturer_id, form, strength, pack_size, pack_unit, "
                    " mrp_paise, gst_rate_bps, schedule, rx_required, is_discontinued, is_active, hsn_code, "
                    " created_at, updated_at) "
                    "VALUES (:id, :brand_name, :generic_name, :manufacturer_id, :form, :strength, :pack_size, "
                    "        :pack_unit, :mrp_paise, :gst_rate_bps, :schedule, :rx_required, :is_discontinued, "
                    "        :is_active, :hsn_code, :created_at, :updated_at) "
                    "ON CONFLICT (id) DO NOTHING"
                ),
                {
                    "id": mid,
                    "brand_name": brand,
                    "generic_name": generic,
                    "manufacturer_id": mfr_id,
                    "form": form,
                    "strength": strength,
                    "pack_size": pack_size,
                    "pack_unit": pack_unit,
                    "mrp_paise": mrp_paise,
                    "gst_rate_bps": 500,
                    "schedule": schedule,
                    "rx_required": rx_required,
                    "is_discontinued": False,
                    "is_active": True,
                    "hsn_code": "30049099",
                    "created_at": NOW,
                    "updated_at": NOW,
                },
            )
        await session.commit()
    print(f"  {len(medicines)} medicines OK")

    # -------------------------------------------------------------------
    # 10. Pharmacies
    # -------------------------------------------------------------------
    print("Seeding pharmacies…")

    pharmacy_data = [
        # (id, name, dl_number, owner_id, addr_line1, addr_line2, city, pincode, lat, lng, phone, is_open)
        # ---- INDIRANAGAR ----
        ("ph_ind_01", "Apollo Pharmacy Indiranagar", "KA-BLR-DL-2401", "owner_ph_01",
         "100 Feet Road", "Indiranagar", "Bengaluru", "560038", 12.9784, 77.6408, "080-41234567", True),
        ("ph_ind_02", "MedPlus Indiranagar CMH Road", "KA-BLR-DL-2402", "owner_ph_02",
         "CMH Road, 12th Main", "Indiranagar", "Bengaluru", "560038", 12.9751, 77.6391, "080-41234568", True),
        ("ph_ind_03", "Wellness Forever Indiranagar", "KA-BLR-DL-2403", "owner_ph_03",
         "80 Feet Road, Indiranagar 2nd Stage", None, "Bengaluru", "560038", 12.9719, 77.6434, "080-41234569", True),
        ("ph_ind_04", "HealthMart Pharmacy", "KA-BLR-DL-2404", "owner_ph_04",
         "12th Main Road, HAL 2nd Stage", None, "Bengaluru", "560008", 12.9765, 77.6372, "080-41234570", False),
        ("ph_ind_05", "CareMax Pharmacy", "KA-BLR-DL-2405", "owner_ph_05",
         "Airport Road", "Domlur", "Bengaluru", "560071", 12.9607, 77.6386, "080-41234571", True),
        ("ph_ind_06", "Sanjivini Medicals", "KA-BLR-DL-2406", "owner_ph_06",
         "Defence Colony", "Indiranagar", "Bengaluru", "560038", 12.9801, 77.6453, "080-41234572", True),
        ("ph_ind_07", "Noble Chemists", "KA-BLR-DL-2407", "owner_ph_07",
         "Old Airport Road", "Kodihalli", "Bengaluru", "560008", 12.9678, 77.6412, "080-41234573", True),
        ("ph_ind_08", "Frank Ross Pharmacy", "KA-BLR-DL-2408", "owner_ph_08",
         "5th Cross, Indiranagar 1st Stage", None, "Bengaluru", "560038", 12.9744, 77.6418, "080-41234574", True),
        # ---- KORAMANGALA ----
        ("ph_kor_01", "Apollo Pharmacy Koramangala", "KA-BLR-DL-2409", "owner_ph_09",
         "80 Feet Road, Koramangala 4th Block", None, "Bengaluru", "560034", 12.9349, 77.6235, "080-41234575", True),
        ("ph_kor_02", "MedPlus Koramangala 6th Block", "KA-BLR-DL-2410", "owner_ph_10",
         "6th Block, Koramangala", None, "Bengaluru", "560095", 12.9318, 77.6277, "080-41234576", True),
        ("ph_kor_03", "Lifeline Pharmacy", "KA-BLR-DL-2411", "owner_ph_11",
         "5th Block, Koramangala", None, "Bengaluru", "560095", 12.9363, 77.6198, "080-41234577", True),
        ("ph_kor_04", "CureMate Pharmacy", "KA-BLR-DL-2412", "owner_ph_12",
         "6th Block Main Road, Koramangala", None, "Bengaluru", "560095", 12.9296, 77.6256, "080-41234578", False),
        ("ph_kor_05", "Guardian Pharmacy Forum", "KA-BLR-DL-2413", "owner_ph_13",
         "Forum Mall, Koramangala", None, "Bengaluru", "560095", 12.9340, 77.6101, "080-41234579", True),
        ("ph_kor_06", "Doc's Pharmacy", "KA-BLR-DL-2414", "owner_ph_14",
         "4th Block, Koramangala", None, "Bengaluru", "560034", 12.9384, 77.6180, "080-41234580", True),
        ("ph_kor_07", "PharmaQuick", "KA-BLR-DL-2415", "owner_ph_15",
         "7th Block, Koramangala", None, "Bengaluru", "560095", 12.9270, 77.6214, "080-41234581", True),
        ("ph_kor_08", "Wellness Forever Koramangala", "KA-BLR-DL-2416", "owner_ph_16",
         "Jyothi Nivas College Road, Koramangala", None, "Bengaluru", "560095", 12.9385, 77.6271, "080-41234582", True),
        ("ph_kor_09", "BioLife Chemists", "KA-BLR-DL-2417", "owner_ph_17",
         "Intermediate Ring Road, Koramangala", None, "Bengaluru", "560095", 12.9417, 77.6259, "080-41234583", True),
        # ---- HSR LAYOUT ----
        ("ph_hsr_01", "Apollo Pharmacy HSR", "KA-BLR-DL-2418", "owner_ph_18",
         "27th Main Road, HSR Layout Sector 1", None, "Bengaluru", "560102", 12.9116, 77.6389, "080-41234584", True),
        ("ph_hsr_02", "MedPlus HSR Layout", "KA-BLR-DL-2419", "owner_ph_19",
         "BDA Complex, HSR Layout", None, "Bengaluru", "560102", 12.9087, 77.6412, "080-41234585", True),
        ("ph_hsr_03", "HealthCare Medicals", "KA-BLR-DL-2420", "owner_ph_20",
         "19th Main Road, HSR Layout", None, "Bengaluru", "560102", 12.9143, 77.6371, "080-41234586", True),
        ("ph_hsr_04", "Remedy Pharmacy", "KA-BLR-DL-2421", "owner_ph_21",
         "Outer Ring Road, HSR Layout", None, "Bengaluru", "560102", 12.9064, 77.6359, "080-41234587", True),
        ("ph_hsr_05", "CityMed Pharmacy", "KA-BLR-DL-2422", "owner_ph_22",
         "5th Sector, HSR Layout", None, "Bengaluru", "560102", 12.9098, 77.6437, "080-41234588", False),
        ("ph_hsr_06", "QuickMeds HSR", "KA-BLR-DL-2423", "owner_ph_23",
         "24th Main, HSR Layout Sector 2", None, "Bengaluru", "560102", 12.9071, 77.6398, "080-41234589", True),
        ("ph_hsr_07", "BlissMed Pharmacy", "KA-BLR-DL-2424", "owner_ph_24",
         "Mangammanapalya, HSR Layout", None, "Bengaluru", "560102", 12.9134, 77.6421, "080-41234590", True),
        ("ph_hsr_08", "Sangeetha Medicals", "KA-BLR-DL-2425", "owner_ph_25",
         "Sector 3, HSR Layout", None, "Bengaluru", "560102", 12.9052, 77.6378, "080-41234591", True),
    ]

    GSTIN_PREFIX = "29AABCU"
    async with AsyncSessionLocal() as session:
        for idx, (
            ph_id, name, dl_number, owner_id,
            addr_line1, addr_line2, city, pincode, lat, lng, phone, is_open,
        ) in enumerate(pharmacy_data, start=1):
            gstin = f"{GSTIN_PREFIX}{idx:04d}Z"
            await session.execute(
                text(
                    "INSERT INTO pharmacy_m.pharmacies "
                    "(id, name, dl_number, gstin, owner_principal_id, "
                    " address_line1, address_line2, city, state, pincode, "
                    " geo_point, phone, email, status, is_open_now, created_at, updated_at) "
                    "VALUES (:id, :name, :dl_number, :gstin, :owner_principal_id, "
                    "        :address_line1, :address_line2, :city, :state, :pincode, "
                    "        ST_GeomFromText(:geo_wkt, 4326), :phone, :email, :status, :is_open_now, "
                    "        :created_at, :updated_at) "
                    "ON CONFLICT (id) DO NOTHING"
                ),
                {
                    "id": ph_id,
                    "name": name,
                    "dl_number": dl_number,
                    "gstin": gstin,
                    "owner_principal_id": owner_id,
                    "address_line1": addr_line1,
                    "address_line2": addr_line2,
                    "city": city,
                    "state": "Karnataka",
                    "pincode": pincode,
                    "geo_wkt": f"POINT({lng} {lat})",
                    "phone": phone,
                    "email": f"store.{ph_id}@medrush.in",
                    "status": "active",
                    "is_open_now": is_open,
                    "created_at": NOW,
                    "updated_at": NOW,
                },
            )
        await session.commit()
    print(f"  {len(pharmacy_data)} pharmacies OK")

    # -------------------------------------------------------------------
    # 11. Operating Schedules
    # -------------------------------------------------------------------
    print("Seeding operating schedules…")

    apollo_ids = {"ph_ind_01", "ph_kor_01", "ph_hsr_01"}
    medplus_ids = {"ph_ind_02", "ph_kor_02", "ph_hsr_02"}

    async with AsyncSessionLocal() as session:
        for ph_id, *_ in pharmacy_data:
            for dow in range(7):  # 0=Mon … 6=Sun
                if ph_id in apollo_ids:
                    open_t, close_t, closed = "00:00", "23:59", False
                elif ph_id in medplus_ids:
                    open_t, close_t, closed = "08:00", "22:00", False
                else:
                    if dow == 6:  # Sunday
                        open_t, close_t, closed = "10:00", "18:00", False
                    else:
                        open_t, close_t, closed = "09:00", "21:00", False

                await session.execute(
                    text(
                        "INSERT INTO pharmacy_m.operating_schedules "
                        "(pharmacy_id, day_of_week, open_time, close_time, is_closed) "
                        "VALUES (:pharmacy_id, :dow, :open_time, :close_time, :is_closed) "
                        "ON CONFLICT (pharmacy_id, day_of_week) DO NOTHING"
                    ),
                    {
                        "pharmacy_id": ph_id,
                        "dow": dow,
                        "open_time": open_t,
                        "close_time": close_t,
                        "is_closed": closed,
                    },
                )
        await session.commit()
    print("  Operating schedules OK")

    # -------------------------------------------------------------------
    # 12. Geo — pharmacy_locations
    # -------------------------------------------------------------------
    print("Seeding geo pharmacy_locations…")
    async with AsyncSessionLocal() as session:
        for ph_id, _name, _dl, _owner, _a1, _a2, _city, _pin, lat, lng, _ph, _open in pharmacy_data:
            await session.execute(
                text(
                    "INSERT INTO geo_m.pharmacy_locations (pharmacy_id, geo_point, updated_at) "
                    "VALUES (:pharmacy_id, ST_GeomFromText(:geo_wkt, 4326), :updated_at) "
                    "ON CONFLICT (pharmacy_id) DO NOTHING"
                ),
                {
                    "pharmacy_id": ph_id,
                    "geo_wkt": f"POINT({lng} {lat})",
                    "updated_at": NOW,
                },
            )
        await session.commit()
    print("  Pharmacy locations OK")

    # -------------------------------------------------------------------
    # 13. Inventory
    # -------------------------------------------------------------------
    print("Seeding inventory items…")

    SKIP_MEDPLUS = {"med_revital", "med_gluco_strip", "med_asthalin", "med_bd_syringe", "med_volini"}

    expiry_choices = [
        date(2026, 6, 1), date(2026, 9, 1), date(2026, 12, 1),
        date(2027, 3, 1), date(2027, 6, 1), date(2027, 9, 1), date(2027, 12, 1),
    ]

    inv_count = 0
    async with AsyncSessionLocal() as session:
        for ph_id, *_ in pharmacy_data:
            if ph_id in apollo_ids:
                ph_meds = ALL_MED_IDS[:]
            elif ph_id in medplus_ids:
                ph_meds = [m for m in ALL_MED_IDS if m not in SKIP_MEDPLUS]
            else:
                n = rng.randint(35, min(45, len(ALL_MED_IDS)))
                ph_meds = rng.sample(ALL_MED_IDS, n)

            for med_id in ph_meds:
                mrp = med_mrp_map[med_id]
                is_rx = med_rx_map[med_id]
                selling = int(mrp * (0.85 if is_rx else 0.90))

                qty = 0 if rng.random() < 0.20 else rng.randint(20, 200)
                reserved = rng.randint(0, 3) if qty > 0 else 0

                ph_suffix = ph_id[-2:].upper()
                med_suffix = med_id[-3:].upper()
                batch_no = f"BATCH{ph_suffix}{med_suffix}"

                expiry = rng.choice(expiry_choices)
                is_listed = rng.random() > 0.05

                await session.execute(
                    text(
                        "INSERT INTO inventory_m.inventory_items "
                        "(pharmacy_id, medicine_id, qty_on_hand, qty_reserved, reorder_level, "
                        " selling_price_paise, mrp_paise, current_batch_no, current_expiry, "
                        " source, last_synced_at, is_listed, created_at, updated_at) "
                        "VALUES (:pharmacy_id, :medicine_id, :qty_on_hand, :qty_reserved, :reorder_level, "
                        "        :selling_price_paise, :mrp_paise, :current_batch_no, :current_expiry, "
                        "        :source, :last_synced_at, :is_listed, :created_at, :updated_at) "
                        "ON CONFLICT (pharmacy_id, medicine_id) DO NOTHING"
                    ),
                    {
                        "pharmacy_id": ph_id,
                        "medicine_id": med_id,
                        "qty_on_hand": qty,
                        "qty_reserved": reserved,
                        "reorder_level": 10,
                        "selling_price_paise": selling,
                        "mrp_paise": mrp,
                        "current_batch_no": batch_no,
                        "current_expiry": expiry,
                        "source": "manual",
                        "last_synced_at": NOW,
                        "is_listed": is_listed,
                        "created_at": NOW,
                        "updated_at": NOW,
                    },
                )
                inv_count += 1

        await session.commit()
    print(f"  {inv_count} inventory items OK")

    # -------------------------------------------------------------------
    # 14. Rider
    # -------------------------------------------------------------------
    print("Seeding rider…")
    async with AsyncSessionLocal() as session:
        await session.execute(
            text(
                "INSERT INTO logistics_m.riders "
                "(id, principal_id, full_name, phone_e164, vehicle_type, vehicle_number, "
                " status, rating, created_at, updated_at) "
                "VALUES (:id, :principal_id, :full_name, :phone_e164, :vehicle_type, :vehicle_number, "
                "        :status, :rating, :created_at, :updated_at) "
                "ON CONFLICT (id) DO NOTHING"
            ),
            {
                "id": "rider_test_01",
                "principal_id": "rider_test_01",
                "full_name": "Kiran Kumar",
                "phone_e164": "+919876543211",
                "vehicle_type": "bicycle",
                "vehicle_number": "KA01AB1234",
                "status": "offline",
                "rating": None,
                "created_at": NOW,
                "updated_at": NOW,
            },
        )
        await session.commit()
    print("  Rider OK")

    print("\nAll seed data inserted successfully!")


# ===========================================================================
# Entry point
# ===========================================================================

if __name__ == "__main__":
    print("MedRush seed script starting…")
    print(f"  DB: {DATABASE_URL}")
    asyncio.run(run())
    print("Done.")
