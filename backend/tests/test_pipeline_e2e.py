"""The whole search graph (planner -> searcher -> enrichment -> scoring -> validator -> explainer)
run against fakes for Krisha, 2GIS, Gemini, Redis and the database.

These pin the behaviour that was broken: results capped at 5, stale saved rows mixed in,
unknown data scored as excellent, and an LLM judge that could empty the list.
"""
from types import SimpleNamespace

import pytest

from app.agents import graph
from app.agents.nodes import (
    _geo, competitor, explainer, footfall, planner, scoring, searcher, transit, validator,
)
from app.integrations.gis2 import TwoGISKeyError
from app.services.scoring import RESULT_LIMIT


def make_listing(i: int, uses: list[str], price: int = 300_000, area: float = 80.0) -> dict:
    return {
        "source": "krisha", "external_id": str(i), "title": f"Помещение {i} · {area:g} м²",
        "address": f"Улица {i}", "district": None, "lat": None, "lng": None,
        "price_tenge": price, "price_per_sqm": None, "area_sqm": area, "property_type": "free",
        "description": None, "url": f"https://krisha.kz/a/show/{i}", "photo_urls": [],
        "raw_data": {"city": "taraz", "use_cases": uses, "street": f"Улица {i}",
                     "posted_on": "2026-10-18", "seen_at": "2026-10-19T12:00:00+00:00"},
    }


PLAN = {
    "business_profile": {"type": "cafe", "concept": "Кофейня"},
    "location_requirements": {"floor": "any", "min_area_sqm": 40, "max_area_sqm": 160},
    "competitive_context": {"competitor_search_queries": [], "competitor_radius_m": 500, "max_competitors_nearby": 5},
    "scoring_hints": {"footfall_anchor_pois": ["парки", "университеты"], "custom_weight_adjustments": {}},
    "validation_rules": [],
}


class FakeGis:
    """2GIS: every location has a competitor count derived from its latitude."""
    broken = False

    def __init__(self, *a, **k):
        self.fatal_error = None

    async def __aenter__(self): return self
    async def __aexit__(self, *a): return None

    def _check(self):
        if type(self).broken:
            self.fatal_error = TwoGISKeyError("2GIS API key rejected: key is blocked")
            raise self.fatal_error

    async def count_competitors(self, lat, lng, business_type, radius=500):
        self._check()
        return int(round((lat - 42.9) * 10_000)) % 30  # 0..29, deterministic

    async def search_nearby_total(self, lat, lng, query, radius=500):
        self._check()
        return 3

    async def count_transit_stops(self, lat, lng, radius=300):
        self._check()
        return 4


@pytest.fixture
def world(monkeypatch):
    """Patch every external dependency; returns a namespace to tweak per test."""
    w = SimpleNamespace(osm=None, feed_cafe=[], feed_free=[], stale_rows=[{**make_listing(999_999, ["cafe"]), "id": "stale"}], decisions=None)
    FakeGis.broken = False

    async def noop(*a, **k): return None

    for module in (planner, searcher, footfall, competitor, transit, scoring, validator, explainer):
        monkeypatch.setattr(module, "update_pipeline_step", noop)

    async def fetch_type(self, type_id, type_name, max_pages=40):
        return list(w.feed_cafe if type_id == 6 else w.feed_free)

    async def upsert(listings):
        return [{**l.model_dump(), "id": f"id-{l.external_id}"} for l in listings]

    async def recent(since, limit=1000):
        return w.stale_rows  # must never reach the results when the crawl works

    async def geocode(listings, limit=300, fallback_budget=0):
        for l in listings:
            n = int(l["external_id"])
            l["lat"], l["lng"] = 42.9 + n * 0.0001, 71.36 + n * 0.0001

    async def districts(listings):
        changed = []
        for l in listings:
            if not l.get("district") and l.get("lat") is not None:
                l["district"] = "Aulieata" if int(l["external_id"]) % 2 == 0 else "ZhibekZholy"
                changed.append(l)
        return changed

    from app.scrapers.krisha import KrishaScraper
    monkeypatch.setattr(KrishaScraper, "_fetch_type", fetch_type)
    monkeypatch.setattr(searcher, "get_marker", noop)
    monkeypatch.setattr(searcher, "set_marker", noop)
    monkeypatch.setattr(searcher, "upsert_listings_returning", upsert)
    monkeypatch.setattr(searcher, "get_recent_listings", recent)
    monkeypatch.setattr(searcher, "geocode_missing", geocode)
    monkeypatch.setattr(searcher, "assign_districts", districts)
    monkeypatch.setattr(searcher, "_save_coordinates", noop)

    async def city_pois(): return w.osm  # None = OpenStreetMap unavailable
    monkeypatch.setattr("app.integrations.osm_city.get_city_pois", city_pois)

    async def get_none(keys): return {}
    monkeypatch.setattr(_geo, "get_json_many", get_none)
    monkeypatch.setattr(_geo, "set_json_many", noop)
    monkeypatch.setattr("app.integrations.gis2.TwoGISClient", FakeGis)

    async def plan(**kwargs): return {"function_name": "create_search_query", "arguments": {
        "business_profile": PLAN["business_profile"], "location_requirements": PLAN["location_requirements"],
        "competitive_context": PLAN["competitive_context"], "scoring_hints": PLAN["scoring_hints"], "validation_rules": []}}
    monkeypatch.setattr(planner, "call_gemini_with_tools", plan)

    async def validate(system, user_message, tools):
        ids = [line.split("ID: ")[1] for line in user_message.splitlines() if line.startswith("ID: ")]
        decide = w.decisions or (lambda _id: {"decision": "keep", "reason": "ok"})
        return {"arguments": {"decisions": [{"listing_id": i, **decide(i)} for i in ids]}}
    monkeypatch.setattr(validator, "call_gemini_with_tools", validate)

    async def explain(system, user_message, **k): return "Объяснение"
    monkeypatch.setattr(explainer, "call_gemini", explain)
    return w


def initial_state(**overrides) -> dict:
    state = {
        "search_id": "s1", "business_type": "cafe", "business_name": None, "business_description": "кофейня",
        "city": "taraz", "district": None, "budget_tenge": None, "area_sqm_min": None,
        "competitor_tolerance": 5, "weights_override": None, "search_query": None, "planner_reasoning": "",
        "raw_listings": [], "available_count": 0, "footfall_results": [], "competitor_results": [],
        "transit_results": [], "evaluated_count": 0, "scored_listings": [], "top_listings": [],
        "validation_results": [], "explanation": "", "errors": [],
    }
    return {**state, **overrides}


def fill(w, cafe=60, free=100, warehouse=10):
    w.feed_cafe = [make_listing(i, ["cafe"]) for i in range(1, cafe + 1)]
    w.feed_free = [make_listing(1000 + i, ["free"]) for i in range(free)]
    w.feed_free += [make_listing(2000 + i, ["warehouse"]) for i in range(warehouse)]


@pytest.mark.asyncio
async def test_search_returns_the_top_60_of_everything_available(world):
    fill(world)
    out = await graph.pipeline.ainvoke(initial_state())

    top = out["top_listings"]
    assert len(top) == RESULT_LIMIT == 60
    assert out["available_count"] == 170
    assert 60 < out["evaluated_count"] <= searcher.MAX_CANDIDATES  # many more than it returns
    assert [t["rank"] for t in top] == list(range(1, 61))
    assert [t["total_score"] for t in top] == sorted((t["total_score"] for t in top), reverse=True)
    assert out["explanation"] == "Объяснение"


@pytest.mark.asyncio
async def test_spaces_meant_for_something_else_never_appear(world):
    fill(world)
    out = await graph.pipeline.ainvoke(initial_state())
    ids = {t["listing_id"] for t in out["scored_listings"]}
    assert not any(i.startswith("id-2") and len(i) == 7 for i in ids)  # the 2000+ warehouses


@pytest.mark.asyncio
async def test_stale_saved_listings_are_not_mixed_into_a_working_crawl(world):
    fill(world)
    out = await graph.pipeline.ainvoke(initial_state())
    assert "stale" not in {t["listing_id"] for t in out["scored_listings"]}


@pytest.mark.asyncio
async def test_saved_listings_are_the_fallback_only_when_krisha_is_unreachable(world, monkeypatch):
    from app.scrapers.krisha import KrishaScraper

    async def down(self, *a, **k): raise RuntimeError("blocked")
    monkeypatch.setattr(KrishaScraper, "_fetch_type", down)
    world.stale_rows = [{**make_listing(i, ["cafe"]), "id": f"saved-{i}"} for i in range(1, 31)]
    out = await graph.pipeline.ainvoke(initial_state())
    assert len(out["top_listings"]) == 30
    assert any("Krisha временно недоступен" in e for e in out["errors"])


@pytest.mark.asyncio
async def test_a_busier_competitor_field_ranks_lower(world):
    fill(world, cafe=60, free=0, warehouse=0)
    out = await graph.pipeline.ainvoke(initial_state())
    by_competitors = {t["listing_id"]: t["competitor_count"] for t in out["top_listings"]}
    ranked = [by_competitors[t["listing_id"]] for t in out["top_listings"]]
    assert ranked[:10] == sorted(ranked[:10]) or sum(ranked[:10]) < sum(ranked[-10:])  # quieter ones lead


@pytest.mark.asyncio
async def test_when_2gis_is_down_results_still_come_back_with_unknowns_and_a_clear_error(world):
    fill(world)
    FakeGis.broken = True
    out = await graph.pipeline.ainvoke(initial_state())

    top = out["top_listings"]
    assert len(top) == 60
    assert all(t["competitor_count"] is None and t["bus_stops_nearby"] is None for t in top)
    assert any("2GIS API key rejected" in e for e in out["errors"])
    # Unknown is neutral: nothing is scored as "no competitors".
    assert all(t["score_breakdown"]["competitor"] == 50.0 for t in top)


@pytest.mark.asyncio
async def test_a_judge_that_rejects_everything_cannot_empty_the_results(world):
    fill(world)
    world.decisions = lambda _id: {"decision": "reject", "reason": "no"}
    out = await graph.pipeline.ainvoke(initial_state())
    assert len(out["top_listings"]) >= 20  # a literal on purpose: not tied to the constant under test


@pytest.mark.asyncio
async def test_a_chosen_district_excludes_the_other_one(world):
    fill(world)
    out = await graph.pipeline.ainvoke(initial_state(district="Aulieata"))
    assert out["top_listings"], "expected results"
    assert {t["district"] for t in out["top_listings"]} == {"Aulieata"}


@pytest.mark.asyncio
async def test_when_2gis_is_down_openstreetmap_fills_in_and_the_user_is_told(world):
    fill(world)
    FakeGis.broken = True
    # One bus stop and a cafe cluster near the first cafe listings; nothing near the rest.
    world.osm = {
        "bus_stop": [[42.9001, 71.3601]],
        "food": [[42.9001, 71.3601]] * 6,
        "anchors": [[42.9001, 71.3601]] * 3,
    }
    out = await graph.pipeline.ainvoke(initial_state())

    top = out["top_listings"]
    assert len(top) == 60
    assert all(t["competitor_count"] is not None and t["bus_stops_nearby"] is not None for t in top)
    assert any(t["competitor_count"] > 0 for t in top) and any(t["competitor_count"] == 0 for t in top)
    assert any("OpenStreetMap" in e for e in out["errors"])
    assert not any("key rejected" in e for e in out["errors"])  # the user sees the useful message


@pytest.mark.asyncio
async def test_2gis_measurements_are_never_overwritten_by_openstreetmap(world):
    fill(world)
    world.osm = {"bus_stop": [], "food": [], "anchors": []}  # OSM says "nothing anywhere"
    out = await graph.pipeline.ainvoke(initial_state())
    assert any(t["competitor_count"] and t["competitor_count"] > 0 for t in out["top_listings"])
    assert not any("OpenStreetMap" in e for e in out["errors"])
