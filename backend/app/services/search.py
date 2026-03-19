import structlog

from app.db.client import get_db
from app.services.scoring import score_listings

log = structlog.get_logger()


async def fetch_enriched_listings(
    district: str | None = None,
    area_sqm_min: int | None = None,
) -> list[dict]:
    """Fetch listings joined with enrichment data, with optional filters."""
    db = await get_db()

    query = db.table("enriched_listings").select("*, listings(*)")

    result = await query.execute()
    rows = result.data or []

    # Flatten joined data
    flat: list[dict] = []
    for row in rows:
        listing = row.get("listings", {}) or {}

        # Apply filters
        if district and listing.get("district") != district:
            continue
        if area_sqm_min and (listing.get("area_sqm") or 0) < area_sqm_min:
            continue

        flat.append({
            "id": listing.get("id") or row.get("listing_id"),
            "title": listing.get("title", ""),
            "address": listing.get("address", ""),
            "district": listing.get("district"),
            "price_tenge": listing.get("price_tenge"),
            "area_sqm": listing.get("area_sqm"),
            "url": listing.get("url", ""),
            "lat": listing.get("lat"),
            "lng": listing.get("lng"),
            "footfall_raw": row.get("footfall_raw", 50),
            "competitor_count": row.get("competitor_count", 0),
            "bus_stops_nearby": row.get("bus_stops_nearby", 0),
            "metro_distance_m": row.get("metro_distance_m"),
            "nearest_metro_name": row.get("nearest_metro_name"),
        })

    return flat


async def run_search(
    business_type: str,
    district: str | None = None,
    budget_tenge: int | None = None,
    area_sqm_min: int | None = None,
    competitor_tolerance: int = 5,
    top_n: int = 5,
) -> dict:
    """Execute a search: fetch enriched listings, score, and return ranked results."""
    log.info(
        "search_started",
        business_type=business_type,
        district=district,
        budget_tenge=budget_tenge,
    )

    listings = await fetch_enriched_listings(
        district=district,
        area_sqm_min=area_sqm_min,
    )

    scored = score_listings(
        listings,
        business_type=business_type,
        budget_tenge=budget_tenge,
        competitor_tolerance=competitor_tolerance,
        top_n=top_n,
    )

    # Generate AI explanation for top results
    explanation = ""
    if scored:
        try:
            from app.agents.nodes.explainer import generate_explanation

            explanation = await generate_explanation(scored, business_type)
        except Exception as e:
            log.error("explanation_generation_failed", error=str(e))
            explanation = ""

    log.info(
        "search_complete",
        business_type=business_type,
        evaluated=len(listings),
        returned=len(scored),
        has_explanation=bool(explanation),
    )

    return {
        "business_type": business_type,
        "district": district,
        "budget_tenge": budget_tenge,
        "competitor_tolerance": competitor_tolerance,
        "total_evaluated": len(listings),
        "results": scored,
        "explanation": explanation,
    }
