"""Heatmap data for the map overlays, built from the cached OpenStreetMap city data.

Layers:
  - transit:     public-transport stops
  - footfall:    places that draw people on foot (schools, offices, parks, malls, shops, cafes)
  - competitors: places of the same kind as the user's business (cafes for a cafe, ...)

Each point is {lat, lng, intensity} with intensity 0-1. The data comes from
`osm_city.get_city_pois`: one Overpass download per city, cached in Redis for a week, so this
endpoint is fast and never makes the browser wait on Overpass.
"""
import structlog
from fastapi import APIRouter, HTTPException, Query

from app.city import in_city_bounds
from app.integrations.osm_city import COMPETITOR_CATEGORY, CityPois, get_city_pois

log = structlog.get_logger()
router = APIRouter()

# Intensity per point (leaflet.heat sums overlapping points, so crowds build up on their own).
TRANSIT_INTENSITY = 0.95  # stops are sparse: each one must show up on its own
COMPETITOR_INTENSITY = 0.7
FOOTFALL_WEIGHTS = {"anchors_major": 0.95, "anchors": 0.6, "food": 0.35, "shops": 0.3}

COMPETITOR_LABELS = {
    "food": "Кафе и рестораны",
    "shops": "Магазины",
    "pharmacies": "Аптеки",
    "offices": "Офисы и бизнес-центры",
}


def _points(pois: CityPois, category: str, intensity: float) -> list[dict]:
    return [
        {"lat": lat, "lng": lng, "intensity": intensity}
        for lat, lng in pois.get(category, [])
        if in_city_bounds(lat, lng)
    ]


def build_layer(pois: CityPois, layer: str, business_type: str | None) -> tuple[list[dict], dict]:
    """Points and descriptive metadata for one layer."""
    if layer == "transit":
        return _points(pois, "bus_stop", TRANSIT_INTENSITY), {"label": "Остановки общественного транспорта"}

    if layer == "footfall":
        # A place can be in several categories (a mall is also an anchor); keep its strongest weight.
        strongest: dict[tuple[float, float], float] = {}
        for category, weight in FOOTFALL_WEIGHTS.items():
            for lat, lng in pois.get(category, []):
                key = (lat, lng)
                strongest[key] = max(strongest.get(key, 0.0), weight)
        points = [
            {"lat": lat, "lng": lng, "intensity": weight}
            for (lat, lng), weight in strongest.items()
            if in_city_bounds(lat, lng)
        ]
        return points, {"label": "Места притяжения: школы, вузы, офисы, парки, торговые точки"}

    category = COMPETITOR_CATEGORY.get(business_type or "", "food")
    return _points(pois, category, COMPETITOR_INTENSITY), {"label": COMPETITOR_LABELS[category]}


@router.get("/heatmap", status_code=200)
async def get_heatmap(
    layer: str = Query(..., pattern=r"^(transit|footfall|competitors)$"),
    business_type: str | None = None,
) -> dict:
    """Heatmap points for a layer. 503 (never an empty 200) when the city data is unavailable,
    so the map can offer a retry instead of claiming the layer has no data."""
    pois = await get_city_pois()
    if not pois:
        raise HTTPException(
            status_code=503,
            detail={"code": "MAP_DATA_UNAVAILABLE", "message": "Данные карты временно недоступны"},
        )

    points, meta = build_layer(pois, layer, business_type)
    log.info("heatmap_built", layer=layer, business_type=business_type, points=len(points))
    return {"layer": layer, "count": len(points), "points": points, "meta": {**meta, "source": "OpenStreetMap"}}
