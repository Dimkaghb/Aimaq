"""Regression tests for the search-quality fixes (see the Krisha search investigation)."""
import asyncio
from datetime import date
from types import SimpleNamespace
from unittest.mock import AsyncMock

import httpx
import pytest

from app.agents.nodes.searcher import use_case_fit
from app.scrapers.krisha import COMMERCIAL_RENT_URL, KrishaScraper
from app.services import scoring
from app.services import geocode
from app.services.geocode import geocode_missing, geocode_query


def card(product_id: str, city: str = "Тараз", title: str = "Общепит · 80 м²") -> str:
    return f"""
    <div class="a-card" data-product-id="{product_id}">
      <div class="a-card__stats-item">{city}</div><div class="a-card__stats-item">19 окт.</div>
      <a class="a-card__title" href="/a/show/{product_id}">{title}</a>
      <div class="a-card__subtitle">Айтеке би 75 — Проспект Жамбыла</div>
      <div class="a-card__price">300 000 〒</div>
    </div>"""


def page(*cards: str, next_page: bool) -> str:
    nxt = '<a class="paginator__btn--next" href="?page=2">Дальше</a>' if next_page else ""
    return f"<html><body>{''.join(cards)}{nxt}</body></html>"


# ── Krisha parsing ───────────────────────────────────────────────────────────

def test_use_cases_come_from_the_title_not_the_feed_that_returned_the_card():
    title = "Свободное назначение, офисы, магазины и бутики, склады, общепит · 300 м²"
    assert KrishaScraper.parse_use_cases(title) == ["free", "office", "retail", "cafe", "warehouse"]
    assert KrishaScraper.parse_use_cases("Склады · 1720 м²") == ["warehouse"]
    assert KrishaScraper.parse_use_cases("Медцентры и аптеки . 40 м²") == ["pharmacy"]


def test_card_stores_use_cases_street_posting_date_and_sighting_time():
    listing = KrishaScraper()._parse_index_page(page(card("1"), next_page=False), "cafe")[0]
    raw = listing["raw_data"]
    assert raw["use_cases"] == ["cafe"]
    assert raw["street"] == "Айтеке би 75"
    assert raw["posted_on"].endswith("-10-19")
    assert raw["seen_at"]


def test_posting_dates_without_a_year():
    today = date(2026, 10, 19)
    parse = KrishaScraper.parse_posted_date
    assert parse("19 окт.", today) == date(2026, 10, 19)
    assert parse("1 мая", today) == date(2026, 5, 1)
    assert parse("31 дек.", today) == date(2025, 12, 31)  # later than today -> last year
    assert parse("вчера", today) == date(2026, 10, 18)
    assert parse("???", today) is None


@pytest.mark.asyncio
async def test_crawl_continues_past_a_page_whose_cards_were_all_filtered_out():
    """A page of only promoted other-city cards used to end the crawl early."""
    pages = [
        page(card("1"), next_page=True),
        page(card("2", city="Алматы"), next_page=True),   # nothing usable on this page
        page(card("3"), next_page=False),
    ]
    scraper = KrishaScraper()
    scraper.get = AsyncMock(side_effect=[
        SimpleNamespace(text=text, url=httpx.URL(COMMERCIAL_RENT_URL)) for text in pages
    ])
    found = await scraper._fetch_type(6, "cafe", max_pages=40)
    assert [l["external_id"] for l in found] == ["1", "3"]


@pytest.mark.asyncio
async def test_crawl_stops_on_an_empty_page_and_does_not_repeat_listings():
    scraper = KrishaScraper()
    scraper.get = AsyncMock(side_effect=[
        SimpleNamespace(text=page(card("1"), next_page=True), url=httpx.URL(COMMERCIAL_RENT_URL)),
        SimpleNamespace(text=page(card("1"), card("2"), next_page=True), url=httpx.URL(COMMERCIAL_RENT_URL)),
        SimpleNamespace(text=page(next_page=False), url=httpx.URL(COMMERCIAL_RENT_URL)),
    ])
    found = await scraper._fetch_type(6, "cafe")
    assert [l["external_id"] for l in found] == ["1", "2"]


# ── Relevance ────────────────────────────────────────────────────────────────

@pytest.mark.parametrize("tags,business,expected", [
    (["cafe"], "cafe", "exact"),
    (["cafe"], "fastfood", "exact"),
    (["free"], "cafe", "generic"),
    (["free", "office", "cafe"], "cafe", "exact"),
    (["warehouse"], "cafe", None),
    (["office"], "cafe", None),
    (["office"], "office", "exact"),
    (["pharmacy", "retail"], "pharmacy", "exact"),
])
def test_use_case_fit(tags, business, expected):
    assert use_case_fit({"raw_data": {"use_cases": tags}}, business) == expected


# ── Scoring ──────────────────────────────────────────────────────────────────

def test_unmeasured_signals_are_neutral_not_excellent():
    assert scoring.compute_competitor_score(None) == scoring.NEUTRAL_SCORE
    assert scoring.compute_competitor_score(0) == pytest.approx(100, abs=15)  # zero really is good
    assert scoring.compute_transit_score(None, None) == scoring.NEUTRAL_SCORE
    assert scoring.compute_transit_score(0, None) == 0


def test_footfall_normalisation_ignores_unknowns():
    items = [{"footfall_raw": 20.0}, {"footfall_raw": 80.0}, {"footfall_raw": None}]
    scoring.normalize_footfall_batch(items)
    assert [i["footfall_score"] for i in items] == [0.0, 100.0, scoring.NEUTRAL_SCORE]


def test_unmeasured_listing_does_not_beat_a_measured_good_one():
    good = {"id": "good", "footfall_raw": 90.0, "competitor_count": 0, "bus_stops_nearby": 8, "price_tenge": 100, "area_sqm": 100}
    unknown = {"id": "unknown", "footfall_raw": None, "competitor_count": None, "bus_stops_nearby": None, "price_tenge": 100, "area_sqm": 100}
    other = {"id": "other", "footfall_raw": 10.0, "competitor_count": 20, "bus_stops_nearby": 0, "price_tenge": 100, "area_sqm": 100}
    ranked = scoring.score_listings([unknown, other, good], "cafe", budget_tenge=1000)
    assert [r["listing_id"] for r in ranked] == ["good", "unknown", "other"]


def test_all_scored_listings_are_returned_up_to_the_result_limit():
    items = [{"id": str(i), "footfall_raw": float(i), "competitor_count": 1, "bus_stops_nearby": 1, "price_tenge": 1, "area_sqm": 80} for i in range(150)]
    assert len(scoring.score_listings(items, "cafe")) == scoring.RESULT_LIMIT == 60
    assert len(scoring.score_listings([dict(i) for i in items], "cafe", top_n=None)) == 150


def test_generic_space_ranks_just_below_an_identical_exact_fit():
    base = {"footfall_raw": 50.0, "competitor_count": 2, "bus_stops_nearby": 3, "price_tenge": 1, "area_sqm": 100}
    ranked = scoring.score_listings(
        [{**base, "id": "generic", "use_case_fit": "generic"}, {**base, "id": "exact", "use_case_fit": "exact"}], "cafe")
    assert [r["listing_id"] for r in ranked] == ["exact", "generic"]
    assert ranked[0]["total_score"] - ranked[1]["total_score"] == pytest.approx(scoring.GENERIC_FIT_PENALTY)


# ── Geocoding ────────────────────────────────────────────────────────────────

def test_geocode_query_uses_the_street_without_the_landmark_note():
    assert geocode_query({"raw_data": {"street": "Айтеке би 75"}, "address": "x"}) == "Тараз, Айтеке би 75"
    assert geocode_query({"raw_data": {}, "address": ""}) is None


class FakeGis:
    fatal_error = None
    answers: dict = {}

    async def __aenter__(self): return self
    async def __aexit__(self, *a): return None

    async def geocode(self, query):
        return self.answers.get(query)


@pytest.mark.asyncio
async def test_geocoding_fills_only_missing_coordinates_and_rejects_points_outside_the_city(monkeypatch):
    class Gis(FakeGis):
        answers = {"Тараз, B": {"lat": 42.9, "lng": 71.36}, "Тараз, Москва": {"lat": 55.0, "lng": 37.0}}

    monkeypatch.setattr("app.services.geocode.TwoGISClient", Gis)
    located = {"raw_data": {"street": "A"}, "lat": 1.0, "lng": 2.0}
    missing = {"raw_data": {"street": "B"}, "lat": None, "lng": None}
    wrong = {"raw_data": {"street": "Москва"}, "lat": None, "lng": None}
    assert await geocode_missing([located, missing, wrong], fallback_budget=0) == 1
    assert (located["lat"], located["lng"]) == (1.0, 2.0)
    assert (missing["lat"], missing["lng"]) == (42.9, 71.36)
    assert wrong["lat"] is None


@pytest.mark.asyncio
async def test_openstreetmap_fallback_resolves_what_2gis_cannot_and_learns_the_district(monkeypatch):
    from app.services import geocode

    class DownGis(FakeGis):
        fatal_error = RuntimeError("key blocked")

        async def geocode(self, query):
            raise RuntimeError("key blocked")

    async def fake_nominatim(client, query):
        return {"lat": 42.89, "lng": 71.36, "district": "Aulieata"}

    monkeypatch.setattr(geocode, "TwoGISClient", DownGis)
    monkeypatch.setattr(geocode, "_nominatim", fake_nominatim)
    monkeypatch.setattr(geocode, "NOMINATIM_INTERVAL", 0)
    listing = {"raw_data": {"street": "Айтеке би 75"}, "lat": None, "lng": None, "district": None}
    assert await geocode.geocode_missing([listing]) == 1
    assert (listing["lat"], listing["district"]) == (42.89, "Aulieata")


@pytest.mark.asyncio
async def test_openstreetmap_fallback_stops_at_its_time_budget(monkeypatch):
    from app.services import geocode

    calls = 0

    async def slow_nominatim(client, query):
        nonlocal calls
        calls += 1
        return None

    monkeypatch.setattr(geocode, "TwoGISClient", FakeGis)
    monkeypatch.setattr(geocode, "_nominatim", slow_nominatim)
    monkeypatch.setattr(geocode, "NOMINATIM_INTERVAL", 0.05)
    listings = [{"raw_data": {"street": str(i)}, "lat": None, "lng": None} for i in range(50)]
    await geocode.geocode_missing(listings, fallback_budget=0.2)
    assert 0 < calls < 10  # nowhere near all 50


def test_district_comes_from_administrative_fields_not_street_names():
    assert geocode.district_from_address({"city_district": "Әулиеата ауданы"}) == "Aulieata"
    assert geocode.district_from_address({"suburb": "Жібек жолы ауданы"}) == "ZhibekZholy"
    assert geocode.district_from_address({"road": "Жібек жолы көшесі", "city": "Тараз"}) is None


# ── Krisha area parsing ──────────────────────────────────────────────────────

@pytest.mark.parametrize("title,area", [
    ("Свободное назначение, офисы, магазины и бутики, склады, общепит · 300 м²", 300.0),
    ("Офисы . 550 м²", 550.0),
    ("Общепит, магазины · 6 м²", 6.0),
    ("Магазины и бутики", None),
])
def test_area_is_not_confused_by_commas_before_a_word_starting_with_m(title, area):
    assert KrishaScraper()._extract_area_from_title(title) == area


# ── 2GIS client ──────────────────────────────────────────────────────────────

def gis_response(payload: dict) -> httpx.Response:
    return httpx.Response(200, json=payload, request=httpx.Request("GET", "https://catalog.api.2gis.com"))


@pytest.mark.asyncio
async def test_2gis_no_results_is_zero_not_an_error():
    from app.integrations.gis2 import TwoGISClient
    client = TwoGISClient(api_key="k")
    client._client = SimpleNamespace(get=AsyncMock(return_value=gis_response({"meta": {"code": 404, "error": {"message": "Results not found"}}})))
    assert await client.search_nearby_total(42.9, 71.3, "кафе", 300) == 0


@pytest.mark.asyncio
async def test_2gis_competitor_count_uses_total_not_the_ten_item_page():
    from app.integrations.gis2 import TwoGISClient
    client = TwoGISClient(api_key="k")
    page = {"meta": {"code": 200}, "result": {"total": 26, "items": [{}] * 10}}
    client._client = SimpleNamespace(get=AsyncMock(return_value=gis_response(page)))
    assert await client.count_competitors(42.9, 71.3, "cafe", 500) == 26


@pytest.mark.asyncio
async def test_2gis_blocked_key_fails_fast_once_and_is_never_retried():
    from app.integrations.gis2 import TwoGISClient, TwoGISKeyError
    blocked = gis_response({"meta": {"code": 403, "error": {"message": "key is blocked"}}})
    client = TwoGISClient(api_key="k")
    get = AsyncMock(return_value=blocked)
    client._client = SimpleNamespace(get=get)
    with pytest.raises(TwoGISKeyError, match="key is blocked"):
        await client.search_nearby_total(42.9, 71.3, "кафе", 300)
    for _ in range(5):
        with pytest.raises(TwoGISKeyError):
            await client.count_transit_stops(42.9, 71.3)
    assert get.await_count == 1  # one real request; the rest short-circuit
    assert client.fatal_error is not None


# ── Enrichment helper ────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_each_location_is_looked_up_once_and_failures_stay_unknown(monkeypatch):
    from app.agents.nodes import _geo

    monkeypatch.setattr(_geo, "get_json_many", AsyncMock(return_value={}))
    monkeypatch.setattr(_geo, "set_json_many", AsyncMock())
    seen: list[tuple[float, float]] = []

    async def fetch(lat, lng):
        seen.append((lat, lng))
        if lat == 42.8:
            raise RuntimeError("boom")
        return 7

    same_building = [{"lat": 42.9, "lng": 71.3}, {"lat": 42.900001, "lng": 71.300002}]
    listings = same_building + [{"lat": 42.8, "lng": 71.3}, {"lat": None, "lng": None}]
    results, failures = await _geo.lookup_by_location(listings, fetch, 4, "test")
    assert len(seen) == 2  # two buildings, not four listings
    assert failures == 1
    assert results == {(42.9, 71.3): 7}  # the failed location is absent => unknown, not 0


@pytest.mark.asyncio
async def test_cached_locations_cost_no_requests(monkeypatch):
    from app.agents.nodes import _geo

    monkeypatch.setattr(_geo, "get_json_many", AsyncMock(return_value={"p:42.9,71.3": 5}))
    store = AsyncMock()
    monkeypatch.setattr(_geo, "set_json_many", store)
    fetch = AsyncMock(return_value=9)
    results, failures = await _geo.lookup_by_location(
        [{"lat": 42.9, "lng": 71.3}, {"lat": 42.8, "lng": 71.2}], fetch, 4, "test", cache_prefix="p", cache_ttl=60)
    assert results == {(42.9, 71.3): 5, (42.8, 71.2): 9}
    assert fetch.await_count == 1
    assert store.await_args.args[0] == {"p:42.8,71.2": 9}  # only the new result is written


# ── LLM ──────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_empty_llm_answer_is_retried_then_escalated_to_the_stronger_model(monkeypatch):
    from app.services import llm

    models: list[str] = []

    async def once(system, user, tools, model, max_tokens):
        models.append(model)
        if model == llm.FAST_MODEL:
            raise llm.EmptyResponse("MALFORMED_FUNCTION_CALL")
        return {"function_name": "f", "arguments": {"ok": True}}

    monkeypatch.setattr(llm, "_call_with_tools_once", once)
    result = await llm.call_gemini_with_tools("s", "u", tools=[])
    assert result["arguments"] == {"ok": True}
    assert models == [llm.FAST_MODEL, llm.FAST_MODEL, llm.MODEL]


@pytest.mark.asyncio
async def test_persistently_empty_llm_answer_raises_instead_of_returning_an_empty_plan(monkeypatch):
    from app.services import llm

    async def once(*args):
        raise llm.EmptyResponse("empty")

    monkeypatch.setattr(llm, "_call_with_tools_once", once)
    with pytest.raises(llm.EmptyResponse):
        await llm.call_gemini_with_tools("s", "u", tools=[])


def test_thinking_is_capped_so_it_cannot_consume_the_whole_output_budget():
    from app.services import llm

    fast = llm._generation_config("s", 1500, llm.FAST_MODEL)
    quality = llm._generation_config("s", 1500, llm.MODEL)
    assert fast.thinking_config.thinking_budget == 0
    assert quality.thinking_config.thinking_budget == llm.THINKING_BUDGET_QUALITY
    assert quality.max_output_tokens == 1500 + llm.THINKING_BUDGET_QUALITY  # room left for the answer


# ── Event loops (Celery runs each task in a fresh loop) ──────────────────────

def test_clients_are_not_shared_between_event_loops(monkeypatch):
    from app.db import client as db_client

    created: list[object] = []

    async def fake_create(url, key):
        created.append(object())
        return created[-1]

    monkeypatch.setattr(db_client, "acreate_client", fake_create)
    first = asyncio.run(db_client.get_db())
    second = asyncio.run(db_client.get_db())
    assert first is not second  # a client from a closed loop would raise "Event loop is closed"

    async def twice():
        return await db_client.get_db(), await db_client.get_db()

    a, b = asyncio.run(twice())
    assert a is b  # but within one loop it is reused


# ── Validator ────────────────────────────────────────────────────────────────

def _scored(n: int) -> list[dict]:
    return [{"listing_id": str(i), "total_score": 80.0 - i} for i in range(n)]


def test_validator_never_empties_the_result_list():
    from app.agents.nodes.validator import MIN_RESULTS, REJECTED_TOPUP_PENALTY, _apply_validation_results

    scored = _scored(60)
    rejects_everything = [{"listing_id": str(i), "decision": "reject", "reason": "too big"} for i in range(60)]
    kept, _ = _apply_validation_results(scored, rejects_everything)
    assert len(kept) == MIN_RESULTS
    assert kept[0]["listing_id"] == "0"  # the best of the rejected come back first
    assert kept[0]["total_score"] == 80.0 - REJECTED_TOPUP_PENALTY  # but visibly penalised
    assert [k["rank"] for k in kept] == list(range(1, MIN_RESULTS + 1))


def test_validator_drops_rejections_when_enough_listings_remain():
    from app.agents.nodes.validator import _apply_validation_results

    scored = _scored(60)
    decisions = [{"listing_id": str(i), "decision": "reject"} for i in range(10)]
    kept, results = _apply_validation_results(scored, decisions)
    assert len(kept) == 50 and "0" not in {k["listing_id"] for k in kept}
    assert sum(r["decision"] == "reject" for r in results) == 10


# ── Krisha prices ────────────────────────────────────────────────────────────

def price_card(price_html: str, title: str = "Свободное назначение · 400 м²") -> str:
    return f"""
    <div class="a-card" data-product-id="9">
      <div class="a-card__stats-item">Тараз</div><div class="a-card__stats-item">19 окт.</div>
      <a class="a-card__title" href="/a/show/9">{title}</a>
      <div class="a-card__subtitle">Айтеке би 75</div>
      <div class="a-card__price">{price_html}</div>
    </div>"""


def test_monthly_and_per_sqm_prices_are_read_by_their_units():
    html = '1\xa0500\xa0000 <span>₸</span> <span>за месяц</span><br/>5\xa0000 <span>₸</span> <span>за м²</span>'
    listing = KrishaScraper()._parse_index_page(page(price_card(html, "Офисы · 300 м²"), next_page=False), "office")[0]
    assert (listing["price_tenge"], listing["price_per_sqm"]) == (1_500_000, 5_000)


def test_a_per_sqm_only_price_is_never_stored_as_the_monthly_rent():
    """'1 000 ₸ за м²' for 400 m² used to be stored as a 1 000 ₸/month rental."""
    html = '1\xa0000 <span>₸</span> <span>за м²</span>'
    listing = KrishaScraper()._parse_index_page(page(price_card(html), next_page=False), "free")[0]
    assert listing["price_per_sqm"] == 1_000
    assert listing["price_tenge"] == 400_000  # rate x area


def test_a_per_sqm_only_price_without_an_area_leaves_the_monthly_rent_unknown():
    html = '1\xa0000 <span>₸</span> <span>за м²</span>'
    listing = KrishaScraper()._parse_index_page(page(price_card(html, "Свободное назначение"), next_page=False), "free")[0]
    assert listing["price_tenge"] is None  # unknown, not 1 000


# ── Junk prices ──────────────────────────────────────────────────────────────

def _market(n: int = 20) -> list[dict]:
    return [{"id": str(i), "price_tenge": 400_000, "area_sqm": 100.0} for i in range(n)]  # 4 000 ₸/m²


def test_placeholder_rents_are_flagged_and_normal_ones_are_not():
    from app.agents.nodes.searcher import flag_suspect_prices

    listings = _market() + [
        {"id": "junk", "price_tenge": 2_500, "area_sqm": 188.0},      # 13 ₸/m²
        {"id": "cheap-but-real", "price_tenge": 150_000, "area_sqm": 100.0},
        {"id": "no-area", "price_tenge": 1_000, "area_sqm": None},
    ]
    assert flag_suspect_prices(listings) == 1
    flagged = {l["id"] for l in listings if l["price_suspect"]}
    assert flagged == {"junk"}


def test_nothing_is_flagged_when_there_is_too_little_data_to_know_the_market():
    from app.agents.nodes.searcher import flag_suspect_prices

    assert flag_suspect_prices([{"id": "a", "price_tenge": 1_000, "area_sqm": 100.0}]) == 0


def test_a_junk_price_does_not_win_the_budget_score():
    base = {"footfall_raw": 50.0, "competitor_count": 3, "bus_stops_nearby": 3, "area_sqm": 100}
    ranked = scoring.score_listings([
        {**base, "id": "junk", "price_tenge": 2_500, "price_suspect": True},
        {**base, "id": "honest", "price_tenge": 60_000},
    ], "cafe", budget_tenge=300_000)
    by_id = {r["listing_id"]: r for r in ranked}
    assert by_id["junk"]["score_breakdown"]["price"] == scoring.NEUTRAL_SCORE
    assert by_id["honest"]["score_breakdown"]["price"] == pytest.approx(80.0)  # (300k - 60k) / 300k
    assert by_id["junk"]["price_suspect"] is True


# ── Districts from boundary polygons ─────────────────────────────────────────

SQUARE = [[[71.0, 42.0], [71.0, 43.0], [72.0, 43.0], [72.0, 42.0], [71.0, 42.0]]]  # [lng, lat] ring


def test_point_in_polygon_with_a_hole():
    from app.services.districts import polygon_contains

    donut = SQUARE + [[[71.4, 42.4], [71.4, 42.6], [71.6, 42.6], [71.6, 42.4], [71.4, 42.4]]]
    assert polygon_contains(donut, 42.2, 71.2)          # in the ring
    assert not polygon_contains(donut, 42.5, 71.5)      # in the hole
    assert not polygon_contains(donut, 50.0, 71.5)      # outside


def test_district_for_point_picks_the_district_that_contains_it():
    from app.services.districts import district_for_point

    east = [[[72.0, 42.0], [72.0, 43.0], [73.0, 43.0], [73.0, 42.0], [72.0, 42.0]]]
    polygons = {"Aulieata": SQUARE, "ZhibekZholy": east}
    assert district_for_point(polygons, 42.5, 71.5) == "Aulieata"
    assert district_for_point(polygons, 42.5, 72.5) == "ZhibekZholy"
    assert district_for_point(polygons, 10.0, 10.0) is None


@pytest.mark.asyncio
async def test_districts_are_assigned_to_located_listings_only(monkeypatch):
    from app.services import districts

    async def polygons():
        return {"Aulieata": SQUARE}

    monkeypatch.setattr(districts, "get_district_polygons", polygons)
    inside = {"lat": 42.5, "lng": 71.5, "district": None}
    already = {"lat": 42.5, "lng": 71.5, "district": "ZhibekZholy"}
    unlocated = {"lat": None, "lng": None, "district": None}
    changed = await districts.assign_districts([inside, already, unlocated])
    assert changed == [inside] and inside["district"] == "Aulieata"
    assert already["district"] == "ZhibekZholy" and unlocated["district"] is None


@pytest.mark.asyncio
async def test_without_boundaries_no_district_is_invented(monkeypatch):
    from app.services import districts

    async def none():
        return {}

    monkeypatch.setattr(districts, "get_district_polygons", none)
    listing = {"lat": 42.9, "lng": 71.36, "district": None}
    assert await districts.assign_districts([listing]) == []
    assert listing["district"] is None


# ── Display titles ───────────────────────────────────────────────────────────

@pytest.mark.parametrize("raw,expected", [
    ("Свободное назначение, офисы, магазины и бутики, склады, общепит · 300 м²", "Свободное назначение, офисы +3 · 300 м²"),
    ("Общепит · 120 м²", "Общепит · 120 м²"),
    ("Офисы . 550 м²", "Офисы · 550 м²"),
    ("Свободное назначение", "Свободное назначение"),
    ("", ""),
])
def test_short_title(raw, expected):
    from app.services.listing_text import short_title

    assert short_title(raw) == expected


# ── Pre-ranking ──────────────────────────────────────────────────────────────

def test_prerank_prefers_exact_fit_right_size_and_in_budget():
    from app.agents.nodes.searcher import prerank_score

    plan = {"location_requirements": {"min_area_sqm": 40, "max_area_sqm": 80}}
    base = {"use_case_fit": "exact", "area_sqm": 60.0, "price_tenge": 150_000, "raw_data": {}}
    best = prerank_score(base, "cafe", plan, 300_000)
    assert best > prerank_score({**base, "use_case_fit": "generic"}, "cafe", plan, 300_000)
    assert best > prerank_score({**base, "area_sqm": 400.0}, "cafe", plan, 300_000)
    assert best > prerank_score({**base, "price_tenge": 290_000}, "cafe", plan, 300_000)


def test_prerank_does_not_reward_a_junk_price():
    from app.agents.nodes.searcher import prerank_score

    plan = {"location_requirements": {}}
    listing = {"use_case_fit": "exact", "area_sqm": 60.0, "price_tenge": 2_500, "raw_data": {}}
    honest = prerank_score({**listing, "price_tenge": 60_000}, "cafe", plan, 300_000)
    junk = prerank_score({**listing, "price_suspect": True}, "cafe", plan, 300_000)
    assert junk < honest


# ── Bad rows must not break ingestion ────────────────────────────────────────

def test_an_absurd_price_becomes_unknown_instead_of_overflowing_the_database():
    from app.models.listing import ListingUpsert

    row = {**KrishaScraper()._parse_index_page(page(card("1"), next_page=False), "cafe")[0]}
    row["price_tenge"] = 3_750_000_000  # seen on a real ad; INTEGER holds 2 147 483 647
    assert ListingUpsert(**row).price_tenge is None
    row["price_tenge"] = 450_000
    assert ListingUpsert(**row).price_tenge == 450_000


@pytest.mark.asyncio
async def test_one_bad_row_does_not_lose_its_whole_batch(monkeypatch):
    from app.db import queries
    from app.models.listing import ListingUpsert

    stored: list[dict] = []

    class Table:
        def __init__(self): self.payload = None
        def upsert(self, payload, on_conflict=None):
            self.payload = payload
            return self
        async def execute(self):
            rows = self.payload if isinstance(self.payload, list) else [self.payload]
            if any(r["external_id"] == "bad" for r in rows):
                raise RuntimeError("value out of range for type integer")
            stored.extend(rows)
            return SimpleNamespace(data=rows)

    async def fake_db(): return SimpleNamespace(table=lambda name: Table())
    async def passthrough(db, rows): return rows

    monkeypatch.setattr(queries, "get_db", fake_db)
    monkeypatch.setattr(queries, "_current_city_upsert_rows", passthrough)
    base = KrishaScraper()._parse_index_page(page(card("1"), next_page=False), "cafe")[0]
    items = [ListingUpsert(**{**base, "external_id": e}) for e in ("a", "bad", "b")]
    result = await queries.upsert_listings_returning(items)
    assert sorted(r["external_id"] for r in result) == ["a", "b"]  # the good rows survived


# ── OpenStreetMap city data ──────────────────────────────────────────────────

def test_osm_elements_are_sorted_into_our_categories():
    from app.integrations import osm_city

    elements = [
        {"type": "node", "lat": 42.9, "lon": 71.3, "tags": {"highway": "bus_stop"}},
        {"type": "node", "lat": 42.9, "lon": 71.3, "tags": {"amenity": "cafe"}},
        {"type": "way", "center": {"lat": 42.91, "lon": 71.31}, "tags": {"shop": "mall"}},   # ways use `center`
        {"type": "node", "lat": 42.92, "lon": 71.32, "tags": {"office": "company"}},
        {"type": "node", "lat": 42.93, "lon": 71.33, "tags": {"amenity": "school"}},
        {"type": "node", "tags": {"amenity": "cafe"}},                                          # no position: skipped
    ]
    pois = osm_city.parse_elements(elements)
    assert len(pois["bus_stop"]) == 1 and len(pois["food"]) == 1
    assert pois["shops"] == [[42.91, 71.31]]
    assert len(pois["offices"]) == 1
    assert len(pois["anchors"]) == 3  # mall, office, school all draw foot traffic


def test_counting_points_within_a_radius():
    from app.integrations.osm_city import count_within

    points = [[42.9000, 71.3000], [42.9020, 71.3000], [42.9200, 71.3000]]  # 0 m, ~222 m, ~2.2 km
    assert count_within(points, 42.9, 71.3, 300) == 2
    assert count_within(points, 42.9, 71.3, 100) == 1
    assert count_within([], 42.9, 71.3, 300) == 0


@pytest.mark.asyncio
async def test_overpass_falls_back_to_the_next_mirror_and_is_fetched_once_for_parallel_callers(monkeypatch):
    from app.integrations import osm_city

    monkeypatch.setattr(osm_city, "_memo", None)
    monkeypatch.setattr(osm_city, "OVERPASS_MIRRORS", ["https://bad.example/api", "https://good.example/api"])
    monkeypatch.setattr(osm_city, "get_json_many", AsyncMock(return_value={}))
    monkeypatch.setattr(osm_city, "set_json_many", AsyncMock())
    calls: list[str] = []

    class Client:
        def __init__(self, **k): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *a): return None
        async def post(self, url, data=None):
            calls.append(url)
            await asyncio.sleep(0.01)
            if "bad" in url:
                return httpx.Response(200, text="<html>busy</html>", request=httpx.Request("POST", url))
            return httpx.Response(200, json={"elements": [{"lat": 42.9, "lon": 71.3, "tags": {"highway": "bus_stop"}}]},
                                  request=httpx.Request("POST", url))

    monkeypatch.setattr(osm_city.httpx, "AsyncClient", Client)
    results = await asyncio.gather(*[osm_city.get_city_pois() for _ in range(3)])  # the three enrichment nodes
    assert all(r == {"bus_stop": [[42.9, 71.3]]} for r in results)
    assert calls == ["https://bad.example/api", "https://good.example/api"]  # one download, not three
    monkeypatch.setattr(osm_city, "_memo", None)


def test_thin_openstreetmap_data_counts_for_less_than_2gis_measurements():
    """OSM finding "no competitors" is weak evidence, so it must not beat a 2GIS measurement."""
    base = {"footfall_raw": 50.0, "competitor_count": 0, "bus_stops_nearby": 8, "price_tenge": 100, "area_sqm": 100}
    ranked = scoring.score_listings([
        {**base, "id": "osm", "competitor_source": "osm", "transit_source": "osm"},
        {**base, "id": "2gis", "competitor_source": "2gis", "transit_source": "2gis"},
    ], "cafe", budget_tenge=1000)
    by_id = {r["listing_id"]: r["score_breakdown"] for r in ranked}
    assert by_id["2gis"]["competitor"] > by_id["osm"]["competitor"] > scoring.NEUTRAL_SCORE
    assert by_id["osm"]["competitor"] == pytest.approx((by_id["2gis"]["competitor"] + scoring.NEUTRAL_SCORE) / 2)
    assert by_id["2gis"]["transit"] > by_id["osm"]["transit"]
