import time

import structlog

from app.agents.nodes._geo import OSM_NOTE, coord_key, fill_from_osm, lookup_by_location
from app.integrations.osm_city import count_within
from app.agents.state import PipelineState
from app.db.queries import update_pipeline_step

log = structlog.get_logger()

CONCURRENCY = 10
STOP_RADIUS_M = 300
CACHE_TTL = 7 * 24 * 3600  # stops rarely move


async def transit_node(state: PipelineState) -> dict:
    """Count public-transport stops within walking distance of each listing (2GIS).

    bus_stops_nearby is None when it could not be measured; unknown is not zero.
    Taraz has no metro, so the metro fields stay null for API compatibility.
    """
    try:
        await update_pipeline_step(state["search_id"], "enriching")
    except Exception:
        pass
    t0 = time.monotonic()
    errors: list[str] = []

    from app.integrations.gis2 import TwoGISClient

    listings = state["raw_listings"]

    async with TwoGISClient() as client:
        async def _stops(lat: float, lng: float) -> int:
            return await client.count_transit_stops(lat, lng, STOP_RADIUS_M)

        stops, failed = await lookup_by_location(
            listings, _stops, CONCURRENCY, "transit",
            cache_prefix=f"2gis:stops:{STOP_RADIUS_M}", cache_ttl=CACHE_TTL,
        )
        fatal = client.fatal_error

    measured_by_2gis = set(stops)
    from_osm = await fill_from_osm(
        listings, stops, lambda pois, lat, lng: count_within(pois.get("bus_stop", []), lat, lng, STOP_RADIUS_M)
    )
    if from_osm:
        errors.append(OSM_NOTE)
    elif fatal:
        errors.append(f"transit_node: {fatal}")

    results = [
        {
            "listing_id": l.get("id"),
            "bus_stops_nearby": stops.get(coord_key(l)),
            "transit_source": "osm" if coord_key(l) not in measured_by_2gis and coord_key(l) in stops else "2gis",
            "metro_distance_m": None,
            "nearest_metro_name": None,
        }
        for l in listings
    ]
    if failed and not fatal and not from_osm:
        errors.append(f"transit_node: {failed} lookups failed")

    log.debug(
        "transit_node_done",
        listings=len(results),
        unknown=sum(1 for r in results if r["bus_stops_nearby"] is None),
        duration_ms=round((time.monotonic() - t0) * 1000),
    )
    return {"transit_results": results, "errors": errors}
