import httpx
import structlog
from tenacity import retry, retry_if_not_exception_type, stop_after_attempt, wait_exponential

from app.config import settings

log = structlog.get_logger()

# 2GIS rubric IDs for competitor search by business type
BUSINESS_RUBRICS: dict[str, list[int]] = {
    "fastfood": [165],       # Фастфуд
    "cafe": [161, 164],      # Кафе, Рестораны
    "office": [13796],       # Бизнес-центры
    "retail": [373],         # Продуктовые магазины / супермаркеты
    "pharmacy": [207],       # Аптеки
}

# Russian query terms as fallback when rubric search returns nothing
BUSINESS_QUERIES: dict[str, str] = {
    "fastfood": "фастфуд",
    "cafe": "кафе",
    "office": "бизнес-центр",
    "retail": "магазин",
    "pharmacy": "аптека",
}


class TwoGISKeyError(RuntimeError):
    """The API key was rejected, blocked or is out of quota. Retrying cannot help."""


# Transient failures are retried; a rejected key is not.
_retry = retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(min=1, max=4),
    retry=retry_if_not_exception_type(TwoGISKeyError),
    reraise=True,
)


class TwoGISClient:
    """2GIS Places API client for competitor density search in Taraz."""

    BASE_URL = "https://catalog.api.2gis.com/3.0"

    def __init__(self, api_key: str | None = None) -> None:
        self.api_key = api_key or settings.twogis_api_key
        self._client: httpx.AsyncClient | None = None
        # Set by the first key rejection; later calls fail at once instead of hitting the API.
        self.fatal_error: TwoGISKeyError | None = None

    async def __aenter__(self) -> "TwoGISClient":
        self._client = httpx.AsyncClient(timeout=10.0)
        return self

    async def __aexit__(self, *args: object) -> None:
        if self._client:
            await self._client.aclose()

    async def _items(self, path: str, params: dict) -> tuple[list[dict], int]:
        """GET a catalog endpoint. Returns (items on this page, total matches).

        The key is limited to 10 items per page, so `total` is the only reliable count.
        """
        if self.fatal_error:
            raise self.fatal_error
        resp = await self._client.get(f"{self.BASE_URL}/{path}", params={**params, "key": self.api_key})
        if resp.is_error:
            raise RuntimeError(f"2GIS request failed (HTTP {resp.status_code})")
        data = resp.json()
        meta = data.get("meta", {})
        code = meta.get("code", 200)
        if code in (401, 403):
            message = (meta.get("error") or {}).get("message", "access denied")
            self.fatal_error = TwoGISKeyError(f"2GIS API key rejected: {message}")
            raise self.fatal_error
        if code == 404:  # "Results not found": a real answer, zero matches
            return [], 0
        if code >= 400:
            raise RuntimeError(f"2GIS API error ({code})")
        result = data.get("result") or {}
        items = result.get("items", [])
        return items, int(result.get("total") or len(items))

    @_retry
    async def search_nearby_total(
        self, lat: float, lng: float, query: str, radius: int = 500
    ) -> int:
        """Number of businesses matching `query` within `radius` metres."""
        _, total = await self._items("items", {
            "q": query, "point": f"{lng},{lat}", "radius": radius, "fields": "items.point",
        })
        return total

    @_retry
    async def search_by_rubric_total(
        self, lat: float, lng: float, rubric_ids: list[int], radius: int = 500
    ) -> int:
        _, total = await self._items("items", {
            "rubric_id": ",".join(str(r) for r in rubric_ids),
            "point": f"{lng},{lat}", "radius": radius, "fields": "items.point",
        })
        return total

    @_retry
    async def count_transit_stops(self, lat: float, lng: float, radius: int = 300) -> int:
        """Public-transport stops within `radius` metres (2GIS items of type 'station')."""
        items, _ = await self._items("items", {
            "q": "остановка общественного транспорта",
            "point": f"{lng},{lat}", "radius": radius, "fields": "items.point,items.type",
        })
        return sum(1 for item in items if item.get("type") == "station")

    # Result types that only identify an area, not a place; using them would pin the
    # listing to the middle of the city.
    _COARSE_TYPES = {"adm_div", "city", "district", "settlement", "region", "country", "division"}

    @_retry
    async def geocode(self, address: str) -> dict | None:
        """Resolve an address to {'lat', 'lng'}, or None when 2GIS has no precise match."""
        items, _ = await self._items("items/geocode", {
            "q": address, "fields": "items.point,items.type,items.full_name",
        })
        for item in items:
            point = item.get("point")
            if point and item.get("type") not in self._COARSE_TYPES:
                return {"lat": point["lat"], "lng": point["lon"], "matched": item.get("full_name")}
        return None

    @_retry
    async def search_nearby(
        self,
        lat: float,
        lng: float,
        query: str,
        radius: int = 500,
    ) -> list[dict]:
        """Search for nearby businesses by text query."""
        resp = await self._client.get(
            f"{self.BASE_URL}/items",
            params={
                "q": query,
                "point": f"{lng},{lat}",  # 2GIS uses lon,lat order
                "radius": radius,
                "key": self.api_key,
                "fields": "items.point,items.rubrics,items.address_name",
                "sort": "distance",
            },
        )
        if resp.is_error:
            raise RuntimeError(f"2GIS request failed (HTTP {resp.status_code})")
        data = resp.json()
        if data.get("meta", {}).get("code", 200) >= 400:
            raise RuntimeError(f"2GIS API error ({data['meta']['code']})")
        return data.get("result", {}).get("items", [])

    @_retry
    async def search_by_rubric(
        self,
        lat: float,
        lng: float,
        rubric_ids: list[int],
        radius: int = 500,
    ) -> list[dict]:
        """Search for nearby businesses by rubric (category) IDs."""
        resp = await self._client.get(
            f"{self.BASE_URL}/items",
            params={
                "rubric_id": ",".join(str(r) for r in rubric_ids),
                "point": f"{lng},{lat}",
                "radius": radius,
                "key": self.api_key,
                "fields": "items.point,items.rubrics,items.address_name",
                "sort": "distance",
            },
        )
        if resp.is_error:
            raise RuntimeError(f"2GIS request failed (HTTP {resp.status_code})")
        data = resp.json()
        if data.get("meta", {}).get("code", 200) >= 400:
            raise RuntimeError(f"2GIS API error ({data['meta']['code']})")
        return data.get("result", {}).get("items", [])

    async def count_competitors(
        self,
        lat: float,
        lng: float,
        business_type: str,
        radius: int = 500,
    ) -> int:
        """Competitors of a business type near a location.

        Rubric search first (more precise), text query as a fallback when it finds nothing.
        Raises when 2GIS cannot be reached, so callers can tell "unknown" from "zero".
        """
        total = 0
        rubric_ids = BUSINESS_RUBRICS.get(business_type)
        if rubric_ids:
            try:
                total = await self.search_by_rubric_total(lat, lng, rubric_ids, radius)
            except Exception as e:
                log.warning("gis2_rubric_search_failed", business_type=business_type, error=str(e))
        if not total:
            query = BUSINESS_QUERIES.get(business_type, business_type)
            total = await self.search_nearby_total(lat, lng, query, radius)
        log.debug("gis2_competitor_count", lat=lat, lng=lng, business_type=business_type, count=total)
        return total
