import asyncio

import structlog
from celery import Celery
from celery.schedules import crontab

from app.config import settings

log = structlog.get_logger()

celery = Celery("locationiq", broker=settings.celery_broker_url)

celery.conf.beat_schedule = {
    "scrape-krisha-every-6h": {
        "task": "app.tasks.scraping.scrape_krisha",
        "schedule": crontab(minute=0, hour="*/6"),
    },
}
celery.conf.timezone = "Asia/Almaty"


async def _run_krisha_scrape() -> int:
    """Run the Krisha scraper and upsert results into the DB."""
    from app.db.queries import upsert_listings_batch
    from app.models.listing import ListingUpsert
    from app.scrapers.krisha import KrishaScraper

    scraper = KrishaScraper()
    log.info("krisha_scrape_started")

    raw_listings = await scraper.fetch_commercial_listings()

    # Convert dicts to ListingUpsert models for validation
    valid_listings: list[ListingUpsert] = []
    for raw in raw_listings:
        try:
            valid_listings.append(ListingUpsert(**raw))
        except Exception as e:
            log.warning("listing_validation_failed", error=str(e), raw=raw.get("external_id"))

    if not valid_listings:
        log.warning("krisha_scrape_no_valid_listings")
        return 0

    count = await upsert_listings_batch(valid_listings)
    log.info("krisha_scrape_complete", upserted=count, valid=len(valid_listings))

    # Fetch coordinates for listings that don't have them
    await _enrich_coordinates(scraper, raw_listings)

    return count


async def _enrich_coordinates(scraper, listings: list[dict]) -> None:
    """Fetch detail pages to get lat/lng for listings missing coordinates."""
    from app.db.client import get_db

    missing_coords = [l for l in listings if not l.get("lat") or not l.get("lng")]
    if not missing_coords:
        return

    log.info("krisha_coords_enrichment_started", count=len(missing_coords))
    enriched = 0

    for listing in missing_coords:
        external_id = listing.get("external_id")
        if not external_id:
            continue

        details = await scraper.fetch_listing_details(external_id)
        if details and details.get("lat") and details.get("lng"):
            db = await get_db()
            update_data: dict = {"lat": details["lat"], "lng": details["lng"]}
            if details.get("description"):
                update_data["description"] = details["description"]

            await (
                db.table("listings")
                .update(update_data)
                .eq("external_id", external_id)
                .eq("source", "krisha")
                .execute()
            )
            enriched += 1

    log.info("krisha_coords_enrichment_complete", enriched=enriched, total=len(missing_coords))


@celery.task(bind=True, max_retries=2)
def scrape_krisha(self) -> int:
    """Celery task: scrape Krisha.kz commercial listings."""
    try:
        count = asyncio.run(_run_krisha_scrape())
        return count
    except Exception as exc:
        log.error("krisha_scrape_task_failed", error=str(exc))
        raise self.retry(exc=exc, countdown=30)
