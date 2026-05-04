import json
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse
from app.cache.redis import get_redis
from app.settings import settings

IDEMPOTENT_METHODS = {"POST", "PUT", "PATCH"}


class IdempotencyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method not in IDEMPOTENT_METHODS:
            return await call_next(request)

        key = request.headers.get("idempotency-key") or request.headers.get("Idempotency-Key")
        if not key:
            return await call_next(request)

        redis = await get_redis()
        cache_key = f"idempotency:{key}"
        cached = await redis.get(cache_key)

        if cached:
            data = json.loads(cached)
            return JSONResponse(
                status_code=data["status_code"],
                content=data["body"],
                headers={"X-Idempotent-Replayed": "true"},
            )

        response = await call_next(request)

        if 200 <= response.status_code < 300:
            body = b""
            async for chunk in response.body_iterator:
                body += chunk
            try:
                body_json = json.loads(body)
            except Exception:
                body_json = {}
            await redis.set(
                cache_key,
                json.dumps({"status_code": response.status_code, "body": body_json}),
                ex=settings.IDEMPOTENCY_TTL,
            )
            return Response(
                content=body,
                status_code=response.status_code,
                media_type=response.media_type,
            )

        return response
