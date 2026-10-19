"""Heatmap endpoint: layers come from the cached OSM city data, never an empty 200 on failure."""
import httpx
import pytest
from fastapi import FastAPI

from app.api.v1.routers import heatmap

POIS = {
    "bus_stop": [[42.90, 71.36], [42.91, 71.37]],
    "food": [[42.90, 71.36], [42.92, 71.38]],
    "shops": [[42.93, 71.39]],
    "pharmacies": [[42.94, 71.40]],
    "offices": [[42.95, 71.41]],
    "anchors": [[42.96, 71.42], [42.97, 71.43]],
    "anchors_major": [[42.97, 71.43]],  # also in anchors: the strongest weight must win
}


@pytest.fixture
def client(monkeypatch):
    async def pois():
        return POIS

    monkeypatch.setattr(heatmap, "get_city_pois", pois)
    app = FastAPI()
    app.include_router(heatmap.router, prefix="/api/v1")
    return httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test")


async def fetch(client, layer, **params):
    return await client.get("/api/v1/heatmap", params={"layer": layer, **params})


@pytest.mark.asyncio
async def test_transit_layer_is_the_bus_stops(client):
    body = (await fetch(client, "transit")).json()
    assert body["count"] == 2
    assert {(p["lat"], p["lng"]) for p in body["points"]} == {(42.90, 71.36), (42.91, 71.37)}
    assert body["meta"]["source"] == "OpenStreetMap"


@pytest.mark.asyncio
async def test_competitor_layer_follows_the_business_type(client):
    cafe = (await fetch(client, "competitors", business_type="cafe")).json()
    pharmacy = (await fetch(client, "competitors", business_type="pharmacy")).json()
    assert cafe["count"] == 2 and cafe["meta"]["label"] == "Кафе и рестораны"
    assert pharmacy["count"] == 1 and pharmacy["meta"]["label"] == "Аптеки"
    assert (await fetch(client, "competitors", business_type="office")).json()["count"] == 1


@pytest.mark.asyncio
async def test_competitor_layer_defaults_to_food_when_no_business_is_chosen_yet(client):
    body = (await fetch(client, "competitors")).json()
    assert body["count"] == 2 and body["meta"]["label"] == "Кафе и рестораны"


@pytest.mark.asyncio
async def test_footfall_layer_weights_major_places_higher_and_does_not_double_count(client):
    body = (await fetch(client, "footfall")).json()
    by_place = {(p["lat"], p["lng"]): p["intensity"] for p in body["points"]}
    assert by_place[(42.97, 71.43)] == heatmap.FOOTFALL_WEIGHTS["anchors_major"]   # strongest, once
    assert by_place[(42.96, 71.42)] == heatmap.FOOTFALL_WEIGHTS["anchors"]
    assert by_place[(42.93, 71.39)] == heatmap.FOOTFALL_WEIGHTS["shops"]
    assert body["count"] == len(by_place)


@pytest.mark.asyncio
async def test_points_outside_the_city_are_dropped(client, monkeypatch):
    async def pois():
        return {"bus_stop": [[42.9, 71.36], [55.0, 37.0]]}

    monkeypatch.setattr(heatmap, "get_city_pois", pois)
    assert (await fetch(client, "transit")).json()["count"] == 1


@pytest.mark.asyncio
async def test_unavailable_city_data_is_a_503_not_an_empty_layer(client, monkeypatch):
    async def nothing():
        return None

    monkeypatch.setattr(heatmap, "get_city_pois", nothing)
    resp = await fetch(client, "transit")
    assert resp.status_code == 503
    assert resp.json()["detail"]["code"] == "MAP_DATA_UNAVAILABLE"


@pytest.mark.asyncio
async def test_a_failed_load_is_not_remembered(client, monkeypatch):
    """The old endpoint cached an empty result for 15 minutes after one Overpass timeout."""
    answers = [None, POIS]

    async def flaky():
        return answers.pop(0)

    monkeypatch.setattr(heatmap, "get_city_pois", flaky)
    assert (await fetch(client, "transit")).status_code == 503
    assert (await fetch(client, "transit")).json()["count"] == 2


@pytest.mark.asyncio
async def test_unknown_layer_is_rejected(client):
    assert (await fetch(client, "traffic")).status_code == 422
