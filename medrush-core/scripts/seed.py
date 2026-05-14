"""
MedRush seed script — Bengaluru production data.

Sources:
  DB1_Pharmacy_Stores.xlsx  → 28 independent pharmacies across Bangalore
                               (Apollo, MedPlus, Wellness Forever, Aster chains excluded)
  DB2_Medicine_Database.xlsx → 70 generics → 145 branded medicines

Run:
    cd medrush-core
    source .venv/bin/activate
    python scripts/seed.py
"""

import asyncio
import random
import sys
import os
from datetime import date, datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.settings import settings

DATABASE_URL = settings.DATABASE_URL
_is_remote = "localhost" not in DATABASE_URL and "127.0.0.1" not in DATABASE_URL
_connect_args: dict = {
    "server_settings": {"search_path": "extensions,tiger,public,pg_catalog"}
}
if _is_remote:
    _connect_args["ssl"] = "require"

engine = create_async_engine(DATABASE_URL, pool_pre_ping=True, connect_args=_connect_args)
AsyncSessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

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
rng = random.Random(42)


# ===========================================================================
# Helpers
# ===========================================================================

async def exec(session: AsyncSession, sql: str, params: dict) -> None:
    await session.execute(text(sql), params)


# ===========================================================================
# Static data
# ===========================================================================

MANUFACTURERS = [
    {"id": "mfr_sun",       "name": "Sun Pharmaceutical Industries", "country": "India"},
    {"id": "mfr_cipla",     "name": "Cipla",                         "country": "India"},
    {"id": "mfr_drl",       "name": "Dr. Reddy's Laboratories",      "country": "India"},
    {"id": "mfr_mankind",   "name": "Mankind Pharma",                "country": "India"},
    {"id": "mfr_abbott",    "name": "Abbott India",                  "country": "India"},
    {"id": "mfr_alkem",     "name": "Alkem Laboratories",            "country": "India"},
    {"id": "mfr_microlabs", "name": "Micro Labs",                    "country": "India"},
    {"id": "mfr_zydus",     "name": "Zydus Lifesciences",            "country": "India"},
    {"id": "mfr_lupin",     "name": "Lupin",                         "country": "India"},
    {"id": "mfr_pfizer",    "name": "Pfizer India",                  "country": "USA"},
    {"id": "mfr_glenmark",  "name": "Glenmark Pharmaceuticals",      "country": "India"},
    {"id": "mfr_torrent",   "name": "Torrent Pharmaceuticals",       "country": "India"},
    {"id": "mfr_intas",     "name": "Intas Pharmaceuticals",         "country": "India"},
    {"id": "mfr_emcure",    "name": "Emcure Pharmaceuticals",        "country": "India"},
    {"id": "mfr_sanofi",    "name": "Sanofi India",                  "country": "France"},
    {"id": "mfr_novartis",  "name": "Novartis India",                "country": "Switzerland"},
    {"id": "mfr_wockhardt", "name": "Wockhardt",                     "country": "India"},
    {"id": "mfr_gsk",       "name": "GlaxoSmithKline Pharma",        "country": "UK"},
    {"id": "mfr_bayer",     "name": "Bayer Pharmaceuticals",         "country": "Germany"},
]

# 70 salts from DB2_Medicine_Database.xlsx
SALTS = [
    # Cardiovascular
    {"id": "salt_atorvastatin",  "name": "Atorvastatin",              "who_essential": False},
    {"id": "salt_rosuvastatin",  "name": "Rosuvastatin",              "who_essential": False},
    {"id": "salt_amlodipine",    "name": "Amlodipine",                "who_essential": False},
    {"id": "salt_telmisartan",   "name": "Telmisartan",               "who_essential": False},
    {"id": "salt_losartan",      "name": "Losartan",                  "who_essential": False},
    {"id": "salt_ramipril",      "name": "Ramipril",                  "who_essential": False},
    {"id": "salt_metoprolol",    "name": "Metoprolol",                "who_essential": False},
    {"id": "salt_atenolol",      "name": "Atenolol",                  "who_essential": False},
    {"id": "salt_aspirin",       "name": "Aspirin",                   "who_essential": True},
    {"id": "salt_clopidogrel",   "name": "Clopidogrel",               "who_essential": False},
    {"id": "salt_furosemide",    "name": "Furosemide",                "who_essential": True},
    {"id": "salt_digoxin",       "name": "Digoxin",                   "who_essential": True},
    # Diabetes
    {"id": "salt_metformin",     "name": "Metformin",                 "who_essential": True},
    {"id": "salt_glimepiride",   "name": "Glimepiride",               "who_essential": False},
    {"id": "salt_sitagliptin",   "name": "Sitagliptin",               "who_essential": False},
    {"id": "salt_empagliflozin", "name": "Empagliflozin",             "who_essential": False},
    {"id": "salt_dapagliflozin", "name": "Dapagliflozin",             "who_essential": False},
    {"id": "salt_liraglutide",   "name": "Liraglutide",               "who_essential": False},
    {"id": "salt_ins_glargine",  "name": "Insulin Glargine",          "who_essential": True},
    {"id": "salt_ins_regular",   "name": "Insulin Regular",           "who_essential": True},
    # Antibiotics
    {"id": "salt_amoxicillin",   "name": "Amoxicillin",               "who_essential": True},
    {"id": "salt_amox_clav",     "name": "Amoxicillin+Clavulanate",   "who_essential": True},
    {"id": "salt_azithromycin",  "name": "Azithromycin",              "who_essential": True},
    {"id": "salt_ciprofloxacin", "name": "Ciprofloxacin",             "who_essential": True},
    {"id": "salt_doxycycline",   "name": "Doxycycline",               "who_essential": True},
    {"id": "salt_cefixime",      "name": "Cefixime",                  "who_essential": False},
    {"id": "salt_metronidazole", "name": "Metronidazole",             "who_essential": True},
    {"id": "salt_clindamycin",   "name": "Clindamycin",               "who_essential": False},
    # Pain / Fever
    {"id": "salt_para",          "name": "Paracetamol",               "who_essential": True},
    {"id": "salt_ibuprofen",     "name": "Ibuprofen",                 "who_essential": True},
    {"id": "salt_aceclofenac",   "name": "Aceclofenac",               "who_essential": False},
    {"id": "salt_diclofenac",    "name": "Diclofenac",                "who_essential": False},
    {"id": "salt_tramadol",      "name": "Tramadol",                  "who_essential": False},
    {"id": "salt_pregabalin",    "name": "Pregabalin",                "who_essential": False},
    # Respiratory
    {"id": "salt_salbutamol",    "name": "Salbutamol",                "who_essential": True},
    {"id": "salt_montelukast",   "name": "Montelukast",               "who_essential": False},
    {"id": "salt_cetirizine",    "name": "Cetirizine",                "who_essential": False},
    {"id": "salt_levocetirizine","name": "Levocetirizine",            "who_essential": False},
    {"id": "salt_fexofenadine",  "name": "Fexofenadine",              "who_essential": False},
    {"id": "salt_budesonide",    "name": "Budesonide",                "who_essential": False},
    # GI
    {"id": "salt_pantoprazole",  "name": "Pantoprazole",              "who_essential": False},
    {"id": "salt_omeprazole",    "name": "Omeprazole",                "who_essential": False},
    {"id": "salt_rabeprazole",   "name": "Rabeprazole",               "who_essential": False},
    {"id": "salt_domperidone",   "name": "Domperidone",               "who_essential": False},
    {"id": "salt_ondansetron",   "name": "Ondansetron",               "who_essential": True},
    {"id": "salt_lactulose",     "name": "Lactulose",                 "who_essential": False},
    # Neurological
    {"id": "salt_escitalopram",  "name": "Escitalopram",              "who_essential": False},
    {"id": "salt_sertraline",    "name": "Sertraline",                "who_essential": False},
    {"id": "salt_amitriptyline", "name": "Amitriptyline",             "who_essential": True},
    {"id": "salt_gabapentin",    "name": "Gabapentin",                "who_essential": False},
    {"id": "salt_clonazepam",    "name": "Clonazepam",                "who_essential": False},
    {"id": "salt_alprazolam",    "name": "Alprazolam",                "who_essential": False},
    # Hormonal
    {"id": "salt_levothyroxine", "name": "Levothyroxine",             "who_essential": True},
    {"id": "salt_progesterone",  "name": "Progesterone",              "who_essential": False},
    {"id": "salt_ocp_combo",     "name": "Levonorgestrel+Ethinyl Estradiol", "who_essential": True},
    # Vitamins & Minerals
    {"id": "salt_vitd3",         "name": "Cholecalciferol",           "who_essential": False},
    {"id": "salt_methylcobal",   "name": "Methylcobalamin",           "who_essential": False},
    {"id": "salt_ferrous_asc",   "name": "Ferrous Ascorbate+Folic Acid","who_essential": True},
    {"id": "salt_vit_c",         "name": "Ascorbic Acid",             "who_essential": True},
    {"id": "salt_calcium_vitd",  "name": "Calcium+Vitamin D3",        "who_essential": False},
    # Dermatology
    {"id": "salt_clotrimazole",  "name": "Clotrimazole",              "who_essential": True},
    {"id": "salt_ketoconazole",  "name": "Ketoconazole",              "who_essential": False},
    {"id": "salt_mupirocin",     "name": "Mupirocin",                 "who_essential": False},
    {"id": "salt_betamethasone", "name": "Betamethasone",             "who_essential": False},
    # Eye
    {"id": "salt_cipro_ed",      "name": "Ciprofloxacin (Ophthalmic)","who_essential": True},
    {"id": "salt_moxiflox_ed",   "name": "Moxifloxacin (Ophthalmic)","who_essential": False},
    {"id": "salt_latanoprost",   "name": "Latanoprost",               "who_essential": False},
    # Paediatric
    {"id": "salt_para_peds",     "name": "Paracetamol (Paediatric)",  "who_essential": True},
    {"id": "salt_ors",           "name": "Oral Rehydration Salts",    "who_essential": True},
    {"id": "salt_zinc_sulphate", "name": "Zinc Sulphate",             "who_essential": True},
]

# ---------------------------------------------------------------------------
# 145 branded medicines from DB2 generics (2 brands each, some have 3)
# Tuple: (id, brand_name, generic_name, mfr_id, form, strength,
#         pack_size, pack_unit, mrp_paise, schedule, rx_required)
# ---------------------------------------------------------------------------
MEDICINES = [
    # ── CARDIOVASCULAR ──────────────────────────────────────────────────────

    # DRG001 – Atorvastatin
    ("med_storvas10",     "Storvas 10",           "Atorvastatin 10mg",                    "mfr_sun",       "Tablet",    "10mg",        15, "strip",   4200, "H",   True),
    ("med_atorva20",      "Atorva 20",            "Atorvastatin 20mg",                    "mfr_zydus",     "Tablet",    "20mg",        15, "strip",   7800, "H",   True),

    # DRG002 – Rosuvastatin
    ("med_rozucor10",     "Rozucor 10",           "Rosuvastatin 10mg",                    "mfr_sun",       "Tablet",    "10mg",        10, "strip",   8500, "H",   True),
    ("med_rosuvas20",     "Rosuvas 20",           "Rosuvastatin 20mg",                    "mfr_sun",       "Tablet",    "20mg",        10, "strip",  15000, "H",   True),

    # DRG003 – Amlodipine
    ("med_amlong5",       "Amlong 5",             "Amlodipine 5mg",                       "mfr_microlabs", "Tablet",    "5mg",         30, "strip",   4500, "H",   True),
    ("med_amlong10",      "Amlong 10",            "Amlodipine 10mg",                      "mfr_microlabs", "Tablet",    "10mg",        30, "strip",   7200, "H",   True),

    # DRG004 – Telmisartan
    ("med_telma40",       "Telma 40",             "Telmisartan 40mg",                     "mfr_lupin",     "Tablet",    "40mg",        30, "strip",  12000, "H",   True),
    ("med_telmikind80",   "Telmikind 80",         "Telmisartan 80mg",                     "mfr_mankind",   "Tablet",    "80mg",        30, "strip",  18500, "H",   True),

    # DRG005 – Losartan
    ("med_losar50",       "Losar 50",             "Losartan 50mg",                        "mfr_cipla",     "Tablet",    "50mg",        15, "strip",   5500, "H",   True),
    ("med_repace50",      "Repace 50",            "Losartan 50mg",                        "mfr_sun",       "Tablet",    "50mg",        15, "strip",   6200, "H",   True),

    # DRG006 – Ramipril
    ("med_cardace25",     "Cardace 2.5",          "Ramipril 2.5mg",                       "mfr_sanofi",    "Capsule",   "2.5mg",       14, "strip",   6800, "H",   True),
    ("med_cardace5",      "Cardace 5",            "Ramipril 5mg",                         "mfr_sanofi",    "Capsule",   "5mg",         14, "strip",   9500, "H",   True),

    # DRG007 – Metoprolol
    ("med_metxl25",       "Met XL 25",            "Metoprolol Succinate 25mg",            "mfr_torrent",   "Tablet",    "25mg",        30, "strip",   8200, "H",   True),
    ("med_betaloc50",     "Betaloc 50",           "Metoprolol Tartrate 50mg",             "mfr_sun",       "Tablet",    "50mg",        20, "strip",   6800, "H",   True),

    # DRG008 – Atenolol
    ("med_aten25",        "Aten 25",              "Atenolol 25mg",                        "mfr_cipla",     "Tablet",    "25mg",        14, "strip",   3800, "H",   True),
    ("med_atenol50",      "Atenol 50",            "Atenolol 50mg",                        "mfr_alkem",     "Tablet",    "50mg",        14, "strip",   4800, "H",   True),

    # DRG009 – Aspirin (low dose)
    ("med_ecosprin75",    "Ecosprin 75",          "Aspirin 75mg",                         "mfr_alkem",     "Tablet",    "75mg",        28, "strip",   2800, "H",   True),
    ("med_ecosprin150",   "Ecosprin 150",         "Aspirin 150mg",                        "mfr_alkem",     "Tablet",    "150mg",       28, "strip",   3500, "H",   True),

    # DRG010 – Clopidogrel
    ("med_clopitab75",    "Clopitab 75",          "Clopidogrel 75mg",                     "mfr_sun",       "Tablet",    "75mg",        14, "strip",   9500, "H",   True),
    ("med_deplatt75",     "Deplatt 75",           "Clopidogrel 75mg",                     "mfr_torrent",   "Tablet",    "75mg",        14, "strip",   8800, "H",   True),

    # DRG011 – Furosemide
    ("med_lasix40",       "Lasix 40",             "Furosemide 40mg",                      "mfr_sanofi",    "Tablet",    "40mg",        15, "strip",   3200, "H",   True),
    ("med_frusenex40",    "Frusenex 40",          "Furosemide 40mg",                      "mfr_lupin",     "Tablet",    "40mg",        15, "strip",   2800, "H",   True),

    # DRG012 – Digoxin
    ("med_lanoxin025",    "Lanoxin 0.25",         "Digoxin 0.25mg",                       "mfr_gsk",       "Tablet",    "0.25mg",      30, "strip",   4500, "H",   True),
    ("med_digox025",      "Digox 0.25",           "Digoxin 0.25mg",                       "mfr_alkem",     "Tablet",    "0.25mg",      30, "strip",   3800, "H",   True),

    # ── DIABETES ─────────────────────────────────────────────────────────────

    # DRG013 – Metformin
    ("med_glycomet500",   "Glycomet 500",         "Metformin 500mg",                      "mfr_mankind",   "Tablet",    "500mg",       20, "strip",   3200, "H",   True),
    ("med_glycomet1000",  "Glycomet SR 1000",     "Metformin SR 1000mg",                  "mfr_mankind",   "Tablet",    "1000mg",      15, "strip",   7800, "H",   True),

    # DRG014 – Glimepiride
    ("med_amaryl1",       "Amaryl 1",             "Glimepiride 1mg",                      "mfr_sanofi",    "Tablet",    "1mg",         30, "strip",   8500, "H",   True),
    ("med_glimisave2",    "Glimisave 2",          "Glimepiride 2mg",                      "mfr_emcure",    "Tablet",    "2mg",         30, "strip",  10200, "H",   True),

    # DRG015 – Sitagliptin
    ("med_januvia50",     "Januvia 50",           "Sitagliptin 50mg",                     "mfr_novartis",  "Tablet",    "50mg",        14, "strip",  42000, "H",   True),
    ("med_zita50",        "Zita 50",              "Sitagliptin 50mg",                     "mfr_sun",       "Tablet",    "50mg",        14, "strip",  34000, "H",   True),

    # DRG016 – Empagliflozin
    ("med_jardiance10",   "Jardiance 10",         "Empagliflozin 10mg",                   "mfr_bayer",     "Tablet",    "10mg",        10, "strip",  95000, "H",   True),
    ("med_empaglu10",     "Empaglu 10",           "Empagliflozin 10mg",                   "mfr_glenmark",  "Tablet",    "10mg",        10, "strip",  38000, "H",   True),

    # DRG017 – Dapagliflozin
    ("med_forxiga10",     "Forxiga 10",           "Dapagliflozin 10mg",                   "mfr_alkem",     "Tablet",    "10mg",        14, "strip",  85000, "H",   True),
    ("med_dapata10",      "Dapata 10",            "Dapagliflozin 10mg",                   "mfr_sun",       "Tablet",    "10mg",        10, "strip",  32000, "H",   True),

    # DRG018 – Liraglutide
    ("med_lirafit06",     "Lirafit 0.6",          "Liraglutide 6mg/ml",                   "mfr_sun",       "Injection", "0.6mg/dose",   1, "pen",   420000, "H",   True),

    # DRG019 – Insulin Glargine
    ("med_basalog100",    "Basalog 100IU",        "Insulin Glargine 100IU/ml",            "mfr_alkem",     "Injection", "100IU/ml",     1, "vial",   65000, "H",   True),
    ("med_glaritus100",   "Glaritus 100IU",       "Insulin Glargine 100IU/ml",            "mfr_wockhardt", "Injection", "100IU/ml",     1, "vial",   72000, "H",   True),

    # DRG020 – Insulin Regular
    ("med_huminsulin_r",  "Huminsulin R 100IU",   "Human Insulin Regular 100IU/ml",       "mfr_alkem",     "Injection", "100IU/ml",     1, "vial",   18500, "H",   True),
    ("med_wosulin_r",     "Wosulin-R 100IU",      "Human Insulin Regular 100IU/ml",       "mfr_wockhardt", "Injection", "100IU/ml",     1, "vial",   18200, "H",   True),

    # ── ANTIBIOTICS ──────────────────────────────────────────────────────────

    # DRG021 – Amoxicillin
    ("med_mox500",        "Mox 500",              "Amoxicillin 500mg",                    "mfr_mankind",   "Capsule",   "500mg",       10, "strip",   7500, "H",   True),
    ("med_amoxil500",     "Amoxil 500",           "Amoxicillin 500mg",                    "mfr_cipla",     "Capsule",   "500mg",       10, "strip",   8000, "H",   True),

    # DRG022 – Amoxicillin + Clavulanate
    ("med_augmentin625",  "Augmentin 625",        "Amoxicillin+Clavulanate 625mg",        "mfr_gsk",       "Tablet",    "625mg",        6, "strip",  21000, "H",   True),
    ("med_moxclav625",    "Moxclav 625",          "Amoxicillin+Clavulanate 625mg",        "mfr_mankind",   "Tablet",    "625mg",        6, "strip",  14500, "H",   True),

    # DRG023 – Azithromycin
    ("med_azee500",       "Azee 500",             "Azithromycin 500mg",                   "mfr_cipla",     "Tablet",    "500mg",        3, "strip",   9500, "H",   True),
    ("med_azithral500",   "Azithral 500",         "Azithromycin 500mg",                   "mfr_alkem",     "Tablet",    "500mg",        3, "strip",   8800, "H",   True),

    # DRG024 – Ciprofloxacin
    ("med_ciplox500",     "Ciplox 500",           "Ciprofloxacin 500mg",                  "mfr_cipla",     "Tablet",    "500mg",       10, "strip",  11000, "H",   True),
    ("med_ciprobid500",   "Ciprobid 500",         "Ciprofloxacin 500mg",                  "mfr_sun",       "Tablet",    "500mg",       10, "strip",  10200, "H",   True),

    # DRG025 – Doxycycline
    ("med_doxybond100",   "Doxybond LB 100",      "Doxycycline 100mg",                    "mfr_mankind",   "Capsule",   "100mg",       10, "strip",   7500, "H",   True),
    ("med_biodoxi100",    "Biodoxi 100",          "Doxycycline 100mg",                    "mfr_alkem",     "Capsule",   "100mg",       10, "strip",   6800, "H",   True),

    # DRG026 – Cefixime
    ("med_suprax200",     "Suprax 200",           "Cefixime 200mg",                       "mfr_lupin",     "Tablet",    "200mg",        6, "strip",  18000, "H",   True),
    ("med_taxim200",      "Taxim-O 200",          "Cefixime 200mg",                       "mfr_alkem",     "Tablet",    "200mg",       10, "strip",  22000, "H",   True),

    # DRG027 – Metronidazole
    ("med_metrogyl400",   "Metrogyl 400",         "Metronidazole 400mg",                  "mfr_alkem",     "Tablet",    "400mg",       15, "strip",   3800, "H",   True),
    ("med_flagyl400",     "Flagyl 400",           "Metronidazole 400mg",                  "mfr_abbott",    "Tablet",    "400mg",       15, "strip",   4200, "H",   True),

    # DRG028 – Clindamycin
    ("med_clindac300",    "Clindac 300",          "Clindamycin 300mg",                    "mfr_alkem",     "Capsule",   "300mg",       10, "strip",  18500, "H",   True),
    ("med_dalacin300",    "Dalacin-C 300",        "Clindamycin 300mg",                    "mfr_pfizer",    "Capsule",   "300mg",       10, "strip",  28000, "H",   True),

    # ── PAIN / FEVER ─────────────────────────────────────────────────────────

    # DRG029 – Paracetamol
    ("med_dolo650",       "Dolo 650",             "Paracetamol 650mg",                    "mfr_microlabs", "Tablet",    "650mg",       15, "strip",   3000, None,  False),
    ("med_crocin500",     "Crocin 500",           "Paracetamol 500mg",                    "mfr_abbott",    "Tablet",    "500mg",       15, "strip",   2800, None,  False),
    ("med_calpol500",     "Calpol 500",           "Paracetamol 500mg",                    "mfr_abbott",    "Tablet",    "500mg",       10, "strip",   2200, None,  False),

    # DRG030 – Ibuprofen
    ("med_brufen400",     "Brufen 400",           "Ibuprofen 400mg",                      "mfr_abbott",    "Tablet",    "400mg",       15, "strip",   2500, None,  False),
    ("med_combiflam",     "Combiflam",            "Ibuprofen+Paracetamol 400mg+325mg",    "mfr_abbott",    "Tablet",    "400/325mg",   20, "strip",   3500, None,  False),

    # DRG031 – Aceclofenac
    ("med_zerodol100",    "Zerodol 100",          "Aceclofenac 100mg",                    "mfr_intas",     "Tablet",    "100mg",       10, "strip",   6500, "H",   True),
    ("med_aceclo100",     "Aceclo 100",           "Aceclofenac 100mg",                    "mfr_drl",       "Tablet",    "100mg",       10, "strip",   5500, "H",   True),

    # DRG032 – Diclofenac
    ("med_voveran50",     "Voveran 50",           "Diclofenac Sodium 50mg",               "mfr_novartis",  "Tablet",    "50mg",        15, "strip",   4200, "H",   True),
    ("med_voltaren_sr",   "Voltaren SR 100",      "Diclofenac Sodium SR 100mg",           "mfr_novartis",  "Tablet",    "100mg",       10, "strip",   9800, "H",   True),

    # DRG033 – Tramadol
    ("med_tramazac50",    "Tramazac 50",          "Tramadol 50mg",                        "mfr_zydus",     "Capsule",   "50mg",        10, "strip",   8800, "H1",  True),
    ("med_contramal50",   "Contramal 50",         "Tramadol 50mg",                        "mfr_intas",     "Tablet",    "50mg",        10, "strip",   7500, "H1",  True),

    # DRG034 – Pregabalin
    ("med_lyrica75",      "Lyrica 75",            "Pregabalin 75mg",                      "mfr_pfizer",    "Capsule",   "75mg",        14, "strip",  38000, "H1",  True),
    ("med_pregabid75",    "Pregabid 75",          "Pregabalin 75mg",                      "mfr_intas",     "Capsule",   "75mg",        10, "strip",  12500, "H1",  True),

    # ── RESPIRATORY ───────────────────────────────────────────────────────────

    # DRG035 – Salbutamol
    ("med_asthalin_inh",  "Asthalin Inhaler",     "Salbutamol 100mcg",                    "mfr_cipla",     "Inhaler",   "100mcg/dose",  1, "inhaler", 15000, "H",   True),
    ("med_ventorlin",     "Ventorlin 100mcg",     "Salbutamol 100mcg",                    "mfr_gsk",       "Inhaler",   "100mcg/dose",  1, "inhaler", 16200, "H",   True),

    # DRG036 – Montelukast
    ("med_montair10",     "Montair 10",           "Montelukast 10mg",                     "mfr_cipla",     "Tablet",    "10mg",        10, "strip",   8500, "H",   True),
    ("med_singulair10",   "Singulair 10",         "Montelukast 10mg",                     "mfr_novartis",  "Tablet",    "10mg",        14, "strip",  22000, "H",   True),

    # DRG037 – Cetirizine
    ("med_cetzine10",     "Cetzine 10",           "Cetirizine 10mg",                      "mfr_sun",       "Tablet",    "10mg",        10, "strip",   1500, None,  False),
    ("med_alerid10",      "Alerid 10",            "Cetirizine 10mg",                      "mfr_cipla",     "Tablet",    "10mg",        10, "strip",   1800, None,  False),

    # DRG038 – Levocetirizine
    ("med_levocet5",      "Levocet 5",            "Levocetirizine 5mg",                   "mfr_sun",       "Tablet",    "5mg",         10, "strip",   2800, "H",   True),
    ("med_xyzal5",        "Xyzal 5",              "Levocetirizine 5mg",                   "mfr_lupin",     "Tablet",    "5mg",         10, "strip",   3800, "H",   True),

    # DRG039 – Fexofenadine
    ("med_allegra120",    "Allegra 120",          "Fexofenadine 120mg",                   "mfr_sun",       "Tablet",    "120mg",       10, "strip",   9800, None,  False),
    ("med_allegra180",    "Allegra 180",          "Fexofenadine 180mg",                   "mfr_sun",       "Tablet",    "180mg",       10, "strip",  12500, None,  False),

    # DRG040 – Budesonide
    ("med_budecort200",   "Budecort 200",         "Budesonide 200mcg",                    "mfr_cipla",     "Inhaler",   "200mcg/dose",  1, "inhaler", 28000, "H",   True),
    ("med_foracort200",   "Foracort 200",         "Formoterol+Budesonide 6/200mcg",       "mfr_cipla",     "Inhaler",   "6/200mcg",     1, "inhaler", 42000, "H",   True),

    # ── GI / GASTRO ───────────────────────────────────────────────────────────

    # DRG041 – Pantoprazole
    ("med_pan40",         "Pan 40",               "Pantoprazole 40mg",                    "mfr_alkem",     "Tablet",    "40mg",        15, "strip",   6500, "H",   False),
    ("med_pantop40",      "Pantop 40",            "Pantoprazole 40mg",                    "mfr_mankind",   "Tablet",    "40mg",        15, "strip",   5500, "H",   False),

    # DRG042 – Omeprazole
    ("med_omez20",        "Omez 20",              "Omeprazole 20mg",                      "mfr_drl",       "Capsule",   "20mg",        15, "strip",   4800, "H",   False),
    ("med_omez40",        "Omez 40",              "Omeprazole 40mg",                      "mfr_drl",       "Capsule",   "40mg",        15, "strip",   8200, "H",   False),

    # DRG043 – Rabeprazole
    ("med_razo20",        "Razo 20",              "Rabeprazole 20mg",                     "mfr_drl",       "Tablet",    "20mg",        10, "strip",   5500, "H",   False),
    ("med_rabicip20",     "Rabicip 20",           "Rabeprazole 20mg",                     "mfr_cipla",     "Tablet",    "20mg",        10, "strip",   4800, "H",   False),

    # DRG044 – Domperidone
    ("med_domstal10",     "Domstal 10",           "Domperidone 10mg",                     "mfr_torrent",   "Tablet",    "10mg",        10, "strip",   2800, "H",   False),
    ("med_vomistop10",    "Vomistop 10",          "Domperidone 10mg",                     "mfr_mankind",   "Tablet",    "10mg",        10, "strip",   2200, "H",   False),

    # DRG045 – Ondansetron
    ("med_emeset4",       "Emeset 4",             "Ondansetron 4mg",                      "mfr_cipla",     "Tablet",    "4mg",         10, "strip",   5200, "H",   True),
    ("med_ondem8",        "Ondem 8",              "Ondansetron 8mg",                      "mfr_alkem",     "Tablet",    "8mg",         10, "strip",   9800, "H",   True),

    # DRG046 – Lactulose
    ("med_duphalac",      "Duphalac Syrup",       "Lactulose 3.35g/5ml",                  "mfr_abbott",    "Syrup",     "3.35g/5ml",  200, "bottle",  28000, None,  False),

    # ── NEUROLOGICAL / PSYCH ─────────────────────────────────────────────────

    # DRG047 – Escitalopram
    ("med_nexito10",      "Nexito 10",            "Escitalopram 10mg",                    "mfr_sun",       "Tablet",    "10mg",        15, "strip",  16500, "H",   True),
    ("med_stalopam10",    "Stalopam 10",          "Escitalopram 10mg",                    "mfr_lupin",     "Tablet",    "10mg",        15, "strip",  15800, "H",   True),

    # DRG048 – Sertraline
    ("med_serta50",       "Serta 50",             "Sertraline 50mg",                      "mfr_lupin",     "Tablet",    "50mg",        14, "strip",  18000, "H",   True),
    ("med_daxid50",       "Daxid 50",             "Sertraline 50mg",                      "mfr_pfizer",    "Tablet",    "50mg",        14, "strip",  19500, "H",   True),

    # DRG049 – Amitriptyline
    ("med_tryptomer10",   "Tryptomer 10",         "Amitriptyline 10mg",                   "mfr_alkem",     "Tablet",    "10mg",        30, "strip",   4200, "H",   True),
    ("med_amitril25",     "Amitril 25",           "Amitriptyline 25mg",                   "mfr_intas",     "Tablet",    "25mg",        30, "strip",   5800, "H",   True),

    # DRG050 – Gabapentin
    ("med_gabapin300",    "Gabapin 300",          "Gabapentin 300mg",                     "mfr_intas",     "Capsule",   "300mg",       10, "strip",  12500, "H",   True),
    ("med_neugaba300",    "Neugaba 300",          "Gabapentin 300mg",                     "mfr_sun",       "Capsule",   "300mg",       10, "strip",   9800, "H",   True),

    # DRG051 – Clonazepam (Sched X)
    ("med_zapiz05",       "Zapiz 0.5",            "Clonazepam 0.5mg",                     "mfr_intas",     "Tablet",    "0.5mg",       15, "strip",   4500, "X",   True),
    ("med_petril05",      "Petril 0.5",           "Clonazepam 0.5mg",                     "mfr_sun",       "Tablet",    "0.5mg",       15, "strip",   5200, "X",   True),

    # DRG052 – Alprazolam (Sched X)
    ("med_alprax025",     "Alprax 0.25",          "Alprazolam 0.25mg",                    "mfr_torrent",   "Tablet",    "0.25mg",      15, "strip",   3200, "X",   True),
    ("med_restyl05",      "Restyl 0.5",           "Alprazolam 0.5mg",                     "mfr_sun",       "Tablet",    "0.5mg",       15, "strip",   4500, "X",   True),

    # ── HORMONAL ─────────────────────────────────────────────────────────────

    # DRG053 – Levothyroxine
    ("med_thyronorm50",   "Thyronorm 50",         "Levothyroxine 50mcg",                  "mfr_abbott",    "Tablet",    "50mcg",      120, "strip",   8500, "H",   True),
    ("med_eltroxin100",   "Eltroxin 100",         "Levothyroxine 100mcg",                 "mfr_gsk",       "Tablet",    "100mcg",      28, "strip",   7200, "H",   True),

    # DRG054 – Progesterone
    ("med_susten200",     "Susten 200",           "Progesterone 200mg",                   "mfr_sun",       "Capsule",   "200mg",       10, "strip",  32000, "H",   True),
    ("med_gestin200",     "Gestin 200",           "Progesterone 200mg",                   "mfr_alkem",     "Capsule",   "200mg",       10, "strip",  28500, "H",   True),

    # DRG055 – Combined OCP
    ("med_ovral_l",       "Ovral-L",              "Levonorgestrel+Ethinyl Estradiol 0.15mg/0.03mg","mfr_pfizer","Tablet","0.15/0.03mg",21,"strip",  17500, "H",   True),
    ("med_mala_n",        "Mala-N",               "Levonorgestrel+Ethinyl Estradiol",     "mfr_sun",       "Tablet",    "1.5/0.03mg",  28, "strip",   4200, "H",   True),

    # ── VITAMINS & MINERALS ───────────────────────────────────────────────────

    # DRG056 – Vitamin D3
    ("med_drise60k",      "D-Rise 60K",           "Cholecalciferol 60000IU",              "mfr_sun",       "Capsule",   "60000IU",      4, "strip",   8500, None,  False),
    ("med_calcirol60k",   "Calcirol 60K",         "Cholecalciferol 60000IU",              "mfr_zydus",     "Sachet",    "60000IU",      4, "sachet",  7200, None,  False),

    # DRG057 – Methylcobalamin
    ("med_mecobal500",    "Mecobal 500",          "Methylcobalamin 500mcg",               "mfr_alkem",     "Tablet",    "500mcg",      10, "strip",   4500, None,  False),
    ("med_nervijen",      "Nervijen Plus",        "Methylcobalamin+Pyridoxine+Folic Acid","mfr_intas",     "Capsule",   None,          10, "strip",   9800, None,  False),

    # DRG058 – Ferrous Ascorbate + Folic Acid
    ("med_orofer_xt",     "Orofer XT",            "Ferrous Ascorbate+Folic Acid 100mg/1.5mg","mfr_emcure", "Tablet",   None,          30, "strip",   9500, None,  False),
    ("med_feronia_xt",    "Feronia-XT",           "Ferrous Ascorbate+Folic Acid 100mg/1.5mg","mfr_alkem",  "Tablet",   None,          30, "strip",   8200, None,  False),

    # DRG059 – Vitamin C
    ("med_limcee500",     "Limcee 500",           "Vitamin C 500mg",                      "mfr_abbott",    "Tablet",    "500mg",       15, "strip",   2800, None,  False),
    ("med_celin500",      "Celin 500",            "Vitamin C 500mg",                      "mfr_gsk",       "Tablet",    "500mg",       20, "strip",   3200, None,  False),

    # DRG060 – Calcium + Vitamin D3
    ("med_shelcal500",    "Shelcal 500",          "Calcium Carbonate+Vit D3 500mg+250IU", "mfr_alkem",     "Tablet",    "500mg+250IU", 15, "strip",   4200, None,  False),
    ("med_calcimax500",   "Calcimax 500",         "Calcium Carbonate+Vit D3 500mg+250IU", "mfr_sun",       "Tablet",    "500mg+250IU", 30, "strip",   5800, None,  False),

    # ── DERMATOLOGY ───────────────────────────────────────────────────────────

    # DRG061 – Clotrimazole
    ("med_candid_b",      "Candid-B Cream",       "Clotrimazole 1%+Beclometasone 0.025%", "mfr_glenmark",  "Cream",     None,          15, "tube",    8500, None,  False),
    ("med_canesten_1",    "Canesten 1%",          "Clotrimazole 1%",                      "mfr_bayer",     "Cream",     "1%",          20, "tube",   12000, None,  False),

    # DRG062 – Ketoconazole
    ("med_ketaglo200",    "Ketaglo 200",          "Ketoconazole 200mg",                   "mfr_alkem",     "Tablet",    "200mg",        5, "strip",   6200, "H",   True),
    ("med_nizoral_shp",   "Nizoral 2% Shampoo",   "Ketoconazole 2%",                      "mfr_alkem",     "Shampoo",   "2%",         100, "bottle",  22000, None,  False),

    # DRG063 – Mupirocin
    ("med_bactroban",     "Bactroban 2%",         "Mupirocin 2%",                         "mfr_gsk",       "Ointment",  "2%",           5, "tube",   16500, "H",   True),
    ("med_mupirax",       "Mupirax 2%",           "Mupirocin 2%",                         "mfr_sun",       "Cream",     "2%",           5, "tube",    9500, "H",   True),

    # DRG064 – Betamethasone (topical)
    ("med_betnovate",     "Betnovate 0.1%",       "Betamethasone 0.1% Cream",             "mfr_gsk",       "Cream",     "0.1%",        20, "tube",    7200, "H",   True),
    ("med_betnovate_n",   "Betnovate-N",          "Betamethasone+Neomycin 0.1%/0.5%",    "mfr_gsk",       "Cream",     "0.1%/0.5%",   20, "tube",    9800, "H",   True),

    # ── EYE PREPARATIONS ─────────────────────────────────────────────────────

    # DRG065 – Ciprofloxacin Eye Drops
    ("med_ciplox_ed",     "Ciplox Eye Drops",     "Ciprofloxacin 0.3% Eye Drops",         "mfr_cipla",     "Eye Drop",  "0.3%",         5, "bottle",  6800, "H",   True),
    ("med_cifran_ed",     "Cifran Eye Drops",     "Ciprofloxacin 0.3% Eye Drops",         "mfr_drl",       "Eye Drop",  "0.3%",         5, "bottle",  5500, "H",   True),

    # DRG066 – Moxifloxacin Eye Drops
    ("med_vigamox",       "Vigamox 0.5%",         "Moxifloxacin 0.5% Eye Drops",          "mfr_novartis",  "Eye Drop",  "0.5%",         5, "bottle", 18500, "H",   True),
    ("med_moxicip_ed",    "Moxicip Eye Drops",    "Moxifloxacin 0.5% Eye Drops",          "mfr_cipla",     "Eye Drop",  "0.5%",         5, "bottle", 12500, "H",   True),

    # DRG067 – Latanoprost
    ("med_latoprost_ed",  "Latoprost 0.005%",     "Latanoprost 0.005% Eye Drops",         "mfr_sun",       "Eye Drop",  "0.005%",       3, "bottle", 48000, "H",   True),
    ("med_xalatan",       "Xalatan 0.005%",       "Latanoprost 0.005% Eye Drops",         "mfr_pfizer",    "Eye Drop",  "0.005%",       3, "bottle", 65000, "H",   True),

    # ── PAEDIATRIC ────────────────────────────────────────────────────────────

    # DRG068 – Paracetamol Syrup
    ("med_crocin_ds",     "Crocin DS Syrup",      "Paracetamol 250mg/5ml Syrup",          "mfr_abbott",    "Syrup",     "250mg/5ml",   60, "bottle", 11000, None,  False),
    ("med_dolo_syrup",    "Dolo Syrup",           "Paracetamol 120mg/5ml Syrup",          "mfr_microlabs", "Syrup",     "120mg/5ml",   60, "bottle",  6500, None,  False),

    # DRG069 – ORS
    ("med_electral",      "Electral ORS",         "Oral Rehydration Salts (WHO formula)", "mfr_alkem",     "Powder",    None,          21, "sachet",  1200, None,  False),
    ("med_orsl",          "ORSL Sachet",          "Oral Rehydration Salts+Zinc",          "mfr_wockhardt", "Sachet",    None,          10, "sachet",  2800, None,  False),

    # DRG070 – Zinc Sulphate (Paediatric)
    ("med_zinctotal10",   "ZincTotal 10",         "Zinc Sulphate 10mg Dispersible",       "mfr_alkem",     "Tablet",    "10mg",        10, "strip",   3500, None,  False),
    ("med_zinconia20",    "Zinconia 20",          "Zinc Sulphate 20mg Dispersible",       "mfr_drl",       "Tablet",    "20mg",        10, "strip",   4200, None,  False),

    # ── EXTRAS (commonly stocked OTC / consumables) ───────────────────────────
    ("med_neurobion",     "Neurobion Forte",      "Vitamin B Complex",                    "mfr_pfizer",    "Tablet",    None,          30, "strip",   3200, None,  False),
    ("med_digene_gel",    "Digene Gel",           "Antacid Gel (Mg+Al hydroxide)",        "mfr_abbott",    "Gel",       None,         170, "bottle",  8500, None,  False),
    ("med_volini_gel",    "Volini Gel 30g",       "Diclofenac+Methyl Salicylate",         "mfr_sun",       "Gel",       None,          30, "tube",    9500, None,  False),
    ("med_sinarest",      "Sinarest LP",          "Paracetamol+Phenylephrine+CPM",        "mfr_alkem",     "Tablet",    None,          10, "strip",   3200, None,  False),
    ("med_bcold",         "B-Cold",               "Paracetamol+Phenylephrine+Cetirizine", "mfr_mankind",   "Tablet",    None,          10, "strip",   3800, None,  False),
    ("med_bd_syringe",    "BD Syringe 1ml U-100", "Insulin Syringe 1ml",                 "mfr_alkem",     "Device",    "1ml",         10, "box",     8000, None,  False),
    ("med_gluco_strip",   "Accu-Chek Strips",     "Glucometer Test Strips",               "mfr_alkem",     "Strip",     None,          25, "box",    52000, None,  False),
]

# ---------------------------------------------------------------------------
# 28 independent pharmacies from DB1_Pharmacy_Stores.xlsx
# (Apollo, MedPlus, Wellness Forever, Aster — excluded as established chains)
# Tuple: (ph_id, name, dl_number, owner_id, addr_line1, area, city, pincode,
#         lat, lng, phone, is_open, open_time, close_time)
# ---------------------------------------------------------------------------
PHARMACY_DATA = [
    # ── KORAMANGALA ───────────────────────────────────────────────────────────
    ("ph_blr001", "Lavish Pharma – 6th Block",      "KA/DL/2019/001234", "owner_ph_01",
     "619, 80 Feet Rd, 6th Block", "Koramangala", "Bengaluru", "560095",
     12.9373, 77.6267, "+91 87220 02575", True,  "07:30", "22:30"),

    ("ph_blr002", "Bengaluru Drug House",            "KA/DL/2011/000892", "owner_ph_02",
     "34, 5th Cross Rd, 5th Block", "Koramangala", "Bengaluru", "560095",
     12.9358, 77.6215, "+91 97434 33344", True,  "07:00", "23:59"),

    ("ph_blr003", "Lavish Pharma – 8th Block",      "KA/DL/2021/002341", "owner_ph_03",
     "297, AK Colony, 8th Block", "Koramangala", "Bengaluru", "560095",
     12.9410, 77.6177, "+91 74110 02575", True,  "07:30", "22:30"),

    ("ph_blr004", "Ramdev Medical – Ejipura",        "KA/DL/2016/001567", "owner_ph_04",
     "898/1, 80 Feet Rd, Ejipura", "Koramangala", "Bengaluru", "560095",
     12.9397, 77.6258, "+91 96115 00458", True,  "08:00", "23:30"),

    ("ph_blr005", "Ram Medicals – 1st Block",        "KA/DL/2013/001102", "owner_ph_05",
     "1011, 7th A Main Rd, 1st Block", "Koramangala", "Bengaluru", "560034",
     12.9304, 77.6337, "+91 76191 19994", True,  "08:00", "23:59"),

    ("ph_blr006", "Rays Pharmacy",                  "KA/DL/2020/002189", "owner_ph_06",
     "No.131, KHB Colony, 5th Block", "Koramangala", "Bengaluru", "560095",
     12.9350, 77.6310, "+91 90662 76764", True,  "08:30", "22:00"),

    ("ph_blr007", "Kaveri Pharma",                  "KA/DL/2018/001788", "owner_ph_07",
     "S-18, 7th Main, 1st Block", "Koramangala", "Bengaluru", "560034",
     12.9338, 77.6225, "+91 99450 01232", True,  "08:00", "23:30"),

    ("ph_blr008", "Krishna Medicals – 3rd Block",   "KA/DL/2015/001345", "owner_ph_08",
     "151, 8th Main, 5th Cross Rd, 3rd Block", "Koramangala", "Bengaluru", "560034",
     12.9295, 77.6293, "+91 70260 70111", True,  "07:30", "23:30"),

    # ── INDIRANAGAR ───────────────────────────────────────────────────────────
    ("ph_blr012", "Revive Pharma – 24/7",            "KA/DL/2020/002300", "owner_ph_09",
     "190, Paramahansa Yogananda Rd, 2nd Stage", "Indiranagar", "Bengaluru", "560038",
     12.9770, 77.6363, "+91 80 4155 0900", True,  "00:00", "23:59"),

    ("ph_blr013", "Cosmo Pharmacy",                 "KA/DL/2019/002155", "owner_ph_10",
     "191, CMH Rd, Metro Pillar 70", "Indiranagar", "Bengaluru", "560038",
     12.9785, 77.6394, "+91 89044 88315", True,  "07:45", "23:30"),

    ("ph_blr014", "Sri Sai Pharma",                 "KA/DL/2017/001680", "owner_ph_11",
     "Basheera Manzil, 12th Cross Rd", "Indiranagar", "Bengaluru", "560038",
     12.9788, 77.6381, "+91 99015 09953", True,  "08:00", "22:30"),

    ("ph_blr015", "Prakash Medicals",               "KA/DL/2010/000756", "owner_ph_12",
     "3038, 8th Main Rd, 80 Feet Rd, HAL 2nd Stage", "Indiranagar", "Bengaluru", "560008",
     12.9730, 77.6469, "+91 94491 59625", True,  "08:30", "22:00"),

    ("ph_blr016", "S.S. Medicals",                  "KA/DL/2014/001290", "owner_ph_13",
     "1099, 5th Cross, 12th Main Rd, HAL 2nd Stage", "Indiranagar", "Bengaluru", "560008",
     12.9697, 77.6387, "+91 94480 82173", True,  "09:30", "22:00"),

    # ── HSR LAYOUT ────────────────────────────────────────────────────────────
    ("ph_blr020", "RAM Medicals – HSR 1st Sector",  "KA/DL/2015/001388", "owner_ph_14",
     "2737/1, 16th Cross, 27th Main Rd", "HSR Layout", "Bengaluru", "560102",
     12.9127, 77.6520, "+91 90193 12793", True,  "08:30", "23:00"),

    ("ph_blr021", "Sanjivani Medicals – BDA Complex","KA/DL/2016/001489", "owner_ph_15",
     "24, 14th Main Rd, Sector 4", "HSR Layout", "Bengaluru", "560102",
     12.9142, 77.6383, "+91 97428 64699", True,  "10:00", "22:00"),

    ("ph_blr022", "Roots Pharma – HSR",             "KA/DL/2018/001834", "owner_ph_16",
     "1714, 26th Cross, 19th Main Rd, Sector 2", "HSR Layout", "Bengaluru", "560102",
     12.9161, 77.6447, "+91 80 4124 7505", True, "07:00", "23:00"),

    ("ph_blr023", "Ganesh Medicals – HSR Sector 2", "KA/DL/2014/001260", "owner_ph_17",
     "1181, 24th Main Rd, Sector 2", "HSR Layout", "Bengaluru", "560102",
     12.9132, 77.6490, "+91 80503 02949", True,  "08:00", "23:30"),

    ("ph_blr024", "Elite Pharma – HSR",             "KA/DL/2021/002390", "owner_ph_18",
     "22nd Cross Rd, 16th Main, Sector 3", "HSR Layout", "Bengaluru", "560102",
     12.9092, 77.6408, "+91 80 4129 1122", True,  "09:00", "23:59"),

    # ── BTM LAYOUT ────────────────────────────────────────────────────────────
    ("ph_blr025", "Ramdev Medical BTM #1",           "KA/DL/2018/001867", "owner_ph_19",
     "951, 16th Main Rd, BTM 2nd Stage", "BTM Layout", "Bengaluru", "560068",
     12.9137, 77.6102, "+91 80 4167 3300", True,  "08:00", "23:59"),

    ("ph_blr026", "New Ram Medicals – BTM",          "KA/DL/2019/002022", "owner_ph_20",
     "337/B, Bannerghatta Rd, BTM 2nd Stage", "BTM Layout", "Bengaluru", "560076",
     12.9054, 77.6094, "+91 90197 61822", True,  "08:30", "23:30"),

    # ── JAYANAGAR ─────────────────────────────────────────────────────────────
    ("ph_blr028", "Narayana Pharmacy – Jayanagar",  "KA/DL/2013/001178", "owner_ph_21",
     "Uday House, 4th T Block East", "Jayanagar", "Bengaluru", "560011",
     12.9288, 77.5829, "+91 70262 22222", True,  "08:00", "20:00"),

    ("ph_blr029", "Lakshmi Medical Centre",          "KA/DL/2011/000934", "owner_ph_22",
     "37/1, 36th Cross Rd, 4th T Block", "Jayanagar", "Bengaluru", "560041",
     12.9232, 77.5885, "+91 98454 37304", True,  "08:00", "23:00"),

    # ── DOMLUR ────────────────────────────────────────────────────────────────
    ("ph_blr030", "Chandru Pharma – Domlur",         "KA/DL/2019/002100", "owner_ph_23",
     "Shop 7&8, Pillaiah Reddy Complex, BDA Colony", "Domlur", "Bengaluru", "560071",
     12.9587, 77.6372, "+91 90356 83207", True,  "07:00", "23:00"),

    # ── BELLANDUR ─────────────────────────────────────────────────────────────
    ("ph_blr031", "RAMDEV MEDICAL – Bellandur Gate", "KA/DL/2020/002260", "owner_ph_24",
     "Satyasadana Complex, Sarjapur Main Rd", "Bellandur", "Bengaluru", "560102",
     12.9187, 77.6706, "+91 72040 50074", True,  "08:00", "23:00"),

    # ── YESHWANTHPUR ─────────────────────────────────────────────────────────
    ("ph_blr033", "Swasthik Medical – Yeshwanthpur", "KA/DL/2017/001699", "owner_ph_25",
     "12, Railway Parallel Rd, Dr Ambedkar Nagar", "Yeshwanthpur", "Bengaluru", "560022",
     13.0231, 77.5528, "+91 81054 36848", True,  "08:30", "23:00"),

    # ── HEBBAL ────────────────────────────────────────────────────────────────
    ("ph_blr034", "Sneha Pharma – Hebbal",           "KA/DL/2021/002422", "owner_ph_26",
     "14/A-26, 3rd Cross Rd, Cholanayakanahalli", "Hebbal", "Bengaluru", "560024",
     13.0399, 77.5906, "+91 80 4211 8800", True,  "08:30", "22:30"),

    # ── WHITEFIELD ────────────────────────────────────────────────────────────
    ("ph_blr036", "Sri Ram Medical – Whitefield",    "KA/DL/2018/001877", "owner_ph_27",
     "271, Borewell Rd, Dodsworth Layout", "Whitefield", "Bengaluru", "560066",
     12.9827, 77.7481, "+91 86607 91238", True,  "08:00", "23:59"),

    ("ph_blr037", "Prashanth Medicals – Whitefield", "KA/DL/2017/001712", "owner_ph_28",
     "207, Pattandur Agrahara, Vivekananda Rd", "Whitefield", "Bengaluru", "560066",
     12.9681, 77.7487, "+91 70198 31492", True,  "08:00", "23:45"),
]

NUM_OWNERS = len(PHARMACY_DATA)  # 28


# ===========================================================================
# Main seed routine
# ===========================================================================

async def run() -> None:

    # -----------------------------------------------------------------------
    # 1. Schemas
    # -----------------------------------------------------------------------
    print("Creating schemas…")
    schemas = [
        "identity_m", "user_m", "catalog_m", "pharmacy_m",
        "geo_m", "inventory_m", "logistics_m", "order_m",
        "cart_m", "payment_m", "rx_m", "audit_m", "notification_m",
    ]
    async with engine.begin() as conn:
        # Pin the search_path for this session so PostGIS geography type
        # (installed in `extensions` schema on Supabase) is always visible.
        await conn.execute(text("SET search_path TO extensions,tiger,public,pg_catalog"))
        # Also persist it as the database default so future connections work.
        await conn.execute(text(
            "ALTER DATABASE postgres SET search_path TO extensions,tiger,public,pg_catalog"
        ))
        for s in schemas:
            await conn.execute(text(f"CREATE SCHEMA IF NOT EXISTS {s}"))
    print("  Schemas OK")

    # -----------------------------------------------------------------------
    # 2. Tables
    # -----------------------------------------------------------------------
    print("Creating tables…")

    SKIP_TABLES = {"user_m.family_members", "audit_m.audit_log"}

    def create_all_except(conn_sync):
        tables = [t for k, t in Base.metadata.tables.items() if k not in SKIP_TABLES]
        Base.metadata.create_all(bind=conn_sync, tables=tables)

    async with engine.begin() as conn:
        # Ensure PostGIS geography type is visible.
        # On Supabase, geography lives in the `tiger` schema.
        await conn.execute(text("SET search_path TO extensions,tiger,public,pg_catalog"))
        await conn.run_sync(create_all_except)

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

    # -----------------------------------------------------------------------
    # 3. Principals
    # -----------------------------------------------------------------------
    print("Seeding principals…")
    principals = [
        {"id": "cust_test_01",  "phone_e164": "+919876543210", "email": "test@medrush.in",
         "is_verified": True, "is_active": True, "created_at": NOW, "updated_at": NOW},
        {"id": "rider_test_01", "phone_e164": "+919876543211", "email": None,
         "is_verified": True, "is_active": True, "created_at": NOW, "updated_at": NOW},
    ]
    for i in range(1, NUM_OWNERS + 1):
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
            await session.execute(text(
                "INSERT INTO identity_m.principals "
                "(id, phone_e164, email, is_verified, is_active, created_at, updated_at) "
                "VALUES (:id, :phone_e164, :email, :is_verified, :is_active, :created_at, :updated_at) "
                "ON CONFLICT (id) DO NOTHING"
            ), p)
        await session.commit()
    print(f"  {len(principals)} principals OK")

    # -----------------------------------------------------------------------
    # 4. Role assignments
    # -----------------------------------------------------------------------
    print("Seeding role assignments…")
    role_rows = [
        {"id": "ra_cust_test_01",  "principal_id": "cust_test_01",  "role": "customer",
         "resource_type": None, "resource_id": None, "granted_by": None, "created_at": NOW},
        {"id": "ra_rider_test_01", "principal_id": "rider_test_01", "role": "rider",
         "resource_type": None, "resource_id": None, "granted_by": None, "created_at": NOW},
    ]
    for idx, (ph_id, *_) in enumerate(PHARMACY_DATA, start=1):
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
            await session.execute(text(
                "INSERT INTO identity_m.role_assignments "
                "(id, principal_id, role, resource_type, resource_id, granted_by, created_at) "
                "VALUES (:id, :principal_id, :role, :resource_type, :resource_id, :granted_by, :created_at) "
                "ON CONFLICT (id) DO NOTHING"
            ), r)
        await session.commit()
    print(f"  {len(role_rows)} role assignments OK")

    # -----------------------------------------------------------------------
    # 5. Profiles + Addresses (test user only)
    # -----------------------------------------------------------------------
    print("Seeding profiles & addresses…")
    async with AsyncSessionLocal() as session:
        for p in [
            {"principal_id": "cust_test_01",  "full_name": "Rahul Sharma",
             "date_of_birth": date(1992, 6, 15), "gender": "male",
             "preferred_language": "en", "created_at": NOW, "updated_at": NOW},
            {"principal_id": "rider_test_01", "full_name": "Kiran Kumar",
             "date_of_birth": date(1995, 3, 22), "gender": "male",
             "preferred_language": "kn", "created_at": NOW, "updated_at": NOW},
        ]:
            await session.execute(text(
                "INSERT INTO user_m.profiles "
                "(principal_id, full_name, date_of_birth, gender, preferred_language, created_at, updated_at) "
                "VALUES (:principal_id, :full_name, :date_of_birth, :gender, :preferred_language, :created_at, :updated_at) "
                "ON CONFLICT (principal_id) DO NOTHING"
            ), p)

        for a in [
            {"id": "addr_cust_01_home", "principal_id": "cust_test_01", "label": "Home",
             "line1": "42, 12th Main Road", "line2": "Indiranagar 1st Stage",
             "city": "Bengaluru", "state": "Karnataka", "pincode": "560038",
             "is_default": True,  "created_at": NOW},
            {"id": "addr_cust_01_work", "principal_id": "cust_test_01", "label": "Work",
             "line1": "Embassy Tech Village, Outer Ring Road", "line2": "Koramangala",
             "city": "Bengaluru", "state": "Karnataka", "pincode": "560095",
             "is_default": False, "created_at": NOW},
            {"id": "addr_cust_01_gym",  "principal_id": "cust_test_01", "label": "Gym",
             "line1": "27th Main Road, Sector 1", "line2": "HSR Layout",
             "city": "Bengaluru", "state": "Karnataka", "pincode": "560102",
             "is_default": False, "created_at": NOW},
        ]:
            await session.execute(text(
                "INSERT INTO user_m.addresses "
                "(id, principal_id, label, line1, line2, city, state, pincode, is_default, created_at) "
                "VALUES (:id, :principal_id, :label, :line1, :line2, :city, :state, :pincode, :is_default, :created_at) "
                "ON CONFLICT (id) DO NOTHING"
            ), a)
        await session.commit()
    print("  Profiles & addresses OK")

    # -----------------------------------------------------------------------
    # 6. Manufacturers
    # -----------------------------------------------------------------------
    print("Seeding manufacturers…")
    async with AsyncSessionLocal() as session:
        for m in MANUFACTURERS:
            await session.execute(text(
                "INSERT INTO catalog_m.manufacturers (id, name, country, created_at) "
                "VALUES (:id, :name, :country, :created_at) "
                "ON CONFLICT (id) DO NOTHING"
            ), {**m, "created_at": NOW})
        await session.commit()
    print(f"  {len(MANUFACTURERS)} manufacturers OK")

    # -----------------------------------------------------------------------
    # 7. Salts
    # -----------------------------------------------------------------------
    print("Seeding salts…")
    async with AsyncSessionLocal() as session:
        for s in SALTS:
            await session.execute(text(
                "INSERT INTO catalog_m.salts (id, name, who_essential, created_at) "
                "VALUES (:id, :name, :who_essential, :created_at) "
                "ON CONFLICT (id) DO NOTHING"
            ), {**s, "created_at": NOW})
        await session.commit()
    print(f"  {len(SALTS)} salts OK")

    # -----------------------------------------------------------------------
    # 8. Medicines
    # -----------------------------------------------------------------------
    print("Seeding medicines…")
    ALL_MED_IDS  = [m[0] for m in MEDICINES]
    med_mrp_map  = {m[0]: m[8]  for m in MEDICINES}
    med_rx_map   = {m[0]: m[10] for m in MEDICINES}

    async with AsyncSessionLocal() as session:
        for (mid, brand, generic, mfr_id, form, strength, pack_size, pack_unit,
             mrp_paise, schedule, rx_required) in MEDICINES:
            await session.execute(text(
                "INSERT INTO catalog_m.medicines "
                "(id, brand_name, generic_name, manufacturer_id, form, strength, pack_size, pack_unit, "
                " mrp_paise, gst_rate_bps, schedule, rx_required, is_discontinued, is_active, hsn_code, "
                " created_at, updated_at) "
                "VALUES (:id, :brand_name, :generic_name, :manufacturer_id, :form, :strength, :pack_size, "
                "        :pack_unit, :mrp_paise, :gst_rate_bps, :schedule, :rx_required, :is_discontinued, "
                "        :is_active, :hsn_code, :created_at, :updated_at) "
                "ON CONFLICT (id) DO NOTHING"
            ), {
                "id": mid, "brand_name": brand, "generic_name": generic,
                "manufacturer_id": mfr_id, "form": form, "strength": strength,
                "pack_size": pack_size, "pack_unit": pack_unit, "mrp_paise": mrp_paise,
                "gst_rate_bps": 500, "schedule": schedule, "rx_required": rx_required,
                "is_discontinued": False, "is_active": True, "hsn_code": "30049099",
                "created_at": NOW, "updated_at": NOW,
            })
        await session.commit()
    print(f"  {len(MEDICINES)} medicines OK")

    # -----------------------------------------------------------------------
    # 9. Pharmacies
    # -----------------------------------------------------------------------
    print("Seeding pharmacies…")
    GSTIN_PREFIX = "29AABCU"

    async with AsyncSessionLocal() as session:
        for idx, (ph_id, name, dl_number, owner_id,
                  addr_line1, area, city, pincode, lat, lng,
                  phone, is_open, open_time, close_time) in enumerate(PHARMACY_DATA, start=1):
            gstin = f"{GSTIN_PREFIX}{idx:04d}Z"
            await session.execute(text(
                "INSERT INTO pharmacy_m.pharmacies "
                "(id, name, dl_number, gstin, owner_principal_id, "
                " address_line1, address_line2, city, state, pincode, "
                " geo_point, phone, email, status, is_open_now, created_at, updated_at) "
                "VALUES (:id, :name, :dl_number, :gstin, :owner_principal_id, "
                "        :address_line1, :address_line2, :city, :state, :pincode, "
                "        ST_GeomFromText(:geo_wkt, 4326), :phone, :email, :status, :is_open_now, "
                "        :created_at, :updated_at) "
                "ON CONFLICT (id) DO NOTHING"
            ), {
                "id": ph_id, "name": name, "dl_number": dl_number, "gstin": gstin,
                "owner_principal_id": owner_id, "address_line1": addr_line1,
                "address_line2": area, "city": city, "state": "Karnataka",
                "pincode": pincode, "geo_wkt": f"POINT({lng} {lat})",
                "phone": phone, "email": f"store.{ph_id}@medrush.in",
                "status": "active", "is_open_now": is_open,
                "created_at": NOW, "updated_at": NOW,
            })
        await session.commit()
    print(f"  {len(PHARMACY_DATA)} pharmacies OK")

    # -----------------------------------------------------------------------
    # 10. Operating Schedules
    # -----------------------------------------------------------------------
    print("Seeding operating schedules…")
    async with AsyncSessionLocal() as session:
        for (ph_id, _name, _dl, _owner, _a1, _area, _city, _pin,
             _lat, _lng, _ph, _open, open_time, close_time) in PHARMACY_DATA:
            for dow in range(7):   # 0 = Monday … 6 = Sunday
                # 24-hour stores stay open all week at same times.
                # Others get 10:00–20:00 on Sunday.
                if open_time == "00:00" and close_time == "23:59":
                    ot, ct, closed = "00:00", "23:59", False
                elif dow == 6:     # Sunday
                    ot, ct, closed = "10:00", "20:00", False
                else:
                    ot, ct, closed = open_time, close_time, False

                await session.execute(text(
                    "INSERT INTO pharmacy_m.operating_schedules "
                    "(pharmacy_id, day_of_week, open_time, close_time, is_closed) "
                    "VALUES (:pharmacy_id, :dow, :open_time, :close_time, :is_closed) "
                    "ON CONFLICT (pharmacy_id, day_of_week) DO NOTHING"
                ), {"pharmacy_id": ph_id, "dow": dow,
                    "open_time": ot, "close_time": ct, "is_closed": closed})
        await session.commit()
    print("  Operating schedules OK")

    # -----------------------------------------------------------------------
    # 11. Geo — pharmacy_locations
    # -----------------------------------------------------------------------
    print("Seeding geo locations…")
    async with AsyncSessionLocal() as session:
        for (ph_id, *_, lat, lng, _ph, _open, _ot, _ct) in PHARMACY_DATA:
            await session.execute(text(
                "INSERT INTO geo_m.pharmacy_locations (pharmacy_id, geo_point, updated_at) "
                "VALUES (:pharmacy_id, ST_GeomFromText(:geo_wkt, 4326), :updated_at) "
                "ON CONFLICT (pharmacy_id) DO NOTHING"
            ), {"pharmacy_id": ph_id, "geo_wkt": f"POINT({lng} {lat})", "updated_at": NOW})
        await session.commit()
    print("  Geo locations OK")

    # -----------------------------------------------------------------------
    # 12. Inventory
    # -----------------------------------------------------------------------
    print("Seeding inventory…")

    # Medicines that most small pharmacies don't stock (injectable/specialist)
    SKIP_SMALL = {
        "med_lirafit06", "med_basalog100", "med_glaritus100",
        "med_huminsulin_r", "med_wosulin_r",
        "med_jardiance10", "med_forxiga10",
        "med_lyrica75",    "med_latoprost_ed", "med_xalatan",
        "med_vigamox",     "med_gluco_strip",
    }

    expiry_choices = [
        date(2026, 6, 1), date(2026, 9, 1), date(2026, 12, 1),
        date(2027, 3, 1), date(2027, 6, 1), date(2027, 9, 1), date(2027, 12, 1),
    ]

    # High-volume pharmacies stock everything; smaller ones skip specialist items
    FULL_STOCK_IDS = {"ph_blr002", "ph_blr004", "ph_blr020", "ph_blr030"}

    inv_count = 0
    async with AsyncSessionLocal() as session:
        for (ph_id, *_) in PHARMACY_DATA:
            if ph_id in FULL_STOCK_IDS:
                ph_meds = ALL_MED_IDS[:]
            else:
                ph_meds = [m for m in ALL_MED_IDS if m not in SKIP_SMALL]
                n = rng.randint(max(60, len(ph_meds) - 20), len(ph_meds))
                ph_meds = rng.sample(ph_meds, n)

            for med_id in ph_meds:
                mrp     = med_mrp_map[med_id]
                is_rx   = med_rx_map[med_id]
                selling = int(mrp * (0.85 if is_rx else 0.90))
                qty     = 0 if rng.random() < 0.12 else rng.randint(15, 300)
                reserved = rng.randint(0, 3) if qty > 0 else 0
                batch_no = f"BATCH{ph_id[-3:].upper()}{med_id[-4:].upper()}"
                expiry   = rng.choice(expiry_choices)
                is_listed = rng.random() > 0.03   # 97% listed

                await session.execute(text(
                    "INSERT INTO inventory_m.inventory_items "
                    "(pharmacy_id, medicine_id, qty_on_hand, qty_reserved, reorder_level, "
                    " selling_price_paise, mrp_paise, current_batch_no, current_expiry, "
                    " source, last_synced_at, is_listed, created_at, updated_at) "
                    "VALUES (:pharmacy_id, :medicine_id, :qty_on_hand, :qty_reserved, :reorder_level, "
                    "        :selling_price_paise, :mrp_paise, :current_batch_no, :current_expiry, "
                    "        :source, :last_synced_at, :is_listed, :created_at, :updated_at) "
                    "ON CONFLICT (pharmacy_id, medicine_id) DO NOTHING"
                ), {
                    "pharmacy_id": ph_id, "medicine_id": med_id,
                    "qty_on_hand": qty, "qty_reserved": reserved, "reorder_level": 10,
                    "selling_price_paise": selling, "mrp_paise": mrp,
                    "current_batch_no": batch_no, "current_expiry": expiry,
                    "source": "manual", "last_synced_at": NOW,
                    "is_listed": is_listed, "created_at": NOW, "updated_at": NOW,
                })
                inv_count += 1

        await session.commit()
    print(f"  {inv_count} inventory items OK")

    # -----------------------------------------------------------------------
    # 13. Rider
    # -----------------------------------------------------------------------
    print("Seeding rider…")
    async with AsyncSessionLocal() as session:
        await session.execute(text(
            "INSERT INTO logistics_m.riders "
            "(id, principal_id, full_name, phone_e164, vehicle_type, vehicle_number, "
            " status, rating, created_at, updated_at) "
            "VALUES (:id, :principal_id, :full_name, :phone_e164, :vehicle_type, :vehicle_number, "
            "        :status, :rating, :created_at, :updated_at) "
            "ON CONFLICT (id) DO NOTHING"
        ), {
            "id": "rider_test_01", "principal_id": "rider_test_01",
            "full_name": "Kiran Kumar", "phone_e164": "+919876543211",
            "vehicle_type": "bicycle", "vehicle_number": "KA01AB1234",
            "status": "offline", "rating": None,
            "created_at": NOW, "updated_at": NOW,
        })
        await session.commit()
    print("  Rider OK")

    print("\n✅  All seed data inserted successfully!")
    print(f"    {len(MANUFACTURERS)} manufacturers  |  {len(SALTS)} salts  |  {len(MEDICINES)} medicines")
    print(f"    {len(PHARMACY_DATA)} pharmacies  |  {inv_count} inventory rows")


# ===========================================================================
# Entry point
# ===========================================================================

if __name__ == "__main__":
    print("MedRush seed script starting…")
    print(f"  DB: {DATABASE_URL[:60]}…")
    asyncio.run(run())
    print("Done.")
