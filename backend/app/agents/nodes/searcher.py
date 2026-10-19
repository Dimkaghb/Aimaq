import asyncio
import re
import statistics
import time
from datetime import datetime, timedelta, timezone

import structlog

from app.agents.state import PipelineState
from app.db.queries import (
    get_recent_listings,
    update_pipeline_step,
    upsert_listings_returning,
)
from app.models.listing import ListingUpsert
from app.services.cache import get_marker, set_marker
from app.services.districts import assign_districts
from app.services.geocode import geocode_missing
from app.services.scoring import IDEAL_AREA, compute_area_score, compute_price_score

log = structlog.get_logger()

# Krisha use-case feeds worth crawling per business type. "free" (1) is generic space that
# fits any business, so it is always included, but only its newest pages (see MAX_PAGES).
BUSINESS_TO_KRISHA_TYPES: dict[str, list[int]] = {
    "fastfood": [6, 1],    # Общепит + Свободное назначение
    "cafe": [6, 1],
    "office": [2, 1],      # Офисы + Свободное назначение
    "retail": [3, 1],      # Магазины + Свободное назначение
    "pharmacy": [11, 1],   # Медцентры/аптеки + Свободное назначение
}

# The use-case tag (see krisha.USE_CASE_PATTERNS) that makes a listing an exact fit.
WANTED_USE_CASE: dict[str, str] = {
    "fastfood": "cafe", "cafe": "cafe", "office": "office", "retail": "retail", "pharmacy": "pharmacy",
}

# Pages are ~20 listings each. Specific feeds are crawled completely; the generic feed is
# newest-first, so a few pages are enough and keep a search to tens of seconds.
DEFAULT_MAX_PAGES = 40
MAX_PAGES: dict[int, int] = {1: 10}

# A crawl is reused for this long; repeat searches then skip Krisha entirely. The scheduled
# crawl (app.tasks.scraping) keeps the same marker warm for longer.
CRAWL_TTL_SECONDS = 90 * 60
# If Krisha cannot be reached at all, listings seen this recently are still usable.
FALLBACK_MAX_AGE = timedelta(hours=72)
# Enrichment makes several 2GIS calls per listing, so only the most promising are enriched.
MAX_CANDIDATES = 100
# With a district chosen, a wider pool is located first, since only some of it will be inside.
DISTRICT_POOL = 250

_TYPE_LABELS: dict[int, str] = {
    1: "Свободное назначение",
    2: "Офисы",
    3: "Магазины",
    6: "Общепит",
    11: "Медцентры / аптеки",
}

# A rent per m² below this share of the market median is a placeholder or teaser price
# ("2 500 ₸ за месяц" for 188 m²), not a real rent.
SUSPECT_PRICE_RATIO = 0.25

_AREA_RE = re.compile(r"(\d+(?:[.,]\d+)?)\s*м²")
_FLOOR_RE = re.compile(r"(\d+)[\s-]*й?\s*этаж", re.IGNORECASE)


def _parse_area_from_title(title: str | None) -> float | None:
    m = _AREA_RE.search(title or "")
    return float(m.group(1).replace(",", ".")) if m else None


def _parse_floor_from_text(title: str | None, description: str | None) -> int | None:
    for text in (title, description):
        m = _FLOOR_RE.search(text or "")
        if m:
            return int(m.group(1))
    return None


def crawl_marker_key(business_type: str) -> str:
    """Redis marker for "the feeds this business type needs were crawled recently".

    Keyed by the feeds, so business types that share feeds (cafe, fastfood) share a crawl.
    Bump the version to invalidate every cached crawl after a parsing change.
    """
    feeds = sorted(BUSINESS_TO_KRISHA_TYPES.get(business_type, [1]))
    return "krisha:crawl:v3:" + "-".join(str(t) for t in feeds)


def prerank_score(listing: dict, business_type: str, search_query: dict, budget: int | None) -> float:
    """Cheap 0-100 estimate used to decide which listings are worth the paid enrichment calls.

    Only uses what the listing already tells us: use-case fit, size against the planner's
    wanted range, price against the budget, and how recently it was posted.
    """
    score = 30.0 if listing.get("use_case_fit") == "exact" else 0.0

    lr = search_query.get("location_requirements", {})
    area = listing.get("area_sqm")
    if area:
        low, high = lr.get("min_area_sqm"), lr.get("max_area_sqm")
        if low and high:
            ideal = (low + high) / 2
            fit = max(0.0, 100.0 * (1.0 - abs(area - ideal) / ideal)) if not (low <= area <= high) else 100.0
        else:
            fit = compute_area_score(area, business_type)
    else:
        fit = 50.0
    score += fit * 0.30

    price = None if listing.get("price_suspect") else listing.get("price_tenge")
    score += (compute_price_score(price, budget) if budget else 50.0) * 0.30

    posted = (listing.get("raw_data") or {}).get("posted_on")
    if posted:
        try:
            age = (datetime.now(timezone.utc).date() - datetime.fromisoformat(posted).date()).days
            score += max(0.0, 10.0 * (1.0 - age / 30.0))
        except ValueError:
            pass
    return score


def use_case_fit(listing: dict, business_type: str) -> str | None:
    """How well the space's permitted uses match the business.

    'exact'   — the listing names this use (e.g. общепит for a cafe)
    'generic' — "free use" space, fine for anything but not specifically meant for it
    None      — meant for something else (a warehouse, an office for a cafe): excluded
    """
    tags = (listing.get("raw_data") or {}).get("use_cases")
    if tags is None:  # rows stored before use-cases were parsed
        tags = [listing["property_type"]] if listing.get("property_type") else []
    if WANTED_USE_CASE.get(business_type, business_type) in tags:
        return "exact"
    return "generic" if "free" in tags else None


def flag_suspect_prices(listings: list[dict]) -> int:
    """Mark listings whose rent per m² is implausibly far below the current market.

    The listed price is left untouched (it is what the ad says); scoring ignores a suspect
    price instead of rewarding it as a bargain. Returns how many were flagged.
    """
    per_sqm = {
        l["id"] if l.get("id") else id(l): l["price_tenge"] / l["area_sqm"]
        for l in listings if l.get("price_tenge") and l.get("area_sqm")
    }
    for l in listings:
        l["price_suspect"] = False
    if len(per_sqm) < 10:  # too little data to know what "normal" is
        return 0
    floor = statistics.median(per_sqm.values()) * SUSPECT_PRICE_RATIO
    flagged = 0
    for l in listings:
        value = per_sqm.get(l["id"] if l.get("id") else id(l))
        if value is not None and value < floor:
            l["price_suspect"] = True
            flagged += 1
    return flagged


def _apply_search_query_filters(listings: list[dict], search_query: dict) -> list[dict]:
    """Apply the planner's area / floor / budget requirements.

    Lenient on purpose: a listing missing a value is kept and simply scores on what is known.
    """
    lr = search_query.get("location_requirements", {})
    prefer_floor: str | None = lr.get("floor")
    area_min = lr.get("min_area_sqm")
    area_max = lr.get("max_area_sqm")
    max_budget = lr.get("max_budget_tenge")

    filtered: list[dict] = []
    for listing in listings:
        title_lower = (listing.get("title") or "").lower()

        if prefer_floor in ("ground", "low"):
            floor = listing.get("floor") or _parse_floor_from_text(listing.get("title"), listing.get("description"))
            limit = 1 if prefer_floor == "ground" else 3
            if floor is not None and floor > limit:
                if not (prefer_floor == "ground" and ("1 этаж" in title_lower or "первый этаж" in title_lower)):
                    continue

        area = listing.get("area_sqm")
        if area_min and area_max and area is not None:
            if area < area_min * 0.5 or area > area_max * 2.0:
                continue

        price = listing.get("price_tenge")
        if max_budget and price is not None and price > max_budget * 1.5:
            continue

        filtered.append(listing)

    return filtered


async def _crawl_krisha(
    business_type: str, search_id: str, sources: list[dict]
) -> tuple[list[ListingUpsert], list[str]]:
    """Crawl the Krisha feeds for this business type. Returns (listings, errors)."""
    from app.scrapers.krisha import PROPERTY_TYPE_MAP, KrishaScraper

    type_ids = BUSINESS_TO_KRISHA_TYPES.get(business_type, [1])
    collected: dict[str, dict] = {}
    errors: list[str] = []

    async with KrishaScraper() as scraper:
        for idx, type_id in enumerate(type_ids):
            sources[idx]["status"] = "active"
            try:
                await update_pipeline_step(search_id, "fetching", {"sources": sources})
            except Exception:
                pass
            try:
                found = await scraper._fetch_type(
                    type_id, PROPERTY_TYPE_MAP.get(type_id, "free"),
                    max_pages=MAX_PAGES.get(type_id, DEFAULT_MAX_PAGES),
                )
                for item in found:
                    collected.setdefault(item["external_id"], item)
                sources[idx].update(status="done", count=len(found))
                log.info("searcher_crawled_feed", type_id=type_id, count=len(found))
            except Exception as e:
                sources[idx]["status"] = "error"
                errors.append(f"krisha feed {type_id}: {e}")
                log.error("searcher_crawl_feed_failed", type_id=type_id, error=str(e))

    if not collected and errors:
        raise RuntimeError("; ".join(errors))
    return [ListingUpsert(**item) for item in collected.values()], errors


async def _load_candidates(
    business_type: str, search_id: str, sources: list[dict], errors: list[str]
) -> list[dict]:
    """Current Krisha listings as stored rows (with database ids).

    Fresh crawl when the last one is older than CRAWL_TTL_SECONDS, otherwise the rows that
    crawl stored. If Krisha is unreachable, recently seen rows are used and the user is told.
    """
    marker_key = crawl_marker_key(business_type)
    marker = await get_marker(marker_key)
    if marker is not None:
        rows = await get_recent_listings((marker - timedelta(minutes=15)).isoformat())
        if rows:
            for source in sources[:-1]:
                source.update(status="done", count=0, cached=True)
            log.info("searcher_crawl_cache_hit", business_type=business_type, rows=len(rows))
            return rows

    try:
        fresh, crawl_errors = await _crawl_krisha(business_type, search_id, sources)
        errors.extend(crawl_errors)
        stored = await upsert_listings_returning(fresh)
        await set_marker(marker_key, CRAWL_TTL_SECONDS)
        return stored
    except Exception as e:
        log.error("searcher_crawl_failed", error=str(e))
        since = (datetime.now(timezone.utc) - FALLBACK_MAX_AGE).isoformat()
        rows = await get_recent_listings(since)
        if rows:
            errors.append("Krisha временно недоступен — использованы объявления, найденные за последние 3 дня")
        else:
            errors.append(f"searcher_node: Krisha недоступен и сохранённых объявлений нет — {e}")
        return rows


async def _save_coordinates(listings: list[dict]) -> None:
    """Persist coordinates (and any district learned) so each address is geocoded once."""
    if not listings:
        return
    from app.db.client import get_db

    db = await get_db()
    sem = asyncio.Semaphore(8)

    async def _one(listing: dict) -> None:
        async with sem:
            update = {"lat": listing["lat"], "lng": listing["lng"]}
            if listing.get("district"):
                update["district"] = listing["district"]
            try:
                await db.table("listings").update(update).eq("id", listing["id"]).execute()
            except Exception as e:
                log.warning("searcher_coord_save_failed", listing_id=listing.get("id"), error=str(e))

    await asyncio.gather(*[_one(l) for l in listings])


async def searcher_node(state: PipelineState) -> dict:
    """LangGraph node: find current Krisha listings that fit the business.

    1. Get the current listings (fresh crawl, or the stored result of one from the last 30 min)
    2. Keep only listings whose permitted uses fit this business
    3. Apply district / planner area, floor and budget requirements
    4. Pre-rank and cap the candidates that will be enriched
    5. Resolve coordinates for the candidates via 2GIS and store them
    """
    search_id = state["search_id"]
    try:
        await update_pipeline_step(search_id, "fetching")
    except Exception:
        pass
    t0 = time.monotonic()
    errors: list[str] = []
    business_type = state["business_type"]
    district = state.get("district")
    search_query = state.get("search_query") or {}

    type_ids = BUSINESS_TO_KRISHA_TYPES.get(business_type, [1])
    sources = [
        {"id": f"krisha_{tid}", "label": f"Krisha.kz — {_TYPE_LABELS.get(tid, 'Тип ' + str(tid))}", "status": "pending", "count": 0}
        for tid in type_ids
    ] + [{"id": "database", "label": "База данных", "status": "pending", "count": 0}]

    try:
        listings = await _load_candidates(business_type, search_id, sources, errors)
    except Exception as e:
        errors.append(f"searcher_node: loading listings failed — {e}")
        log.error("searcher_load_failed", error=str(e))
        listings = []
    available = len(listings)

    for listing in listings:
        if listing.get("area_sqm") is None:
            listing["area_sqm"] = _parse_area_from_title(listing.get("title"))
    suspect = flag_suspect_prices(listings)

    # --- Relevance: drop spaces meant for something else ---
    for listing in listings:
        listing["use_case_fit"] = use_case_fit(listing, business_type)
    listings = [l for l in listings if l["use_case_fit"]]

    if search_query:
        listings = _apply_search_query_filters(listings, search_query)

    area_min = state.get("area_sqm_min")
    if area_min:
        listings = [l for l in listings if l.get("area_sqm") is None or l["area_sqm"] >= area_min]

    # --- Pre-rank on what the listing already tells us, and take the pool to locate ---
    budget = state.get("budget_tenge")
    for listing in listings:
        listing["prerank"] = prerank_score(listing, business_type, search_query, budget)
    listings = [l for l in listings if l.get("id")]
    listings.sort(key=lambda l: l["prerank"], reverse=True)
    pool = listings[: DISTRICT_POOL if district else MAX_CANDIDATES]

    # --- Coordinates (2GIS geocoder, OSM fallback), then districts from OSM boundaries ---
    needs_geo = [l for l in pool if l.get("lat") is None or l.get("lng") is None]
    try:
        await geocode_missing(needs_geo)
    except Exception as e:
        errors.append(f"searcher_node: geocoding failed — {e}")
        log.error("searcher_geocode_failed", error=str(e))
    try:
        newly_districted = await assign_districts(pool)
    except Exception as e:
        newly_districted = []
        log.error("searcher_district_assign_failed", error=str(e))
    geo_ids = {l["id"] for l in needs_geo}
    await _save_coordinates(
        [l for l in pool if l["id"] in geo_ids and l.get("lat") is not None]
        + [l for l in newly_districted if l["id"] not in geo_ids]
    )

    # --- District: a listing in the other district is out; one we could not locate stays ---
    if district:
        located = sum(1 for l in pool if l.get("district") == district)
        pool = [l for l in pool if l.get("district") in (None, district)]
        log.info("searcher_district_filter", district=district, in_district=located, unlocated=sum(1 for l in pool if not l.get("district")), kept=len(pool))
    listings = pool[:MAX_CANDIDATES]

    sources[-1].update(status="done", count=len(listings))
    try:
        await update_pipeline_step(search_id, "fetching", {"sources": sources})
    except Exception:
        pass

    log.info(
        "searcher_node_done",
        available=available,
        suspect_prices=suspect,
        candidates=len(listings),
        exact=sum(1 for l in listings if l["use_case_fit"] == "exact"),
        with_coords=sum(1 for l in listings if l.get("lat") and l.get("lng")),
        errors=len(errors),
        duration_ms=round((time.monotonic() - t0) * 1000),
    )

    return {"raw_listings": listings, "available_count": available, "errors": errors}
