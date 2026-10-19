"""Small Redis helpers: "was this done recently?" markers and a JSON lookup cache.

Used to avoid re-crawling Krisha for every search and to stop repeating the same 2GIS
lookups (the API key has a request quota). Redis being unavailable is never an error: reads
come back empty and writes are skipped, so callers simply do the work.
"""
import asyncio
import json
import weakref
from datetime import datetime, timezone

import structlog
from redis import asyncio as aioredis

from app.config import settings

log = structlog.get_logger()

# One connection pool per event loop (each Celery task runs in a new loop).
_clients: "weakref.WeakKeyDictionary[asyncio.AbstractEventLoop, aioredis.Redis]" = weakref.WeakKeyDictionary()


def _redis() -> aioredis.Redis:
    loop = asyncio.get_running_loop()
    client = _clients.get(loop)
    if client is None:
        client = aioredis.from_url(settings.redis_url, socket_connect_timeout=2, socket_timeout=2)
        _clients[loop] = client
    return client


async def get_marker(key: str) -> datetime | None:
    """When `key` was last marked, or None if never / expired / Redis unreachable."""
    try:
        value = await _redis().get(key)
        return datetime.fromisoformat(value.decode()) if value else None
    except Exception as e:
        log.warning("cache_read_failed", key=key, error=str(e))
        return None


async def set_marker(key: str, ttl_seconds: int) -> None:
    try:
        await _redis().set(key, datetime.now(timezone.utc).isoformat(), ex=ttl_seconds)
    except Exception as e:
        log.warning("cache_write_failed", key=key, error=str(e))


async def get_json_many(keys: list[str]) -> dict[str, object]:
    """Cached values for the keys that exist. Missing keys (and any Redis failure) are absent."""
    if not keys:
        return {}
    try:
        values = await _redis().mget(keys)
    except Exception as e:
        log.warning("cache_read_failed", keys=len(keys), error=str(e))
        return {}
    return {key: json.loads(value) for key, value in zip(keys, values) if value is not None}


async def set_json_many(items: dict[str, object], ttl_seconds: int) -> None:
    if not items:
        return
    try:
        pipe = _redis().pipeline()
        for key, value in items.items():
            pipe.set(key, json.dumps(value), ex=ttl_seconds)
        await pipe.execute()
    except Exception as e:
        log.warning("cache_write_failed", keys=len(items), error=str(e))
