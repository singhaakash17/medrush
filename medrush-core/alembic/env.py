import asyncio
from logging.config import fileConfig
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config
from alembic import context

from app.settings import settings
from app.db.base_model import Base

from app.modules.identity.models import Principal, OtpAttempt, RefreshToken, RoleAssignment
from app.modules.user.models import Profile, Address, FamilyMember, RxVaultEntry, PaymentPreference
from app.modules.catalog.models import Salt, Manufacturer, Medicine, MedicineSalt, SubstituteGroup, SubstituteMember, MedicineWarning
from app.modules.pharmacy.models import Pharmacy, PharmacyDocument, Pharmacist, OperatingSchedule, PharmacyHoliday, PharmacySetting
from app.modules.inventory.models import InventoryItem, InventoryBatch, Reservation, InventoryLedger, ErpSyncState
from app.modules.geo.models import PharmacyLocation, EtaCache, ServiceArea
from app.modules.cart.models import Cart, CartItem, Coupon, CouponRedemption, PricingRule
from app.modules.order.models import Order, OrderItem, OrderStatusHistory, SagaState, OrderRating, IdempotencyKey
from app.modules.rx.models import Prescription, RxItem, RxFlag, RxOrderLink, VerificationQueue
from app.modules.payment.models import Payment, PaymentAttempt, Refund, WebhookEvent, PharmacyPayout, BankAccount
from app.modules.logistics.models import Rider, RiderShift, Assignment, RiderLocationPing
from app.modules.notification.models import NotificationTemplate, DeliveryLog, UserPreference, DeviceToken
from app.modules.audit.models import AuditLog, DeletionRequest

config = context.config
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_schemas=True,
        version_table_schema="public",
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        include_schemas=True,
        version_table_schema="public",
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
