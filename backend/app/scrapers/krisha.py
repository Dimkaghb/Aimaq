import json
import re
import time
from datetime import date, datetime, timedelta, timezone

import structlog
from bs4 import BeautifulSoup

from app.city import CITY_ID, DISTRICT_ALIASES, in_city_bounds, normalize_district
from app.models.listing import ListingUpsert
from app.scrapers.base import BaseScraper, ScraperBlocked

log = structlog.get_logger()

# Krisha.kz commercial property type filter values (das[com.use_case])
PROPERTY_TYPE_MAP: dict[int, str] = {
    1: "free",       # Свободное назначение
    2: "office",     # Офисы
    3: "retail",     # Магазины и бутики
    6: "cafe",       # Общепит (кафе, рестораны)
    11: "pharmacy",  # Медцентры и аптеки
}

# Krisha lists every permitted use of a space in the card title, e.g.
# "Свободное назначение, офисы, общепит, склады · 300 м²". Map those phrases to our tags.
USE_CASE_PATTERNS: list[tuple[str, str]] = [
    ("свободное назначение", "free"),
    ("офис", "office"),
    ("кабинет", "office"),
    ("магазин", "retail"),
    ("общепит", "cafe"),
    ("медцентр", "pharmacy"),
    ("аптек", "pharmacy"),
    ("склад", "warehouse"),
]

_MONTHS = {
    "янв": 1, "фев": 2, "мар": 3, "апр": 4, "ма": 5, "июн": 6,
    "июл": 7, "авг": 8, "сен": 9, "окт": 10, "ноя": 11, "дек": 12,
}

# Districts are only assigned when explicitly stated by the source.

BASE_URL = "https://krisha.kz"
COMMERCIAL_RENT_URL = f"{BASE_URL}/arenda/kommercheskaya-nedvizhimost/taraz/"


class KrishaScraper(BaseScraper):
    """Scraper for Krisha.kz commercial real estate listings in Taraz."""

    async def fetch_commercial_listings(
        self, district: str | None = None, max_pages: int = 40
    ) -> list[dict]:
        """Fetch all commercial listings across relevant property types.

        Returns list of dicts ready for ListingUpsert.
        """
        t0 = time.monotonic()
        all_listings: list[dict] = []

        for type_id, type_name in PROPERTY_TYPE_MAP.items():
            try:
                listings = await self._fetch_type(type_id, type_name, max_pages=max_pages)
                all_listings.extend(listings)
                log.info(
                    "krisha_type_fetched",
                    type_id=type_id,
                    type_name=type_name,
                    count=len(listings),
                )
            except Exception as e:
                log.error(
                    "krisha_type_fetch_failed",
                    type_id=type_id,
                    type_name=type_name,
                    error=str(e),
                )

        duration_ms = round((time.monotonic() - t0) * 1000)
        log.info(
            "krisha_scrape_complete",
            total_listings=len(all_listings),
            duration_ms=duration_ms,
        )
        # A listing can appear in several use-case feeds; keep the first, its use_cases are on the card.
        unique = list({l["external_id"]: l for l in reversed(all_listings)}.values())
        unique.reverse()
        district = normalize_district(district)
        return [l for l in unique if not district or l.get("district") == district]

    async def _fetch_type(
        self, type_id: int, type_name: str, max_pages: int = 40
    ) -> list[dict]:
        """Fetch every page of one commercial use-case feed.

        A block that survives backoff ends the crawl early and returns what was collected,
        unless nothing was collected yet.
        """
        listings: list[dict] = []
        seen_ids: set[str] = set()
        page = 1

        while page <= max_pages:
            params: dict[str, str | int] = {"das[com.use_case]": type_id, "page": page}
            try:
                resp = await self.get(COMMERCIAL_RENT_URL, params=params)
            except ScraperBlocked:
                if not listings:
                    raise
                log.warning("krisha_crawl_truncated", type_name=type_name, page=page, collected=len(listings))
                break
            if "/taraz/" not in resp.url.path:
                raise ValueError("Krisha redirected outside the Taraz feed")

            page_listings, card_count = self._parse_index(resp.text, type_name)
            # An empty *page* ends the feed; a page whose cards were all filtered (promoted
            # cards from other cities) must not.
            if card_count == 0:
                break

            fresh = [item for item in page_listings if item["external_id"] not in seen_ids]
            seen_ids.update(item["external_id"] for item in fresh)
            listings.extend(fresh)
            log.debug("krisha_page_fetched", type_name=type_name, page=page, cards=card_count, new=len(fresh))

            if not self._has_next_page(resp.text):
                break
            page += 1

        return listings

    def _parse_index_page(self, html: str, type_name: str) -> list[dict]:
        """Parse a Krisha.kz search results page and extract listing data."""
        return self._parse_index(html, type_name)[0]

    def _parse_index(self, html: str, type_name: str) -> tuple[list[dict], int]:
        """Parse a results page. Returns (listings, number_of_cards_on_page)."""
        soup = BeautifulSoup(html, "lxml")
        cards = soup.select("div.a-card[data-product-id]")
        seen_at = datetime.now(timezone.utc).isoformat()
        listings: list[dict] = []

        for card in cards:
            try:
                listing = self._parse_card(card, type_name, seen_at=seen_at)
                if listing:
                    listings.append(listing)
            except Exception as e:
                card_id = card.get("data-product-id", "unknown")
                log.warning("krisha_card_parse_failed", card_id=card_id, error=str(e))

        return listings, len(cards)

    def _parse_card(self, card: BeautifulSoup, type_name: str, seen_at: str | None = None) -> dict | None:
        """Parse a single listing card from the search results page."""
        external_id = card.get("data-product-id")
        if not external_id:
            return None

        # Search pages can contain promoted cards from other cities.
        stats = [el.get_text(strip=True) for el in card.select(".a-card__stats-item")]
        if not stats or stats[0].casefold() != "тараз":
            return None
        posted_on = self.parse_posted_date(stats[1]) if len(stats) > 1 else None

        # Title and URL
        title_el = card.select_one("a.a-card__title")
        if not title_el:
            return None
        title = title_el.get_text(strip=True)
        url = BASE_URL + title_el.get("href", "")

        # Address and district
        address_el = card.select_one("div.a-card__subtitle")
        address = address_el.get_text(strip=True) if address_el else ""
        district = self._extract_district(address)

        # Price
        price_tenge, price_per_sqm = self._parse_price(card)

        # Area from title (e.g., "Офисы . 550 м²")
        area_sqm = self._extract_area_from_title(title)

        # Only a per-m² rate is shown: the monthly rent is rate x area (unknown without an area).
        if price_tenge is None and price_per_sqm is not None and area_sqm:
            price_tenge = round(price_per_sqm * area_sqm)
        use_cases = self.parse_use_cases(title)

        # Photo
        photo_urls: list[str] = []
        img_el = card.select_one("img.a-image__img")
        if img_el and img_el.get("src"):
            photo_urls.append(img_el["src"])

        return ListingUpsert(
            source="krisha",
            external_id=str(external_id),
            title=title,
            address=address,
            district=district,
            price_tenge=price_tenge,
            price_per_sqm=price_per_sqm,
            area_sqm=area_sqm,
            property_type=type_name,
            url=url,
            photo_urls=photo_urls,
            raw_data={
                "city": CITY_ID,
                "source_city": "Тараз",
                "source_city_url": COMMERCIAL_RENT_URL,
                "title_raw": title,
                "address_raw": address,
                "street": self.street_from_address(address),
                "use_cases": use_cases,
                "posted_on": posted_on.isoformat() if posted_on else None,
                "seen_at": seen_at or datetime.now(timezone.utc).isoformat(),
            },
        ).model_dump()

    @staticmethod
    def parse_use_cases(title: str) -> list[str]:
        """Our use-case tags from a card title (the part before the area)."""
        head = re.split(r"\s[·.]\s", title, maxsplit=1)[0].lower()
        tags: list[str] = []
        for phrase, tag in USE_CASE_PATTERNS:
            if phrase in head and tag not in tags:
                tags.append(tag)
        return tags

    @staticmethod
    def street_from_address(address: str) -> str:
        """The street part of 'Айтеке би 75 — Проспект Жамбыла/Айтеке би' (drops the landmark note)."""
        return re.split(r"\s[—–-]\s", address, maxsplit=1)[0].strip()

    @staticmethod
    def parse_posted_date(text: str, today: date | None = None) -> date | None:
        """'19 окт.' / 'сегодня' / 'вчера' -> date. Krisha omits the year."""
        today = today or datetime.now(timezone.utc).date()
        value = text.strip().lower()
        if value.startswith("сегодня"):
            return today
        if value.startswith("вчера"):
            return today - timedelta(days=1)
        m = re.match(r"(\d{1,2})\s+([а-я]+)", value)
        if not m:
            return None
        month = next((n for key, n in _MONTHS.items() if m.group(2).startswith(key)), None)
        if month is None:
            return None
        try:
            parsed = date(today.year, month, int(m.group(1)))
        except ValueError:
            return None
        # A date later than today can only belong to the previous year.
        return parsed if parsed <= today + timedelta(days=1) else parsed.replace(year=today.year - 1)

    def _parse_price(self, card: BeautifulSoup) -> tuple[int | None, int | None]:
        """Extract (monthly price, price per m²) from a listing card.

        Cards read "1 500 000 ₸ за месяц  5 000 ₸ за м²", but some show only the per-m² rate.
        The unit decides which number is which: a per-m² rate must never be stored as the
        monthly rent (a 400 m² unit at "1 000 ₸ за м²" is not a 1 000 ₸ rental).
        A bare price with no unit is treated as monthly.
        """
        price_el = card.select_one("div.a-card__price")
        if not price_el:
            return None, None

        price_text = price_el.get_text(" ", strip=True)
        monthly: int | None = None
        per_sqm: int | None = None

        for number, unit in re.findall(r"([\d\s\xa0]+?)\s*[₸〒](\s*за\s*(?:месяц|м))?", price_text):
            digits = re.sub(r"[\s\xa0]", "", number)
            if not digits:
                continue
            value = int(digits)
            if "м" in unit and "месяц" not in unit:
                per_sqm = per_sqm if per_sqm is not None else value
            else:
                monthly = monthly if monthly is not None else value

        return monthly, per_sqm

    def _extract_area_from_title(self, title: str) -> float | None:
        """Extract area in sqm from title like 'Офисы . 550 м²'."""
        # Digits are required: ", магазины" in a use-case list used to match as an "area".
        match = re.search(r"(\d+(?:[.,]\d+)?)\s*м[²2]", title)
        if match:
            try:
                return float(match.group(1).replace(",", "."))
            except ValueError:
                pass
        return None

    def _extract_district(self, address: str) -> str | None:
        """Extract and normalize district name from address string."""
        text = address.lower()
        for alias, canonical in DISTRICT_ALIASES.items():
            name = re.escape(alias)
            if re.search(rf"(?:район|р-н)\s+{name}\b|\b{name}\s+(?:район|р-н)", text):
                return canonical
        return None

    def _has_next_page(self, html: str) -> bool:
        """Check if there's a next page in pagination."""
        soup = BeautifulSoup(html, "lxml")
        next_btn = soup.select_one("a.paginator__btn--next")
        return next_btn is not None

    async def fetch_listing_details(self, listing_id: str) -> dict | None:
        """Fetch individual listing page to get coordinates and full details."""
        url = f"{BASE_URL}/a/show/{listing_id}"
        try:
            resp = await self.get(url)
            return self._parse_detail_page(resp.text, listing_id)
        except Exception as e:
            log.error("krisha_detail_fetch_failed", listing_id=listing_id, error=str(e))
            return None

    def _parse_detail_page(self, html: str, listing_id: str) -> dict | None:
        """Parse individual listing page for coordinates and extended info."""
        # Extract window.data JSON for coordinates
        match = re.search(r"window\.data\s*=\s*(\{.+?\});\s*</script>", html, re.DOTALL)
        if not match:
            return None

        try:
            data = json.loads(match.group(1))
        except json.JSONDecodeError:
            log.warning("krisha_detail_json_parse_failed", listing_id=listing_id)
            return None

        advert = data.get("advert", {})
        map_data = advert.get("map", {})

        result: dict = {}
        if map_data.get("lat") and map_data.get("lon"):
            result["lat"] = float(map_data["lat"])
            result["lng"] = float(map_data["lon"])
            if not in_city_bounds(result["lat"], result["lng"]):
                return None

        # Full description
        soup = BeautifulSoup(html, "lxml")
        desc_el = soup.select_one("div.js-description.a-text")
        if desc_el:
            result["description"] = desc_el.get_text(strip=True)

        return result if result else None
