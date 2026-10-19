import time

import structlog

from app.agents.nodes._geo import OSM_NOTE, coord_key, fill_from_osm, lookup_by_location
from app.integrations.osm_city import COMPETITOR_CATEGORY, count_within
from app.agents.state import PipelineState
from app.db.queries import update_pipeline_step

log = structlog.get_logger()

CONCURRENCY = 10
CACHE_TTL = 3 * 24 * 3600


async def competitor_node(state: PipelineState) -> dict:
    """Count competitors near each listing via 2GIS.

    Uses the planner's competitor queries and radius when it provided them.
    Returns competitor_results: [{listing_id, competitor_count}, ...] where competitor_count
    is None when it could not be measured (no coordinates, or 2GIS failed). Unknown is not zero.
    """
    try:
        await update_pipeline_step(state["search_id"], "enriching")
    except Exception:
        pass
    t0 = time.monotonic()
    errors: list[str] = []

    search_query = state.get("search_query") or {}
    cc = search_query.get("competitive_context", {})
    competitor_queries: list[str] = cc.get("competitor_search_queries", [])
    query_override: str | None = " ".join(competitor_queries) if competitor_queries else None
    radius = cc.get("competitor_radius_m") or 500

    from app.integrations.gis2 import TwoGISClient

    business_type = state["business_type"]
    listings = state["raw_listings"]

    async with TwoGISClient() as client:
        async def _count(lat: float, lng: float) -> int:
            if query_override:
                return await client.search_nearby_total(lat, lng, query_override, radius)
            return await client.count_competitors(lat, lng, business_type, radius)

        what = query_override or business_type
        counts, failed = await lookup_by_location(
            listings, _count, CONCURRENCY, "competitor",
            cache_prefix=f"2gis:competitors:{what}:{radius}", cache_ttl=CACHE_TTL,
        )
        fatal = client.fatal_error

    # Whatever 2GIS could not measure falls back to OpenStreetMap, counted locally.
    category = COMPETITOR_CATEGORY.get(business_type, "food")
    measured_by_2gis = set(counts)
    from_osm = await fill_from_osm(
        listings, counts, lambda pois, lat, lng: count_within(pois.get(category, []), lat, lng, radius)
    )
    if from_osm:
        errors.append(OSM_NOTE)
    elif fatal:
        errors.append(f"competitor_node: {fatal}")

    results = [
        {
            "listing_id": l.get("id"),
            "competitor_count": counts.get(coord_key(l)),
            "competitor_source": "osm" if coord_key(l) not in measured_by_2gis and coord_key(l) in counts else "2gis",
        }
        for l in listings
    ]
    if failed and not fatal and not from_osm:
        errors.append(f"competitor_node: {failed} lookups failed")

    log.debug(
        "competitor_node_done",
        listings=len(results),
        unknown=sum(1 for r in results if r["competitor_count"] is None),
        radius=radius,
        duration_ms=round((time.monotonic() - t0) * 1000),
    )
    return {"competitor_results": results, "errors": errors}
