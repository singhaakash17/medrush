from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.settings import settings
from app.db.base import engine
from app.cache.redis import get_redis, close_redis
from app.kafka.events import close_producer
from app.lib.errors import register_exception_handlers
from app.lib.idempotency import IdempotencyMiddleware

from app.modules.identity.router import router as identity_router
from app.modules.user.router import router as user_router
from app.modules.catalog.router import router as catalog_router
from app.modules.pharmacy.router import router as pharmacy_router
from app.modules.inventory.router import router as inventory_router
from app.modules.geo.router import router as geo_router
from app.modules.cart.router import router as cart_router
from app.modules.order.router import router as order_router
from app.modules.rx.router import router as rx_router
from app.modules.payment.router import router as payment_router
from app.modules.logistics.router import router as logistics_router
from app.modules.notification.router import router as notification_router
from app.modules.audit.router import router as audit_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await get_redis()
    yield
    await close_redis()
    await close_producer()
    await engine.dispose()


app = FastAPI(title="medrush-core", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(IdempotencyMiddleware)

register_exception_handlers(app)

app.include_router(identity_router, prefix="/api/v1/identity", tags=["identity"])
app.include_router(user_router, prefix="/api/v1/users", tags=["users"])
app.include_router(catalog_router, prefix="/api/v1/catalog", tags=["catalog"])
app.include_router(pharmacy_router, prefix="/api/v1/pharmacies", tags=["pharmacies"])
app.include_router(inventory_router, prefix="/api/v1/inventory", tags=["inventory"])
app.include_router(geo_router, prefix="/api/v1/geo", tags=["geo"])
app.include_router(cart_router, prefix="/api/v1/cart", tags=["cart"])
app.include_router(order_router, prefix="/api/v1/orders", tags=["orders"])
app.include_router(rx_router, prefix="/api/v1/rx", tags=["rx"])
app.include_router(payment_router, prefix="/api/v1/payments", tags=["payments"])
app.include_router(logistics_router, prefix="/api/v1/logistics", tags=["logistics"])
app.include_router(notification_router, prefix="/api/v1/notifications", tags=["notifications"])
app.include_router(audit_router, prefix="/api/v1/audit", tags=["audit"])


@app.get("/health", tags=["health"])
async def health():
    db_ok = False
    redis_ok = False
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        pass
    try:
        redis = await get_redis()
        await redis.ping()
        redis_ok = True
    except Exception:
        pass
    status = "ok" if (db_ok and redis_ok) else "degraded"
    return {"status": status, "db": db_ok, "redis": redis_ok}
