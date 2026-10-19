"""City points of interest from OpenStreetMap: a free fallback when 2GIS Places is unavailable.

2GIS answers "how many cafes within 500 m of here" per listing, and its key has a request quota.
OpenStreetMap can't be queried per listing at that volume, but one request returns every bus
stop, cafe, shop, pharmacy, office, school and park in Taraz (~200 KB). That is cached for a week
and counted locally, so the fallback costs nothing after the first fetch.

OSM coverage is thinner than 2GIS's, so counts are lower; they rank listings against each other
correctly but are not comparable with 2GIS numbers, and the user is told which source was used.
"""
import asyncio
import weakref

import httpx
import structlog

from app.city import CITY_BOUNDS
from app.services.cache import get_json_many, set_json_many
from app.services.scoring import haversine_distance

log = structlog.get_logger()

# Tried in order; the main instance sometimes answers with an HTML error page when busy.
OVERPASS_MIRRORS = [
    "https://overpass-api.de/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
]
USER_AGENT = "aimaq-location-search/0.1"
CACHE_KEY = "osm:city-pois:v1"
CACHE_TTL = 7 * 24 * 3600

Points = list[list[float]]  # [[lat, lng], ...]
CityPois = dict[str, Points]

# Which category counts as "competitors" for each business type.
COMPETITOR_CATEGORY = {
    "cafe": "food", "fastfood": "food", "retail": "shops", "pharmacy": "pharmacies", "office": "offices",
}

_FOOD = {"cafe", "restaurant", "fast_food", "food_court"}
_ANCHOR_AMENITIES = {"school", "university", "college", "kindergarten", "hospital", "clinic", "marketplace"}


def _query() -> str:
    south, west, north, east = CITY_BOUNDS
    bbox = f"{south},{west},{north},{east}"
    amenities = "|".join(sorted(_FOOD | _ANCHOR_AMENITIES | {"pharmacy"}))
    return f"""[out:json][timeout:90];
(
 nwr["highway"="bus_stop"]({bbox});
 nwr["amenity"~"^({amenities})$"]({bbox});
 nwr["shop"]({bbox});
 nwr["office"]({bbox});
 nwr["building"="office"]({bbox});
 nwr["leisure"="park"]({bbox});
);
out center tags;"""


def categories_of(tags: dict) -> list[str]:
    """Which of our categories an OSM element belongs to (it can be in several)."""
    found: list[str] = []
    amenity = tags.get("amenity")
    if tags.get("highway") == "bus_stop":
        found.append("bus_stop")
    if amenity in _FOOD:
        found.append("food")
    if "shop" in tags:
        found.append("shops")
    if amenity == "pharmacy":
        found.append("pharmacies")
    is_office = "office" in tags or tags.get("building") == "office"
    if is_office:
        found.append("offices")
    # Places that draw people on foot: used for the footfall estimate.
    if amenity in _ANCHOR_AMENITIES or tags.get("leisure") == "park" or tags.get("shop") in {"mall", "department_store"} or is_office:
        found.append("anchors")
    return found


def parse_elements(elements: list[dict]) -> CityPois:
    pois: CityPois = {}
    for element in elements:
        point = element.get("center") or element
        if "lat" not in point or "lon" not in point:
            continue
        for category in categories_of(element.get("tags", {})):
            pois.setdefault(category, []).append([point["lat"], point["lon"]])
    return pois


def count_within(points: Points, lat: float, lng: float, radius_m: float) -> int:
    return sum(1 for p_lat, p_lng in points if haversine_distance(lat, lng, p_lat, p_lng) <= radius_m)


async def _fetch() -> CityPois | None:
    async with httpx.AsyncClient(timeout=100, headers={"User-Agent": USER_AGENT}) as client:
        for url in OVERPASS_MIRRORS:
            try:
                resp = await client.post(url, data={"data": _query()})
                resp.raise_for_status()
                pois = parse_elements(resp.json()["elements"])
            except Exception as e:
                log.warning("osm_city_fetch_failed", mirror=url, error=str(e)[:120])
                continue
            if pois:
                log.info("osm_city_loaded", mirror=url, **{k: len(v) for k, v in pois.items()})
                return pois
    return None


# The three enrichment nodes run in parallel and may all ask at once: fetch only once.
_locks: "weakref.WeakKeyDictionary[asyncio.AbstractEventLoop, asyncio.Lock]" = weakref.WeakKeyDictionary()
_memo: CityPois | None = None


async def get_city_pois() -> CityPois | None:
    """Points of interest for the city (process memo -> Redis -> Overpass), or None."""
    global _memo
    if _memo:
        return _memo
    loop = asyncio.get_running_loop()
    lock = _locks.setdefault(loop, asyncio.Lock())
    async with lock:
        if _memo:
            return _memo
        cached = (await get_json_many([CACHE_KEY])).get(CACHE_KEY)
        if cached:
            _memo = cached
            return _memo
        pois = await _fetch()
        if pois:
            _memo = pois
            await set_json_many({CACHE_KEY: pois}, CACHE_TTL)
        return pois
