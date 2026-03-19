"""Manual scraper runner — use to populate initial data.

Usage: python -m scripts.run_scraper
"""

import asyncio
import sys

import structlog

structlog.configure(
    processors=[
        structlog.stdlib.add_log_level,
        structlog.dev.ConsoleRenderer(),
    ],
)

log = structlog.get_logger()


async def main() -> None:
    from app.db.queries import get_listings_count, upsert_listings_batch
    from app.models.listing import ListingUpsert
    from app.scrapers.krisha import KrishaScraper

    scraper = KrishaScraper()
    log.info("starting_manual_scrape")

    raw_listings = await scraper.fetch_commercial_listings()
    log.info("raw_listings_fetched", count=len(raw_listings))

    valid_listings: list[ListingUpsert] = []
    for raw in raw_listings:
        try:
            valid_listings.append(ListingUpsert(**raw))
        except Exception as e:
            log.warning("validation_failed", error=str(e))

    log.info("valid_listings", count=len(valid_listings))

    if valid_listings:
        count = await upsert_listings_batch(valid_listings)
        log.info("upserted_to_db", count=count)

    total = await get_listings_count()
    log.info("total_listings_in_db", count=total)


if __name__ == "__main__":
    asyncio.run(main())
