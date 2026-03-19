import time

import structlog

from app.agents.state import PipelineState
from app.services.scoring import nearest_metro_distance

log = structlog.get_logger()


async def transit_node(state: PipelineState) -> dict:
    """Count bus stops and compute metro proximity for each listing.

    Uses a single batched Overpass query instead of per-listing requests.
    Metro distance is computed locally from hardcoded station coordinates.
    """
    t0 = time.monotonic()
    errors: list[str] = []
    results: list[dict] = []

    from app.integrations.osm import OSMClient
    from app.services.scoring import METRO_STATIONS, haversine_distance

    # Collect valid coordinates for batch query
    listings_with_coords: list[tuple[dict, float, float]] = []
    for listing in state["raw_listings"]:
        lat = listing.get("lat")
        lng = listing.get("lng")
        if lat is not None and lng is not None:
            listings_with_coords.append((listing, lat, lng))
        else:
            results.append({
                "listing_id": listing.get("id"),
                "bus_stops_nearby": 0,
                "metro_distance_m": None,
                "nearest_metro_name": None,
            })

    # Single batch Overpass query for all bus stops
    bus_stop_counts: dict[tuple[float, float], int] = {}
    if listings_with_coords:
        coords = [(lat, lng) for _, lat, lng in listings_with_coords]
        try:
            async with OSMClient() as client:
                bus_stop_counts = await client.count_bus_stops_batch(coords, radius=300)
        except Exception as e:
            errors.append(f"transit_node: batch bus stop query failed — {e}")

    # Compute metro distance locally + assign bus stop counts
    for listing, lat, lng in listings_with_coords:
        listing_id = listing.get("id")
        bus_count = bus_stop_counts.get((lat, lng), 0)

        metro_dist = nearest_metro_distance(lat, lng)
        nearest_name = None
        if metro_dist is not None:
            min_dist = float("inf")
            for station in METRO_STATIONS:
                d = haversine_distance(lat, lng, station["lat"], station["lng"])
                if d < min_dist:
                    min_dist = d
                    nearest_name = station["name"]

        results.append({
            "listing_id": listing_id,
            "bus_stops_nearby": bus_count,
            "metro_distance_m": round(metro_dist, 1) if metro_dist else None,
            "nearest_metro_name": nearest_name,
        })

    log.debug(
        "transit_node_done",
        listings=len(results),
        errors=len(errors),
        duration_ms=round((time.monotonic() - t0) * 1000),
    )

    return {
        "transit_results": results,
        "errors": errors,
    }
