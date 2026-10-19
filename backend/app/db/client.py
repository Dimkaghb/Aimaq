import asyncio
import weakref

from supabase import AsyncClient, acreate_client

from app.config import settings

# One client per running event loop. Celery tasks call asyncio.run(), which creates a fresh
# loop each time; a client created on a previous (closed) loop fails with "Event loop is closed".
_clients: "weakref.WeakKeyDictionary[asyncio.AbstractEventLoop, AsyncClient]" = weakref.WeakKeyDictionary()


async def get_db() -> AsyncClient:
    loop = asyncio.get_running_loop()
    client = _clients.get(loop)
    if client is None:
        client = await acreate_client(
            settings.supabase_url,
            settings.supabase_service_key,
        )
        _clients[loop] = client
    return client
