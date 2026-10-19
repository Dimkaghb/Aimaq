"""Coordinates (and districts) for scraped listings.

Krisha's result cards carry only a street address. Fetching each listing page for its map
point is slow and trips Krisha's rate limit (HTTP 468), so addresses are resolved with a
geocoder instead:

1. 2GIS: fast, parallel, accurate for Taraz.
2. OpenStreetMap Nominatim: fallback when 2GIS is unavailable or has no match. Its usage
   policy allows one request per second, so it runs sequentially inside a time budget.
   Its answer names the city district, which is how listings get a district at all.

Results are saved on the listing row by the caller, so each address is resolved once.
"""
import asyncio
import time

import httpx
import structlog

from app.city import CITY_BOUNDS, CITY_NAME, DISTRICT_ALIASES, in_city_bounds
from app.integrations.gis2 import TwoGISClient

log = structlog.get_logger()

CONCURRENCY = 4
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
NOMINATIM_USER_AGENT = "aimaq-location-search/0.1"
NOMINATIM_INTERVAL = 1.1   # seconds between requests (policy: max 1/s)
NOMINATIM_BUDGET = 25.0    # seconds per search spent on the fallback


def geocode_query(listing: dict) -> str | None:
    street = (listing.get("raw_data") or {}).get("street") or listing.get("address") or ""
    street = street.strip()
    return f"{CITY_NAME}, {street}" if street else None


# Only administrative fields: a street can share a district's name (ул. Жибек жолы).
_DISTRICT_FIELDS = ("city_district", "suburb", "district", "county", "municipality", "state_district")


def district_from_address(address: dict) -> str | None:
    """Canonical district from a Nominatim `address` dict (names come in Kazakh or Russian)."""
    text = " ".join(str(address[f]) for f in _DISTRICT_FIELDS if address.get(f)).lower()
    for alias, canonical in DISTRICT_ALIASES.items():
        if alias in text:
            return canonical
    return None


async def _nominatim(client: httpx.AsyncClient, query: str) -> dict | None:
    south, west, north, east = CITY_BOUNDS
    resp = await client.get(NOMINATIM_URL, params={
        "q": query, "format": "json", "limit": 1, "addressdetails": 1,
        "countrycodes": "kz", "viewbox": f"{west},{north},{east},{south}", "bounded": 1,
    })
    resp.raise_for_status()
    hits = resp.json()
    if not hits:
        return None
    hit = hits[0]
    return {
        "lat": float(hit["lat"]),
        "lng": float(hit["lon"]),
        "district": district_from_address(hit.get("address") or {}),
    }


async def geocode_missing(
    listings: list[dict], limit: int = 300, fallback_budget: float = NOMINATIM_BUDGET
) -> int:
    """Fill lat/lng (and district when learned) in place. Returns how many were resolved."""
    todo = [l for l in listings if (l.get("lat") is None or l.get("lng") is None) and geocode_query(l)]
    todo = todo[:limit]
    if not todo:
        return 0

    sem = asyncio.Semaphore(CONCURRENCY)
    resolved = 0

    async with TwoGISClient() as client:
        async def _one(listing: dict) -> None:
            nonlocal resolved
            async with sem:
                try:
                    hit = await client.geocode(geocode_query(listing))
                except Exception as e:
                    log.warning("geocode_failed", source="2gis", external_id=listing.get("external_id"), error=str(e))
                    return
            if hit and in_city_bounds(hit["lat"], hit["lng"]):
                listing["lat"], listing["lng"] = hit["lat"], hit["lng"]
                resolved += 1

        await asyncio.gather(*[_one(l) for l in todo])
        if client.fatal_error:
            log.error("geocode_2gis_unavailable", error=str(client.fatal_error))

    by_2gis = resolved
    remaining = [l for l in todo if l.get("lat") is None]
    if remaining and fallback_budget > 0:
        deadline = time.monotonic() + fallback_budget
        async with httpx.AsyncClient(timeout=15, headers={"User-Agent": NOMINATIM_USER_AGENT}) as http:
            for listing in remaining:
                if time.monotonic() >= deadline:
                    break
                try:
                    hit = await _nominatim(http, geocode_query(listing))
                except Exception as e:
                    log.warning("geocode_failed", source="nominatim", external_id=listing.get("external_id"), error=str(e))
                    hit = None
                if hit and in_city_bounds(hit["lat"], hit["lng"]):
                    listing["lat"], listing["lng"] = hit["lat"], hit["lng"]
                    if hit["district"] and not listing.get("district"):
                        listing["district"] = hit["district"]
                    resolved += 1
                await asyncio.sleep(NOMINATIM_INTERVAL)

    log.info("geocode_done", attempted=len(todo), by_2gis=by_2gis, by_nominatim=resolved - by_2gis, unresolved=len(todo) - resolved)
    return resolved
