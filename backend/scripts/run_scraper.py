"""Manual crawl: the same job the scheduler runs (crawl every Krisha feed, store, geocode,
assign districts, warm the search cache).

Usage: python -m scripts.run_scraper
"""

import asyncio

import structlog

structlog.configure(
    processors=[
        structlog.stdlib.add_log_level,
        structlog.dev.ConsoleRenderer(),
    ],
)

log = structlog.get_logger()


async def main() -> None:
    from app.db.queries import get_listings_count
    from app.tasks.scraping import _run_krisha_scrape

    stored = await _run_krisha_scrape()
    log.info("manual_scrape_done", stored=stored, total_in_db=await get_listings_count())


if __name__ == "__main__":
    asyncio.run(main())
