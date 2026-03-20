"""Dashboard endpoints — user stats, activity, recent & popular listings."""

import structlog
from fastapi import APIRouter, Depends, Query

from app.api.deps import get_current_user_id

log = structlog.get_logger()

router = APIRouter()


# ── Stats badges ──────────────────────────────────────────────────────────────


@router.get(
    "/dashboard/stats",
    status_code=200,
    summary="User dashboard stats (badge cards)",
)
async def dashboard_stats(user_id: str = Depends(get_current_user_id)) -> dict:
    """Return 3 stat badges: total searches, listings found, top business type."""
    from app.db.client import get_db

    db = await get_db()

    # Count user's search sessions
    sessions = (
        await db.table("search_sessions")
        .select("id, business_type, status", count="exact")
        .eq("user_id", user_id)
        .execute()
    )
    total_searches = sessions.count or 0

    # Count completed sessions
    completed = (
        await db.table("search_sessions")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .eq("status", "complete")
        .execute()
    )
    completed_searches = completed.count or 0

    # Count total listing results across all user sessions
    session_ids = [s["id"] for s in (sessions.data or [])]
    total_listings_found = 0
    if session_ids:
        results = (
            await db.table("search_results")
            .select("id", count="exact")
            .in_("session_id", session_ids)
            .execute()
        )
        total_listings_found = results.count or 0

    # Find most searched business type
    type_counts: dict[str, int] = {}
    for s in sessions.data or []:
        bt = s.get("business_type", "")
        type_counts[bt] = type_counts.get(bt, 0) + 1
    top_type = max(type_counts, key=type_counts.get) if type_counts else None

    type_labels = {
        "fastfood": "Фастфуд",
        "cafe": "Кафе",
        "office": "Офис",
        "retail": "Магазин",
        "pharmacy": "Аптека",
    }

    return {
        "stats": [
            {
                "key": "total_searches",
                "label": "Всего поисков",
                "value": total_searches,
                "formatted_value": str(total_searches),
                "change_percent": 0.0,
            },
            {
                "key": "listings_found",
                "label": "Мест найдено",
                "value": total_listings_found,
                "formatted_value": str(total_listings_found),
                "change_percent": 0.0,
            },
            {
                "key": "completed_searches",
                "label": "Завершено",
                "value": completed_searches,
                "formatted_value": str(completed_searches),
                "change_percent": 0.0,
            },
            {
                "key": "top_business_type",
                "label": "Топ категория",
                "value": 1 if top_type else 0,
                "formatted_value": type_labels.get(top_type, "—") if top_type else "—",
                "change_percent": 0.0,
            },
        ]
    }


# ── Activity chart ────────────────────────────────────────────────────────────


@router.get(
    "/dashboard/activity",
    status_code=200,
    summary="User search activity over time",
)
async def dashboard_activity(
    user_id: str = Depends(get_current_user_id),
) -> dict:
    """Return search counts per month for the activity bar graph."""
    from app.db.client import get_db

    db = await get_db()

    sessions = (
        await db.table("search_sessions")
        .select("created_at, status")
        .eq("user_id", user_id)
        .order("created_at")
        .execute()
    )

    # Group by month
    month_data: dict[str, dict[str, int]] = {}
    month_labels = {
        "01": "Янв", "02": "Фев", "03": "Мар", "04": "Апр",
        "05": "Май", "06": "Июн", "07": "Июл", "08": "Авг",
        "09": "Сен", "10": "Окт", "11": "Ноя", "12": "Дек",
    }

    for s in sessions.data or []:
        created = s.get("created_at", "")
        if not created:
            continue
        month_key = created[:7]  # "2026-03"
        mm = created[5:7]
        label = month_labels.get(mm, mm)

        if month_key not in month_data:
            month_data[month_key] = {"month": label, "billable": 0, "non_billable": 0}

        if s.get("status") == "complete":
            month_data[month_key]["billable"] += 1
        else:
            month_data[month_key]["non_billable"] += 1

    # If no data, return last 6 months with zeros
    if not month_data:
        import datetime

        now = datetime.date.today()
        months = []
        for i in range(5, -1, -1):
            d = now.replace(day=1)
            for _ in range(i):
                d = (d - datetime.timedelta(days=1)).replace(day=1)
            mm = f"{d.month:02d}"
            months.append({"month": month_labels.get(mm, mm), "billable": 0, "non_billable": 0})
        return {"months": months, "currency": "searches"}

    sorted_months = [month_data[k] for k in sorted(month_data.keys())]
    return {"months": sorted_months[-12:], "currency": "searches"}


# ── Recent listings ───────────────────────────────────────────────────────────


@router.get(
    "/dashboard/recent",
    status_code=200,
    summary="User's recently found listings",
)
async def dashboard_recent(
    limit: int = Query(5, ge=1, le=20),
    user_id: str = Depends(get_current_user_id),
) -> dict:
    """Return the user's most recent scored listings from their searches."""
    from app.db.client import get_db

    db = await get_db()

    # Get user's most recent completed sessions
    sessions = (
        await db.table("search_sessions")
        .select("id")
        .eq("user_id", user_id)
        .eq("status", "complete")
        .order("created_at", desc=True)
        .limit(5)
        .execute()
    )

    session_ids = [s["id"] for s in (sessions.data or [])]
    if not session_ids:
        return {"members": [], "total": 0}

    # Get top results from those sessions
    results = (
        await db.table("search_results")
        .select("*, listings(id, title, address, district, price_tenge, area_sqm, url)")
        .in_("session_id", session_ids)
        .order("total_score", desc=True)
        .limit(limit)
        .execute()
    )

    members = []
    for row in results.data or []:
        listing = row.get("listings") or {}
        price = listing.get("price_tenge")
        price_str = f"{price:,} ₸/мес".replace(",", " ") if price else "Цена не указана"
        members.append({
            "id": row.get("listing_id", ""),
            "name": listing.get("title", "Без названия"),
            "role": price_str,
            "status": "online" if row.get("total_score", 0) >= 70 else
                      "idle" if row.get("total_score", 0) >= 45 else "offline",
            "avatar_url": None,
        })

    return {"members": members, "total": len(members)}


# ── Popular Krisha listings ───────────────────────────────────────────────────


@router.get(
    "/dashboard/popular",
    status_code=200,
    summary="Popular listings from Krisha.kz",
)
async def dashboard_popular(
    limit: int = Query(8, ge=1, le=20),
    user_id: str = Depends(get_current_user_id),
) -> dict:
    """Return popular listings — those that appear most frequently in search results."""
    from app.db.client import get_db

    db = await get_db()

    # Get listings that appear most in search_results (globally popular)
    # We fetch recent results ordered by score and join with listings
    results = (
        await db.table("search_results")
        .select(
            "listing_id, total_score, rank, "
            "listings(id, title, address, district, price_tenge, area_sqm, url, photo_urls)"
        )
        .order("total_score", desc=True)
        .limit(50)
        .execute()
    )

    # Deduplicate by listing_id, keeping highest score
    seen: dict[str, dict] = {}
    for row in results.data or []:
        lid = row.get("listing_id", "")
        if lid not in seen or row.get("total_score", 0) > seen[lid].get("total_score", 0):
            seen[lid] = row

    # Build response matching OngoingProjects (Project) shape
    projects = []

    def _priority(s: float) -> str:
        if s >= 70:
            return "low"
        return "medium" if s >= 45 else "high"

    def _color(s: float) -> str:
        if s >= 70:
            return "#16a34a"
        return "#cf8d13" if s >= 45 else "#c9502e"

    for row in list(seen.values())[:limit]:
        listing = row.get("listings") or {}
        score = row.get("total_score", 0)
        district = listing.get("district") or "Алматы"
        price = listing.get("price_tenge")
        price_str = f"{price:,} ₸".replace(",", " ") if price else "—"

        projects.append({
            "id": row.get("listing_id", ""),
            "name": listing.get("title", "Без названия"),
            "client": {
                "name": district,
                "icon_url": None,
                "color": _color(score),
            },
            "priority": _priority(score),
            "deadline": price_str,
            "team_member_count": int(score),
            "status_color": _color(score),
        })

    return {"projects": projects, "total": len(projects)}
