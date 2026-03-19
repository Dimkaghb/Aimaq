import re
import time

import structlog

from app.agents.state import PipelineState

log = structlog.get_logger()

# Pattern to extract area from title like "· 106 м²"
_AREA_RE = re.compile(r"(\d+(?:[.,]\d+)?)\s*м²")


def _parse_area_from_title(title: str | None) -> float | None:
    """Extract area in sqm from listing title if not already set."""
    if not title:
        return None
    m = _AREA_RE.search(title)
    if m:
        return float(m.group(1).replace(",", "."))
    return None


async def fetcher_node(state: PipelineState) -> dict:
    """Fetch listings from the DB that match the search criteria.

    Reads from the `listings` table (already populated by the scraper).
    Returns raw_listings for downstream enrichment nodes.
    """
    t0 = time.monotonic()
    errors: list[str] = []

    try:
        from app.db.client import get_db

        db = await get_db()
        query = db.table("listings").select("*")

        if state.get("district"):
            query = query.eq("district", state["district"])

        # Budget is a soft preference handled by scoring — not a hard filter.
        # Limit to 50 — enrichment APIs are the bottleneck.
        result = await query.limit(200).execute()
        raw_listings = result.data or []

        # Post-process: parse area_sqm from title if missing, apply area filter
        for listing in raw_listings:
            if listing.get("area_sqm") is None:
                listing["area_sqm"] = _parse_area_from_title(listing.get("title"))

        # Soft area filter — keep listings with no area data too
        area_min = state.get("area_sqm_min")
        if area_min:
            raw_listings = [
                l for l in raw_listings
                if l.get("area_sqm") is None or l["area_sqm"] >= area_min
            ]

        # Cap at 50 for enrichment speed
        raw_listings = raw_listings[:50]

    except Exception as e:
        errors.append(f"fetcher_node: DB query failed — {e}")
        raw_listings = []

    log.debug(
        "fetcher_node_done",
        listings=len(raw_listings),
        district=state.get("district"),
        errors=len(errors),
        duration_ms=round((time.monotonic() - t0) * 1000),
    )

    return {
        "raw_listings": raw_listings,
        "errors": errors,
    }
