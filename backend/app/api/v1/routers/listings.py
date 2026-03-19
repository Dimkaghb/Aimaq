from fastapi import APIRouter, Query

from app.models.listing import Listing, ListingsResponse

router = APIRouter()


@router.get(
    "/listings",
    response_model=ListingsResponse,
    status_code=200,
    summary="Browse cached listings",
)
async def list_listings(
    limit: int = Query(20, ge=1, le=100),
    district: str | None = None,
    property_type: str | None = None,
) -> ListingsResponse:
    """Browse listings stored in the database without running the AI pipeline."""
    from app.db.client import get_db
    from app.db.queries import get_listings_count

    db = await get_db()

    query = db.table("listings").select("*")

    if district:
        query = query.eq("district", district)
    if property_type:
        query = query.eq("property_type", property_type)

    query = query.order("scraped_at", desc=True).limit(limit)
    result = await query.execute()

    total = await get_listings_count()

    return ListingsResponse(
        total=total,
        showing=len(result.data or []),
        listings=[Listing(**row) for row in (result.data or [])],
    )
