from fastapi import APIRouter, HTTPException

from app.models.listing import SearchRequest, SearchResponse, ScoredListingResponse

router = APIRouter()


@router.post(
    "/search",
    response_model=SearchResponse,
    status_code=200,
    summary="Search for optimal commercial locations",
)
async def create_search(request: SearchRequest) -> SearchResponse:
    """Score and rank commercial listings for a given business type.

    Returns top 5 listings sorted by fit score, with full score breakdowns.
    Synchronous for now — results returned directly (no Celery).
    """
    from app.services.search import run_search

    result = await run_search(
        business_type=request.business_type.value,
        district=request.district,
        budget_tenge=request.budget_tenge,
        area_sqm_min=request.area_sqm_min,
        competitor_tolerance=request.competitor_tolerance,
    )

    if not result["results"]:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "NO_RESULTS",
                "message": "No enriched listings found matching your criteria. "
                "Try broadening your search or run the enrichment pipeline first.",
            },
        )

    return SearchResponse(**result)


@router.get(
    "/search/{search_id}/listing/{listing_id}",
    response_model=ScoredListingResponse,
    status_code=200,
    summary="Get full detail for one scored listing",
)
async def get_listing_detail(search_id: str, listing_id: str) -> ScoredListingResponse:
    """Placeholder — will be wired to search_results table in Phase 6."""
    raise HTTPException(
        status_code=501,
        detail={
            "code": "NOT_IMPLEMENTED",
            "message": "Listing detail will be available after Phase 6 (async pipeline).",
        },
    )
