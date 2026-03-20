"""Saved businesses — save search results and browse them later."""

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.api.deps import get_current_user_id

log = structlog.get_logger()

router = APIRouter()


# ── Models ────────────────────────────────────────────────────────────────────


class SaveBusinessRequest(BaseModel):
    session_id: str
    business_name: str | None = None

    model_config = {"str_strip_whitespace": True}


# ── Save search results ──────────────────────────────────────────────────────


@router.post(
    "/businesses",
    status_code=201,
    summary="Save search results as a business",
)
async def save_business(
    body: SaveBusinessRequest,
    user_id: str = Depends(get_current_user_id),
) -> dict:
    """Save all results from a completed search session as a business."""
    from app.db.client import get_db

    db = await get_db()

    # Verify session exists, is complete, and belongs to user
    session_result = (
        await db.table("search_sessions")
        .select("*")
        .eq("id", body.session_id)
        .execute()
    )
    if not session_result.data:
        raise HTTPException(
            status_code=404,
            detail={"code": "SESSION_NOT_FOUND", "message": "Search session not found"},
        )

    session = session_result.data[0]
    if session.get("status") != "complete":
        raise HTTPException(
            status_code=400,
            detail={"code": "SESSION_NOT_COMPLETE", "message": "Search session is not complete yet"},
        )

    # Check if already saved
    existing = (
        await db.table("saved_businesses")
        .select("id")
        .eq("user_id", user_id)
        .eq("session_id", body.session_id)
        .execute()
    )
    if existing.data:
        return {"id": existing.data[0]["id"], "already_saved": True}

    # Create saved_business row
    biz_data = {
        "user_id": user_id,
        "business_type": session["business_type"],
        "business_name": body.business_name,
        "district": session.get("district"),
        "budget_tenge": session.get("budget_tenge"),
        "session_id": body.session_id,
    }
    biz_result = await db.table("saved_businesses").insert(biz_data).execute()
    saved_biz = biz_result.data[0]
    saved_biz_id = saved_biz["id"]

    # Fetch all search results for this session
    results = (
        await db.table("search_results")
        .select("*")
        .eq("session_id", body.session_id)
        .order("rank")
        .execute()
    )

    # Insert saved_listings
    listings_to_save = []
    for row in results.data or []:
        listings_to_save.append({
            "saved_business_id": saved_biz_id,
            "listing_id": row["listing_id"],
            "rank": row.get("rank", 0),
            "total_score": row.get("total_score", 0),
            "score_breakdown": row.get("score_breakdown", {}),
            "competitor_count": row.get("competitor_count", 0),
            "bus_stops_nearby": row.get("bus_stops_nearby", 0),
            "metro_distance_m": row.get("metro_distance_m"),
            "nearest_metro_name": row.get("nearest_metro_name"),
        })

    if listings_to_save:
        await db.table("saved_listings").insert(listings_to_save).execute()

    log.info(
        "business_saved",
        user_id=user_id,
        saved_business_id=saved_biz_id,
        listings_count=len(listings_to_save),
    )

    return {
        "id": saved_biz_id,
        "already_saved": False,
        "listings_count": len(listings_to_save),
    }


# ── List saved businesses ────────────────────────────────────────────────────


@router.get(
    "/businesses",
    status_code=200,
    summary="List user's saved businesses",
)
async def list_businesses(
    user_id: str = Depends(get_current_user_id),
) -> dict:
    """Return all saved businesses for the current user with listing counts."""
    from app.db.client import get_db

    db = await get_db()

    businesses = (
        await db.table("saved_businesses")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )

    items = []
    for biz in businesses.data or []:
        # Count listings in this saved business
        count_result = (
            await db.table("saved_listings")
            .select("id", count="exact")
            .eq("saved_business_id", biz["id"])
            .execute()
        )
        items.append({
            **biz,
            "listings_count": count_result.count or 0,
        })

    return {"businesses": items, "total": len(items)}


# ── Get saved business detail with listings ──────────────────────────────────


@router.get(
    "/businesses/{business_id}",
    status_code=200,
    summary="Get a saved business with its listings",
)
async def get_business(
    business_id: str,
    user_id: str = Depends(get_current_user_id),
) -> dict:
    """Return a saved business and all its scored listings."""
    from app.db.client import get_db

    db = await get_db()

    biz_result = (
        await db.table("saved_businesses")
        .select("*")
        .eq("id", business_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not biz_result.data:
        raise HTTPException(
            status_code=404,
            detail={"code": "BUSINESS_NOT_FOUND", "message": "Saved business not found"},
        )

    biz = biz_result.data[0]

    # Fetch saved listings joined with listing data
    listings_result = (
        await db.table("saved_listings")
        .select(
            "*, listings(id, title, address, district, lat, lng, "
            "price_tenge, area_sqm, url, photo_urls)"
        )
        .eq("saved_business_id", business_id)
        .order("rank")
        .execute()
    )

    listings = []
    for row in listings_result.data or []:
        listing = row.get("listings") or {}
        listings.append({
            "listing_id": row["listing_id"],
            "rank": row.get("rank", 0),
            "title": listing.get("title", ""),
            "address": listing.get("address", ""),
            "district": listing.get("district"),
            "lat": listing.get("lat"),
            "lng": listing.get("lng"),
            "price_tenge": listing.get("price_tenge"),
            "area_sqm": listing.get("area_sqm"),
            "url": listing.get("url", ""),
            "total_score": row.get("total_score", 0),
            "score_breakdown": row.get("score_breakdown", {}),
            "competitor_count": row.get("competitor_count", 0),
            "bus_stops_nearby": row.get("bus_stops_nearby", 0),
            "metro_distance_m": row.get("metro_distance_m"),
            "nearest_metro_name": row.get("nearest_metro_name"),
        })

    return {
        "business": biz,
        "listings": listings,
    }


# ── Delete saved business ────────────────────────────────────────────────────


@router.delete(
    "/businesses/{business_id}",
    status_code=200,
    summary="Delete a saved business",
)
async def delete_business(
    business_id: str,
    user_id: str = Depends(get_current_user_id),
) -> dict:
    """Delete a saved business and all its saved listings (cascade)."""
    from app.db.client import get_db

    db = await get_db()

    # Verify ownership
    biz_result = (
        await db.table("saved_businesses")
        .select("id")
        .eq("id", business_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not biz_result.data:
        raise HTTPException(
            status_code=404,
            detail={"code": "BUSINESS_NOT_FOUND", "message": "Saved business not found"},
        )

    await db.table("saved_businesses").delete().eq("id", business_id).execute()

    return {"deleted": True}
