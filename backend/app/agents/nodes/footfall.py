import asyncio
import time

import structlog

from app.agents.nodes._geo import OSM_NOTE, coord_key, fill_from_osm, lookup_by_location
from app.integrations.osm_city import count_within
from app.services.scoring import OSM_CONFIDENCE
from app.agents.state import PipelineState
from app.db.queries import update_pipeline_step
from app.services.scoring import DISTRICT_FOOTFALL

log = structlog.get_logger()

# Default anchor POI queries when no planner hints provided
_DEFAULT_ANCHOR_POIS = ["парк", "торговый центр", "университет", "школа"]

# Radius for anchor POI density search
_ANCHOR_RADIUS = 300

# Queries per listing, and the anchor count that is treated as "fully busy" (score 100).
_MAX_ANCHOR_QUERIES = 2

# Locations looked up at once (each fires up to _MAX_ANCHOR_QUERIES requests).
CONCURRENCY = 8
CACHE_TTL = 3 * 24 * 3600
_ANCHOR_SATURATION = 20
_OSM_ANCHOR_SATURATION = 6  # OSM has far fewer places than 2GIS for the same area


async def _count_anchor_pois(client: object, lat: float, lng: float, anchor_pois: list[str]) -> int:
    """Total anchor places (parks, offices, schools...) within the radius, summed over queries.

    Uses 2GIS `total`, not the page length: the API returns at most 10 items per page, which
    made every busy location look identical.
    """
    totals = await asyncio.gather(*[
        client.search_nearby_total(lat, lng, poi_query, _ANCHOR_RADIUS)
        for poi_query in anchor_pois[:_MAX_ANCHOR_QUERIES]
    ])
    return sum(totals)


async def footfall_node(state: PipelineState) -> dict:
    """Compute footfall_raw for each listing.

    - District baseline (DISTRICT_FOOTFALL) accounts for 40% of the score
    - Anchor density within 300 m (2GIS) accounts for 60%
    footfall_raw is None when it could not be measured (no coordinates, or 2GIS failed).

    Returns footfall_results: [{listing_id, footfall_raw}, ...]
    """
    try:
        await update_pipeline_step(state["search_id"], "enriching")
    except Exception:
        pass
    t0 = time.monotonic()
    errors: list[str] = []

    search_query = state.get("search_query") or {}
    scoring_hints = search_query.get("scoring_hints", {})
    anchor_pois: list[str] = scoring_hints.get("footfall_anchor_pois") or _DEFAULT_ANCHOR_POIS
    listings = state["raw_listings"]

    from app.integrations.gis2 import TwoGISClient

    async with TwoGISClient() as client:
        async def _anchors(lat: float, lng: float) -> int:
            return await _count_anchor_pois(client, lat, lng, anchor_pois)

        anchors = anchor_pois[:_MAX_ANCHOR_QUERIES]
        anchor_counts, failed = await lookup_by_location(
            listings, _anchors, CONCURRENCY, "footfall",
            cache_prefix=f"2gis:anchors:{'|'.join(anchors)}:{_ANCHOR_RADIUS}", cache_ttl=CACHE_TTL,
        )
        fatal = client.fatal_error

    # Fallback: places that draw foot traffic (schools, offices, parks, malls...) from OSM.
    merged = dict(anchor_counts)  # what 2GIS measured; OSM only fills the gaps
    from_osm = await fill_from_osm(
        listings, merged, lambda pois, lat, lng: count_within(pois.get("anchors", []), lat, lng, _ANCHOR_RADIUS)
    )
    osm_counts = {k: v for k, v in merged.items() if k not in anchor_counts}
    if from_osm:
        errors.append(OSM_NOTE)
    elif fatal:
        errors.append(f"footfall_node: {fatal}")

    results: list[dict] = []
    for listing in listings:
        key = coord_key(listing)
        count, saturation = anchor_counts.get(key), _ANCHOR_SATURATION
        if count is None and key in osm_counts:
            count, saturation = osm_counts[key], _OSM_ANCHOR_SATURATION  # OSM lists fewer places
        footfall_raw = None
        if count is not None:
            district_baseline = DISTRICT_FOOTFALL.get(listing.get("district"), 50)
            poi_score = min(count / saturation, 1.0) * 100
            footfall_raw = round(district_baseline * 0.4 + poi_score * 0.6, 1)
            if saturation == _OSM_ANCHOR_SATURATION:  # thin data: trust it half as much
                footfall_raw = round(footfall_raw * OSM_CONFIDENCE + 50.0 * (1 - OSM_CONFIDENCE), 1)
        results.append({"listing_id": listing.get("id"), "footfall_raw": footfall_raw})

    if failed and not fatal and not from_osm:
        errors.append(f"footfall_node: {failed} lookups failed")

    log.debug(
        "footfall_node_done",
        listings=len(results),
        unknown=sum(1 for r in results if r["footfall_raw"] is None),
        anchor_pois=anchor_pois,
        errors=len(errors),
        duration_ms=round((time.monotonic() - t0) * 1000),
    )

    return {
        "footfall_results": results,
        "errors": errors,
    }
