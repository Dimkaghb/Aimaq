from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel

from app.api.deps import get_current_user_id
from app.city import CITY_ID, normalize_district
from app.models.listing import BusinessType, Listing, ListingsResponse

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

    query = db.table("listings").select("*").eq("raw_data->>city", CITY_ID)

    try:
        district = normalize_district(district)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

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


class NeighborhoodRequest(BaseModel):
    business_type: BusinessType


@router.post("/listings/{listing_id}/neighborhood", summary="Neighborhood brief grounded in Google Maps")
async def get_neighborhood(
    listing_id: str,
    body: NeighborhoodRequest,
    response: Response,
    user_id: str = Depends(get_current_user_id),
) -> dict:
    from app.db.client import get_db
    from app.integrations.google_maps import MapsUnavailable, neighborhood_brief

    response.headers["Cache-Control"] = "no-store"
    db = await get_db()
    result = await (
        db.table("listings").select("address,lat,lng")
        .eq("raw_data->>city", CITY_ID).eq("id", listing_id).limit(1).execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Помещение не найдено")
    try:
        return await neighborhood_brief(result.data[0], body.business_type.value)
    except MapsUnavailable as exc:
        raise HTTPException(status_code=503, detail="Не удалось проверить окружение. Попробуйте позже.") from exc
