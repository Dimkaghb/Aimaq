"""Heatmap data endpoints — real geo-spatial data for map overlays.

Layers:
  - transit: ALL bus stops in Almaty (OSM Overpass bbox) + metro stations
  - footfall: foot-traffic POIs from OSM (schools, malls, parks, markets, etc.)
  - competitors: competitor density from enriched_listings (2GIS-sourced)
"""

import time

import structlog
from fastapi import APIRouter, Query

from app.db.client import get_db
from app.integrations.osm import OSMClient
from app.services.scoring import METRO_STATIONS

log = structlog.get_logger()
router = APIRouter()

# ── In-memory cache with TTL ─────────────────────────────────────────────────

_cache: dict[str, dict] = {}
CACHE_TTL = 900  # 15 minutes — OSM data is stable

# Almaty bounding box (south, west, north, east)
ALMATY_SOUTH, ALMATY_WEST = 43.15, 76.75
ALMATY_NORTH, ALMATY_EAST = 43.35, 77.15


def _get_cached(key: str) -> list[dict] | None:
    entry = _cache.get(key)
    if entry and (time.monotonic() - entry["ts"]) < CACHE_TTL:
        return entry["data"]
    return None


def _set_cached(key: str, data: list[dict]) -> None:
    _cache[key] = {"data": data, "ts": time.monotonic()}


# ── Route ─────────────────────────────────────────────────────────────────────


@router.get("/heatmap", status_code=200)
async def get_heatmap(
    layer: str = Query(..., pattern=r"^(transit|footfall|competitors)$"),
    business_type: str | None = None,
) -> dict:
    """Return heatmap point data for a given layer.

    Each point has {lat, lng, intensity} where intensity is 0–1.
    """
    cache_key = f"{layer}:{business_type or ''}"
    cached = _get_cached(cache_key)
    if cached is not None:
        log.debug("heatmap_cache_hit", layer=layer, count=len(cached))
        return {"layer": layer, "count": len(cached), "points": cached}

    if layer == "transit":
        points = await _fetch_transit_points()
    elif layer == "footfall":
        points = await _fetch_footfall_points()
    else:
        points = await _fetch_competitor_points(business_type)

    _set_cached(cache_key, points)
    return {"layer": layer, "count": len(points), "points": points}


# ── Transit: OSM bus stops (bbox) + metro stations ────────────────────────────


async def _fetch_transit_points() -> list[dict]:
    points: list[dict] = []

    # Metro stations — high intensity
    for station in METRO_STATIONS:
        points.append({
            "lat": station["lat"],
            "lng": station["lng"],
            "intensity": 1.0,
        })

    # All bus stops in Almaty via Overpass bbox query
    query = f"""
[out:json][timeout:30];
(
  node["highway"="bus_stop"]({ALMATY_SOUTH},{ALMATY_WEST},{ALMATY_NORTH},{ALMATY_EAST});
  node["railway"="tram_stop"]({ALMATY_SOUTH},{ALMATY_WEST},{ALMATY_NORTH},{ALMATY_EAST});
);
out body;
"""
    async with OSMClient() as osm:
        try:
            elements = await osm._query(query)
            for el in elements:
                lat = el.get("lat")
                lng = el.get("lon")
                if lat is not None and lng is not None:
                    points.append({"lat": lat, "lng": lng, "intensity": 0.5})
            log.info(
                "heatmap_transit_fetched",
                bus_stops=len(elements),
                metro_stations=len(METRO_STATIONS),
                total=len(points),
            )
        except Exception as e:
            log.error("heatmap_transit_osm_failed", error=str(e))

    return points


# ── Footfall: POIs that generate foot traffic (OSM) + enriched data ───────────


async def _fetch_footfall_points() -> list[dict]:
    points: list[dict] = []

    # 1. Query OSM for foot-traffic-generating POIs across Almaty
    query = f"""
[out:json][timeout:30];
(
  node["amenity"~"school|university|college|hospital|clinic|marketplace|cinema|theatre|library"]
    ({ALMATY_SOUTH},{ALMATY_WEST},{ALMATY_NORTH},{ALMATY_EAST});
  node["shop"~"mall|supermarket|department_store|convenience"]
    ({ALMATY_SOUTH},{ALMATY_WEST},{ALMATY_NORTH},{ALMATY_EAST});
  node["leisure"~"park|playground|sports_centre|fitness_centre|stadium"]
    ({ALMATY_SOUTH},{ALMATY_WEST},{ALMATY_NORTH},{ALMATY_EAST});
  node["tourism"~"museum|attraction|hotel"]
    ({ALMATY_SOUTH},{ALMATY_WEST},{ALMATY_NORTH},{ALMATY_EAST});
);
out body;
"""
    # Intensity weights by POI type
    high_traffic = {"mall", "supermarket", "department_store", "university", "hospital", "stadium"}
    mid_traffic = {
        "school", "college", "cinema", "theatre", "marketplace",
        "sports_centre", "fitness_centre", "hotel",
    }

    async with OSMClient() as osm:
        try:
            elements = await osm._query(query)
            for el in elements:
                lat = el.get("lat")
                lng = el.get("lon")
                if lat is None or lng is None:
                    continue

                tags = el.get("tags", {})
                # Determine intensity based on POI type
                all_values = set()
                for key in ("amenity", "shop", "leisure", "tourism"):
                    val = tags.get(key, "")
                    if val:
                        all_values.add(val)

                if all_values & high_traffic:
                    intensity = 0.9
                elif all_values & mid_traffic:
                    intensity = 0.6
                else:
                    intensity = 0.4

                points.append({"lat": lat, "lng": lng, "intensity": intensity})

            log.info("heatmap_footfall_osm", pois=len(elements))
        except Exception as e:
            log.error("heatmap_footfall_osm_failed", error=str(e))

    # 2. Supplement with enriched listings footfall data
    try:
        db = await get_db()
        result = await (
            db.table("enriched_listings")
            .select("footfall_raw, listings(lat, lng)")
            .execute()
        )
        rows = result.data or []
        max_footfall = max((r.get("footfall_raw", 0) for r in rows), default=100) or 100

        for row in rows:
            listing = row.get("listings") or {}
            lat = listing.get("lat")
            lng = listing.get("lng")
            raw = row.get("footfall_raw", 0)
            if lat and lng:
                points.append({
                    "lat": lat,
                    "lng": lng,
                    "intensity": round(raw / max_footfall, 3),
                })
        log.info("heatmap_footfall_enriched", enriched_count=len(rows))
    except Exception as e:
        log.error("heatmap_footfall_db_failed", error=str(e))

    log.info("heatmap_footfall_total", total=len(points))
    return points


# ── Competitors: enriched listings with competitor_count ──────────────────────


async def _fetch_competitor_points(business_type: str | None) -> list[dict]:
    db = await get_db()

    result = await (
        db.table("enriched_listings")
        .select("competitor_count, listings(lat, lng)")
        .execute()
    )
    rows = result.data or []

    points: list[dict] = []
    max_count = max((r.get("competitor_count", 0) for r in rows), default=10) or 10

    for row in rows:
        listing = row.get("listings") or {}
        lat = listing.get("lat")
        lng = listing.get("lng")
        count = row.get("competitor_count", 0)
        if lat and lng and count > 0:
            points.append({
                "lat": lat,
                "lng": lng,
                "intensity": round(min(count / max_count, 1.0), 3),
            })

    log.info(
        "heatmap_competitors_fetched",
        points=len(points),
        business_type=business_type,
    )
    return points
