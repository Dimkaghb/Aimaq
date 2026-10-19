"""Which Taraz district a point is in, from OpenStreetMap's boundary polygons.

Krisha cards never name the district. OSM has both district boundaries, so one lookup
(cached for a month) gives every geocoded listing an exact district with a local
point-in-polygon test, and the boundaries are real data, not guesses.
"""
import asyncio

import httpx
import structlog

from app.city import CITY_NAME, DISTRICTS
from app.services.cache import get_json_many, set_json_many

log = structlog.get_logger()

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "aimaq-location-search/0.1"
CACHE_KEY = "osm:district-polygons:v1"
CACHE_TTL = 30 * 24 * 3600

# Names OSM uses for the two districts (Kazakh), keyed by our canonical id.
QUERY_NAMES = {"Aulieata": "Әулиеата ауданы", "ZhibekZholy": "Жібек жолы ауданы"}

# {district_id: [ring, ...]} where ring = [[lng, lat], ...]; the first ring is the outline,
# the rest are holes.
Polygons = dict[str, list[list[list[float]]]]

_memo: Polygons | None = None


def _ring_contains(ring: list[list[float]], lat: float, lng: float) -> bool:
    """Ray casting: is the point inside the ring?"""
    inside = False
    j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i]
        xj, yj = ring[j]
        if (yi > lat) != (yj > lat) and lng < (xj - xi) * (lat - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside


def polygon_contains(rings: list[list[list[float]]], lat: float, lng: float) -> bool:
    return bool(rings) and _ring_contains(rings[0], lat, lng) and not any(_ring_contains(h, lat, lng) for h in rings[1:])


def district_for_point(polygons: Polygons, lat: float, lng: float) -> str | None:
    for district, rings in polygons.items():
        if polygon_contains(rings, lat, lng):
            return district
    return None


def _outline(geojson: dict) -> list[list[list[float]]]:
    """Rings of the largest polygon in a Polygon / MultiPolygon geometry."""
    if geojson.get("type") == "Polygon":
        return geojson["coordinates"]
    if geojson.get("type") == "MultiPolygon":
        return max(geojson["coordinates"], key=lambda poly: len(poly[0]))
    return []


async def _fetch_polygons() -> Polygons:
    polygons: Polygons = {}
    async with httpx.AsyncClient(timeout=30, headers={"User-Agent": USER_AGENT}) as client:
        for district, name in QUERY_NAMES.items():
            resp = await client.get(NOMINATIM_URL, params={
                "q": f"{name}, {CITY_NAME}", "format": "json", "limit": 3,
                "polygon_geojson": 1, "countrycodes": "kz",
            })
            resp.raise_for_status()
            hit = next((h for h in resp.json() if h.get("class") == "boundary" and h.get("geojson")), None)
            rings = _outline(hit["geojson"]) if hit else []
            if rings:
                polygons[district] = rings
            await asyncio.sleep(1.1)  # Nominatim policy: one request per second
    return polygons


async def get_district_polygons() -> Polygons:
    """District outlines (process memo -> Redis -> OSM). Empty if they cannot be loaded."""
    global _memo
    if _memo:
        return _memo
    cached = (await get_json_many([CACHE_KEY])).get(CACHE_KEY)
    if cached:
        _memo = cached
        return _memo
    try:
        polygons = await _fetch_polygons()
    except Exception as e:
        log.warning("district_polygons_unavailable", error=str(e))
        return {}
    if set(polygons) == set(DISTRICTS):  # only keep a complete set
        _memo = polygons
        await set_json_many({CACHE_KEY: polygons}, CACHE_TTL)
        log.info("district_polygons_loaded", districts=list(polygons))
    return polygons


async def assign_districts(listings: list[dict]) -> list[dict]:
    """Set `district` on located listings that lack one. Returns the listings changed."""
    candidates = [l for l in listings if not l.get("district") and l.get("lat") is not None and l.get("lng") is not None]
    if not candidates:
        return []
    polygons = await get_district_polygons()
    changed: list[dict] = []
    for listing in candidates:
        district = district_for_point(polygons, listing["lat"], listing["lng"]) if polygons else None
        if district:
            listing["district"] = district
            changed.append(listing)
    log.info("districts_assigned", candidates=len(candidates), assigned=len(changed))
    return changed
