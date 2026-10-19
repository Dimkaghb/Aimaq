import asyncio

import structlog
from celery import Celery
from celery.schedules import crontab

from app.city import CITY_ID
from app.config import settings

log = structlog.get_logger()

# How long a scheduled crawl keeps searches on the cache: a little longer than the interval,
# so there is no gap between runs.
WARM_CACHE_TTL_SECONDS = int(3.5 * 3600)

celery = Celery("locationiq", broker=settings.celery_broker_url)

celery.conf.beat_schedule = {
    "scrape-krisha-every-3h": {
        "task": "app.tasks.scraping.scrape_krisha",
        "schedule": crontab(minute=0, hour="*/3"),
    },
}
# IANA timezone also used by Taraz; there is no Asia/Taraz identifier.
celery.conf.timezone = "Asia/Almaty"


async def _run_krisha_scrape() -> int:
    """Crawl every Krisha rental feed for Taraz, store it, and geocode new addresses."""
    from app.db.queries import upsert_listings_returning
    from app.models.listing import ListingUpsert
    log.info("krisha_scrape_started")
    from app.scrapers.krisha import KrishaScraper

    async with KrishaScraper() as scraper:
        raw_listings = await scraper.fetch_commercial_listings()

    valid_listings: list[ListingUpsert] = []
    for raw in raw_listings:
        try:
            valid_listings.append(ListingUpsert(**raw))
        except Exception as e:
            log.warning("listing_validation_failed", error=str(e), raw=raw.get("external_id"))

    if not valid_listings:
        log.warning("krisha_scrape_no_valid_listings")
        return 0

    stored = await upsert_listings_returning(valid_listings)
    log.info("krisha_scrape_complete", stored=len(stored), valid=len(valid_listings))

    # Coordinates come from the 2GIS geocoder, not from Krisha detail pages (rate-limited).
    await _store_coordinates(stored)
    await _warm_search_cache()
    return len(stored)


async def _warm_search_cache() -> None:
    """Tell searches that every feed was just crawled, so they skip the slow live crawl."""
    from app.agents.nodes.searcher import BUSINESS_TO_KRISHA_TYPES, crawl_marker_key
    from app.services.cache import set_marker

    for business_type in BUSINESS_TO_KRISHA_TYPES:
        await set_marker(crawl_marker_key(business_type), WARM_CACHE_TTL_SECONDS)
    log.info("krisha_search_cache_warmed", ttl_s=WARM_CACHE_TTL_SECONDS)

    # Also load the OpenStreetMap city data (the fallback when 2GIS Places is unavailable),
    # so the first search that needs it does not wait for the download.
    from app.integrations.osm_city import get_city_pois

    await get_city_pois()


async def _store_coordinates(rows: list[dict]) -> None:
    """Geocode stored listings that have no coordinates yet and save them."""
    from app.db.client import get_db
    from app.services.districts import assign_districts
    from app.services.geocode import geocode_missing

    missing = [r for r in rows if r.get("lat") is None or r.get("lng") is None]
    resolved = await geocode_missing(missing, limit=len(missing), fallback_budget=len(missing) * 1.2)
    newly_districted = await assign_districts(rows)

    # Write only what changed in this run.
    geocoded_ids = {r["id"] for r in missing}
    to_save = [r for r in missing if r.get("lat") is not None]
    to_save += [r for r in newly_districted if r["id"] not in geocoded_ids]
    db = await get_db()
    for row in to_save:
        update = {"lat": row["lat"], "lng": row["lng"]}
        if row.get("district"):
            update["district"] = row["district"]
        await db.table("listings").update(update).eq("id", row["id"]).execute()
    log.info("krisha_coords_stored", missing=len(missing), resolved=resolved, saved=len(to_save))


@celery.task(bind=True, max_retries=2)
def scrape_krisha(self) -> int:
    """Celery task: scrape Krisha.kz commercial listings."""
    try:
        count = asyncio.run(_run_krisha_scrape())
        return count
    except Exception as exc:
        log.error("krisha_scrape_task_failed", error=str(exc))
        raise self.retry(exc=exc, countdown=30)
