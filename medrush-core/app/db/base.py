from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.settings import settings

# Supabase (and any non-localhost host) requires SSL.
# asyncpg accepts ssl="require" via connect_args.
_is_remote = "localhost" not in settings.DATABASE_URL and "127.0.0.1" not in settings.DATABASE_URL
# Supabase installs PostGIS in the `extensions` schema.
# Without this search_path the geography type is invisible to asyncpg.
_connect_args: dict = {
    "server_settings": {"search_path": "extensions,tiger,public,pg_catalog"}
}
if _is_remote:
    _connect_args["ssl"] = "require"

engine = create_async_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    connect_args=_connect_args,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)
