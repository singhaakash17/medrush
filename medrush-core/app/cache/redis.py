from redis.asyncio import Redis, from_url
from app.settings import settings

_redis: Redis | None = None


async def get_redis() -> Redis:
    global _redis
    if _redis is None:
        # ssl_cert_reqs=None skips cert-chain verification for Upstash TLS on macOS
        # (Python's bundled CA store doesn't include all cloud-CDN roots).
        _redis = from_url(settings.REDIS_URL, decode_responses=True, ssl_cert_reqs=None)
    return _redis


async def close_redis() -> None:
    global _redis
    if _redis is not None:
        await _redis.aclose()
        _redis = None
