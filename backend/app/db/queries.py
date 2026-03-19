import structlog

from app.db.client import get_db
from app.models.listing import ListingUpsert

log = structlog.get_logger()


async def upsert_listing(listing: ListingUpsert) -> dict | None:
    """Upsert a listing on (external_id, source). Returns the upserted row."""
    db = await get_db()
    data = listing.model_dump()
    result = (
        await db.table("listings")
        .upsert(data, on_conflict="external_id,source")
        .execute()
    )
    return result.data[0] if result.data else None


async def upsert_listings_batch(listings: list[ListingUpsert]) -> int:
    """Upsert a batch of listings. Returns count of upserted rows."""
    db = await get_db()
    data = [l.model_dump() for l in listings]
    result = (
        await db.table("listings")
        .upsert(data, on_conflict="external_id,source")
        .execute()
    )
    count = len(result.data) if result.data else 0
    log.info("listings_upserted", count=count)
    return count


async def get_all_listings(limit: int = 1000) -> list[dict]:
    """Fetch all listings from the DB."""
    db = await get_db()
    result = await db.table("listings").select("*").limit(limit).execute()
    return result.data or []


async def get_listings_count() -> int:
    """Get total count of listings."""
    db = await get_db()
    result = await db.table("listings").select("id", count="exact").execute()
    return result.count or 0
