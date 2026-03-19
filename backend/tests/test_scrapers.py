"""Tests for the Krisha.kz scraper — parsing logic only, no network calls."""

import pytest

from app.scrapers.krisha import KrishaScraper

# Sample HTML snippet mimicking a Krisha.kz search result card
SAMPLE_CARD_HTML = """
<div class="a-card a-storage-live ddl_product not-colored is-visible"
     id="id-1008183317"
     data-product-id="1008183317">
  <a class="a-card__image" href="/a/show/1008183317">
    <picture class="a-image__picture">
      <img class="a-image__img" src="https://photos.krisha.kz/sample.jpg" />
    </picture>
  </a>
  <a class="a-card__title" href="/a/show/1008183317">
    Офисы, склады · 550 м²
  </a>
  <div class="a-card__subtitle">Турксибский р-н, Закарпатская 82</div>
  <div class="a-card__price">
    500 000 ₸ / мес.
    <br />
    909 ₸ за м²
  </div>
  <div class="a-card__text-preview">Сдается офисное помещение</div>
</div>
"""

SAMPLE_PAGE_HTML = f"""
<html>
<body>
{SAMPLE_CARD_HTML}
<div class="a-card" data-product-id="1008183318">
  <a class="a-card__title" href="/a/show/1008183318">
    Магазины · 120 м²
  </a>
  <div class="a-card__subtitle">Алмалинский р-н, ул. Достык 1</div>
  <div class="a-card__price">
    300 000 ₸ / мес.
  </div>
</div>
<nav class="paginator">
  <a class="paginator__btn paginator__btn--next" href="?page=2">→</a>
</nav>
</body>
</html>
"""

SAMPLE_PAGE_NO_NEXT = """
<html>
<body>
<div class="a-card" data-product-id="999">
  <a class="a-card__title" href="/a/show/999">Офисы · 100 м²</a>
  <div class="a-card__subtitle">Медеуский р-н, пр. Достык 5</div>
  <div class="a-card__price">200 000 ₸</div>
</div>
</body>
</html>
"""


@pytest.fixture
def scraper() -> KrishaScraper:
    return KrishaScraper()


def test_parse_index_page_extracts_cards(scraper: KrishaScraper) -> None:
    listings = scraper._parse_index_page(SAMPLE_PAGE_HTML, "office")
    assert len(listings) == 2


def test_parse_card_extracts_fields(scraper: KrishaScraper) -> None:
    listings = scraper._parse_index_page(SAMPLE_CARD_HTML, "office")
    assert len(listings) == 1

    listing = listings[0]
    assert listing["external_id"] == "1008183317"
    assert listing["source"] == "krisha"
    assert listing["url"] == "https://krisha.kz/a/show/1008183317"
    assert listing["property_type"] == "office"
    assert listing["area_sqm"] == 550.0
    assert listing["price_tenge"] == 500_000
    assert listing["price_per_sqm"] == 909
    assert listing["district"] == "Turksib"
    assert "Закарпатская 82" in listing["address"]
    assert len(listing["photo_urls"]) == 1


def test_parse_card_handles_missing_price(scraper: KrishaScraper) -> None:
    html = """
    <div class="a-card" data-product-id="123">
      <a class="a-card__title" href="/a/show/123">Офисы · 50 м²</a>
      <div class="a-card__subtitle">Бостандыкский р-н</div>
    </div>
    """
    listings = scraper._parse_index_page(html, "office")
    assert len(listings) == 1
    assert listings[0]["price_tenge"] is None
    assert listings[0]["district"] == "Bostandyk"


def test_extract_area_from_various_titles(scraper: KrishaScraper) -> None:
    assert scraper._extract_area_from_title("Офисы · 550 м²") == 550.0
    assert scraper._extract_area_from_title("Магазины . 120.5 м2") == 120.5
    assert scraper._extract_area_from_title("Свободное назначение") is None


def test_extract_district_normalization(scraper: KrishaScraper) -> None:
    assert scraper._extract_district("Турксибский р-н, Закарпатская 82") == "Turksib"
    assert scraper._extract_district("Алмалинский р-н, ул. Достык") == "Almaly"
    assert scraper._extract_district("Медеуский р-н, пр. Достык 5") == "Medeu"
    assert scraper._extract_district("ул. Абая 10") is None


def test_has_next_page(scraper: KrishaScraper) -> None:
    assert scraper._has_next_page(SAMPLE_PAGE_HTML) is True
    assert scraper._has_next_page(SAMPLE_PAGE_NO_NEXT) is False


def test_parse_price_with_per_sqm(scraper: KrishaScraper) -> None:
    from bs4 import BeautifulSoup

    html = '<div class="a-card__price">500 000 ₸ / мес.<br/>909 ₸ за м²</div>'
    soup = BeautifulSoup(html, "lxml")
    card = soup.select_one("div.a-card__price").parent or soup
    # Test price parsing directly
    price, per_sqm = scraper._parse_price(soup)
    assert price == 500_000
    assert per_sqm == 909
