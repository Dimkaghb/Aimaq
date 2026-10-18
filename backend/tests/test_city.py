"""Regression tests for switching a populated deployment to Taraz."""
import json
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from pydantic import ValidationError

from app.city import CITY_BOUNDS, CITY_ID, in_city_bounds, normalize_district
from app.models.listing import ListingUpsert, SearchRequest
from app.scrapers.krisha import COMMERCIAL_RENT_URL, KrishaScraper
from app.services.scoring import compute_price_score, nearest_metro_distance
from tests.test_scrapers import SAMPLE_CARD_HTML


@pytest.mark.parametrize('value,expected', [
    (None, None), ('', None), ('Аулиеата', 'Aulieata'), ('Әулиеата', 'Aulieata'),
    ('Жибек жолы', 'ZhibekZholy'), ('Жібек жолы', 'ZhibekZholy'),
    ('ZhibekZholy', 'ZhibekZholy'),
])
def test_supported_districts(value, expected):
    assert normalize_district(value) == expected
    assert SearchRequest(business_type='cafe', district=value).district == expected


@pytest.mark.parametrize('district', ['Almaly', 'Medeu', 'Alatau', 'Алматы'])
def test_search_rejects_old_city_districts(district):
    with pytest.raises(ValidationError):
        SearchRequest(business_type='cafe', district=district)


def test_streets_and_microdistricts_are_not_administrative_districts():
    scraper = KrishaScraper()
    assert scraper._extract_district('ул. Жибек жолы 25') is None
    assert scraper._extract_district('мкр Аулие-Ата, Мамбет батыр 2') is None
    assert scraper._extract_district('район Жібек жолы, ул. Абая') == 'ZhibekZholy'


def test_foreign_city_promoted_cards_are_excluded():
    scraper = KrishaScraper()
    assert scraper._parse_index_page(SAMPLE_CARD_HTML.replace('Тараз', 'Алматы'), 'office') == []
    assert scraper._parse_index_page(SAMPLE_CARD_HTML.replace('Тараз', ''), 'office') == []
    listing = scraper._parse_index_page(SAMPLE_CARD_HTML, 'office')[0]
    assert listing['raw_data']['city'] == CITY_ID
    assert listing['raw_data']['source_city_url'] == COMMERCIAL_RENT_URL
    assert '/taraz/' in COMMERCIAL_RENT_URL


def test_ingestion_requires_city_provenance_and_valid_coordinates():
    row = KrishaScraper()._parse_index_page(SAMPLE_CARD_HTML, 'office')[0]
    assert ListingUpsert(**row).raw_data['city'] == 'taraz'
    with pytest.raises(ValidationError):
        ListingUpsert(**{**row, 'raw_data': {}})
    with pytest.raises(ValidationError):
        ListingUpsert(**{**row, 'lat': 43.238, 'lng': 76.945})
    assert ListingUpsert(**{**row, 'lat': 42.9, 'lng': 71.3667}).lat == 42.9


def test_detail_coordinates_cannot_import_another_city():
    scraper = KrishaScraper()
    def html(lat, lng):
        return '<script>window.data = ' + json.dumps({'advert': {'map': {'lat': lat, 'lon': lng}}}) + ';</script>'
    assert scraper._parse_detail_page(html(43.238, 76.945), '1') is None
    assert scraper._parse_detail_page(html(42.9, 71.3667), '1')['lat'] == 42.9
    assert in_city_bounds(42.9, 71.3667)
    assert not in_city_bounds(float('nan'), 71.3)


def test_no_invented_metro_or_rent_benchmarks():
    assert nearest_metro_distance(42.9, 71.3667) is None
    for district in ('Aulieata', 'ZhibekZholy', None):
        assert compute_price_score(150_000, None, district) == 50
        assert compute_price_score(900_000, None, district) == 50


class Query:
    def __init__(self, response=None):
        self.filters = []
        self.payload = None
        self.execute = AsyncMock(return_value=SimpleNamespace(data=response or [], count=0))
    def select(self, *args, **kwargs):
        return self
    def eq(self, key, value):
        self.filters.append((key, value))
        return self
    def in_(self, *args):
        return self
    def update(self, payload):
        self.payload = payload
        return self


@pytest.mark.asyncio
async def test_progress_keeps_city_and_cannot_modify_legacy_session(monkeypatch):
    from app.db import queries
    query = Query()
    monkeypatch.setattr(queries, 'get_db', AsyncMock(return_value=SimpleNamespace(table=lambda _: query)))
    await queries.update_pipeline_step('session', 'fetching', {'sources': [], 'city': 'almaty'})
    assert query.payload['status_meta'] == {'sources': [], 'city': CITY_ID}
    assert ('status_meta->>city', CITY_ID) in query.filters


@pytest.mark.asyncio
async def test_upsert_preserves_other_city_and_untagged_records():
    from app.db.queries import _current_city_upsert_rows
    query = Query([
        {'source': 'krisha', 'external_id': 'old', 'raw_data': {}},
        {'source': 'krisha', 'external_id': 'foreign', 'raw_data': {'city': 'almaty'}},
        {'source': 'krisha', 'external_id': 'current', 'raw_data': {'city': 'taraz'}},
    ])
    db = SimpleNamespace(table=lambda _: query)
    rows = [{'source': 'krisha', 'external_id': id} for id in ['old', 'foreign', 'current', 'new']]
    result = await _current_city_upsert_rows(db, rows)
    assert [row['external_id'] for row in result] == ['current', 'new']


@pytest.mark.asyncio
async def test_old_queued_search_is_not_run(monkeypatch):
    from app.agents.graph import pipeline
    from app.db import client
    from app.tasks.pipeline import _run_pipeline
    run = AsyncMock()
    monkeypatch.setattr(pipeline, 'ainvoke', run)
    monkeypatch.setattr(client, 'get_db', AsyncMock())
    await _run_pipeline('legacy', {'city': 'almaty'})
    run.assert_not_called()


@pytest.mark.asyncio
async def test_heatmap_uses_taraz_bbox_and_drops_foreign_points(monkeypatch):
    from app.api.v1.routers import heatmap
    from app.integrations.osm import OSMClient
    calls = []
    async def fake_query(self, query):
        calls.append(query)
        return [{'lat': 42.9, 'lon': 71.3667}, {'lat': 43.238, 'lon': 76.945}]
    monkeypatch.setattr(OSMClient, '_query', fake_query)
    monkeypatch.setattr(heatmap, '_cache', {})
    response = await heatmap.get_heatmap(layer='transit')
    assert response['points'] == [{'lat': 42.9, 'lng': 71.3667, 'intensity': 0.5}]
    assert ','.join(str(v) for v in CITY_BOUNDS) in calls[0]
    assert 'taraz:transit:' in heatmap._cache


@pytest.mark.asyncio
async def test_created_search_and_queue_share_city(monkeypatch):
    from unittest.mock import Mock

    from app.api.v1.routers.search import create_search
    from app.db import client
    from app.tasks.pipeline import run_pipeline_task
    query = Query([{'id': 'new-session'}])
    def insert(payload):
        query.payload = payload
        return query
    query.insert = insert
    monkeypatch.setattr(client, 'get_db', AsyncMock(return_value=SimpleNamespace(table=lambda _: query)))
    dispatch = Mock()
    monkeypatch.setattr(run_pipeline_task, 'delay', dispatch)
    result = await create_search(SearchRequest(business_type='cafe'), user_id=None)
    assert result.session_id == 'new-session'
    assert query.payload['status_meta']['city'] == 'taraz'
    assert dispatch.call_args.args[1]['city'] == 'taraz'


@pytest.mark.asyncio
async def test_taraz_refresh_keeps_cached_coordinates():
    from app.agents.nodes.searcher import _deduplicate
    from app.db.queries import _current_city_upsert_rows
    cached = {'id': 'uuid', 'source': 'krisha', 'external_id': 'current',
              'raw_data': {'city': 'taraz'}, 'lat': 42.9, 'lng': 71.3667,
              'price_tenge': 200000}
    fresh = {**cached, 'id': None, 'lat': None, 'lng': None, 'price_tenge': 150000}
    merged = _deduplicate([dict(fresh), cached])[0]
    assert merged['price_tenge'] == 150000
    assert merged['lat'] == 42.9
    assert merged['id'] == 'uuid'
    query = Query([cached])
    rows = await _current_city_upsert_rows(SimpleNamespace(table=lambda _: query), [fresh])
    assert rows[0]['price_tenge'] == 150000
    assert rows[0]['lat'] == 42.9


@pytest.mark.asyncio
async def test_scraper_stops_on_source_access_denial(monkeypatch):
    import httpx
    from app.scrapers import base
    client = SimpleNamespace(get=AsyncMock(return_value=httpx.Response(468)))
    context = AsyncMock()
    context.__aenter__.return_value = client
    monkeypatch.setattr(base.httpx, 'AsyncClient', lambda **kwargs: context)
    monkeypatch.setattr(base.asyncio, 'sleep', AsyncMock())
    scraper = KrishaScraper()
    with pytest.raises(RuntimeError, match='Source denied'):
        await scraper.get(COMMERCIAL_RENT_URL)
    with pytest.raises(RuntimeError, match='disabled'):
        await scraper.get(COMMERCIAL_RENT_URL)
    assert client.get.await_count == 1
