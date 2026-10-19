"""Shared helper for enrichment nodes: look each distinct location up once, and remember it."""
import asyncio
from collections.abc import Awaitable, Callable

import structlog

from app.services.cache import get_json_many, set_json_many

log = structlog.get_logger()

Coords = tuple[float, float]


def coord_key(listing: dict) -> Coords | None:
    """Listings in the same building share a key (rounded to ~1 m); None when unlocated."""
    lat, lng = listing.get("lat"), listing.get("lng")
    if lat is None or lng is None:
        return None
    return round(lat, 5), round(lng, 5)


async def lookup_by_location(
    listings: list[dict],
    fetch: Callable[[float, float], Awaitable],
    concurrency: int,
    label: str,
    cache_prefix: str | None = None,
    cache_ttl: int = 0,
) -> tuple[dict[Coords, object], int]:
    """Run `fetch(lat, lng)` once per distinct location.

    With `cache_prefix`, results are read from / written to Redis under
    f"{cache_prefix}:{lat},{lng}" for `cache_ttl` seconds, so a repeated search (or a listing
    seen again) costs no API calls. Returns ({coord_key: value}, failures). A failed lookup is
    absent from the dict, so the caller reports it as unknown rather than as a measured zero.
    """
    keys = list({k for l in listings if (k := coord_key(l)) is not None})
    results: dict[Coords, object] = {}

    def cache_name(key: Coords) -> str:
        return f"{cache_prefix}:{key[0]},{key[1]}"

    if cache_prefix:
        cached = await get_json_many([cache_name(k) for k in keys])
        for key in keys:
            if cache_name(key) in cached:
                results[key] = cached[cache_name(key)]
    todo = [k for k in keys if k not in results]
    log.info(f"{label}_lookup", locations=len(keys), cached=len(keys) - len(todo), to_fetch=len(todo))

    sem = asyncio.Semaphore(concurrency)
    failures = 0
    fresh: dict[str, object] = {}

    async def _one(key: Coords) -> None:
        nonlocal failures
        async with sem:
            try:
                value = await fetch(*key)
            except Exception as e:
                failures += 1
                log.warning(f"{label}_lookup_failed", lat=key[0], lng=key[1], error=str(e))
                return
        results[key] = value
        fresh[cache_name(key)] = value

    await asyncio.gather(*[_one(k) for k in todo])
    if cache_prefix:
        await set_json_many(fresh, cache_ttl)
    return results, failures


OSM_NOTE = (
    "Данные 2GIS недоступны: конкуренты, трафик и остановки оценены по OpenStreetMap "
    "(там данных меньше, чем в 2GIS)"
)


async def fill_from_osm(
    listings: list[dict],
    results: dict[Coords, object],
    measure: Callable[[dict, float, float], object],
) -> int:
    """Fill locations that 2GIS could not measure from the OSM city data.

    `measure(pois, lat, lng)` returns the value for one location. Only locations still missing
    from `results` are touched, and OSM is only loaded when there are any. Returns how many
    locations were filled.
    """
    from app.integrations.osm_city import get_city_pois

    missing = {k for l in listings if (k := coord_key(l)) is not None and k not in results}
    if not missing:
        return 0
    pois = await get_city_pois()
    if not pois:
        return 0
    for key in missing:
        results[key] = measure(pois, *key)
    log.info("osm_fallback_used", locations=len(missing))
    return len(missing)
