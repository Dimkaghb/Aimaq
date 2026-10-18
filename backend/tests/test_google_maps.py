from types import SimpleNamespace
from unittest.mock import AsyncMock

import httpx
import pytest
from fastapi import HTTPException, Response

from app.integrations.google_maps import (
    MapsUnavailable,
    neighborhood_brief,
    parse_grounded_response,
)


def grounded(text='Рядом есть кафе.'):
    return {'candidates': [{'content': {'parts': [{'text': 'hidden reasoning', 'thought': True}, {'text': text}]},
        'groundingMetadata': {'groundingChunks': [{'maps': {'title': 'Кафе в Таразе', 'uri': 'https://maps.google.com/?cid=123', 'placeAnswerSources': {'reviewSnippets': [{'googleMapsUri': 'https://maps.google.com/review/123'}]}}}]}}]}


def test_maps_answer_keeps_sources_and_omits_thoughts():
    result = parse_grounded_response(grounded())
    assert result['text'] == 'Рядом есть кафе.'
    assert len(result['sources']) == 2
    assert result['sources'][0]['title'] == 'Кафе в Таразе'
    assert result['provider'] == 'Google Maps'


@pytest.mark.parametrize('data', [{}, {'candidates': [{'content': {'parts': [{'text': 'unsupported claim'}]}}]}])
def test_ungrounded_answers_are_not_presented_as_maps_facts(data):
    with pytest.raises(MapsUnavailable):
        parse_grounded_response(data)


def test_unsafe_source_links_are_not_returned():
    data = grounded()
    data['candidates'][0]['groundingMetadata']['groundingChunks'] = [{'maps': {'title': 'Bad link', 'uri': 'javascript:alert(1)'}}]
    with pytest.raises(MapsUnavailable):
        parse_grounded_response(data)


@pytest.mark.asyncio
async def test_real_coordinates_and_maps_tool_sent_in_request(monkeypatch):
    from app.integrations import google_maps
    client = SimpleNamespace(post=AsyncMock(return_value=httpx.Response(200, json=grounded())))
    context = AsyncMock()
    context.__aenter__.return_value = client
    monkeypatch.setattr(google_maps.httpx, 'AsyncClient', lambda **kwargs: context)
    result = await neighborhood_brief({'address': 'Желтоксан 77', 'lat': 42.89, 'lng': 71.37}, 'office')
    sent = client.post.call_args.kwargs['json']
    assert sent['tools'] == [{'googleMaps': {}}]
    assert sent['toolConfig']['retrievalConfig']['latLng'] == {'latitude': 42.89, 'longitude': 71.37}
    assert 'Таразе' in sent['contents'][0]['parts'][0]['text']
    assert result['location_basis'] == 'coordinates'


@pytest.mark.asyncio
async def test_provider_failure_does_not_expose_credentials(monkeypatch):
    from app.integrations import google_maps
    client = SimpleNamespace(post=AsyncMock(return_value=httpx.Response(403, json={'error': 'private provider content'})))
    context = AsyncMock()
    context.__aenter__.return_value = client
    monkeypatch.setattr(google_maps.httpx, 'AsyncClient', lambda **kwargs: context)
    with pytest.raises(MapsUnavailable, match='HTTP 403') as exc:
        await neighborhood_brief({'address': 'Тараз'}, 'cafe')
    assert 'private provider content' not in str(exc.value)


@pytest.mark.asyncio
async def test_brief_route_rejects_listing_outside_city(monkeypatch):
    from app.api.v1.routers.listings import NeighborhoodRequest, get_neighborhood
    from app.db import client
    class Query:
        filters = []
        def select(self, *_): return self
        def eq(self, key, value): self.filters.append((key, value)); return self
        def limit(self, *_): return self
        async def execute(self): return SimpleNamespace(data=[])
    query = Query()
    monkeypatch.setattr(client, 'get_db', AsyncMock(return_value=SimpleNamespace(table=lambda _: query)))
    with pytest.raises(HTTPException) as exc:
        await get_neighborhood('legacy', NeighborhoodRequest(business_type='cafe'), Response(), user_id='user')
    assert exc.value.status_code == 404
    assert ('raw_data->>city', 'taraz') in query.filters


@pytest.mark.asyncio
async def test_planner_requests_structured_tool_output(monkeypatch):
    from app.services import llm
    function = SimpleNamespace(name='confirm', args={'city': 'taraz'})
    response = SimpleNamespace(candidates=[SimpleNamespace(content=SimpleNamespace(parts=[SimpleNamespace(function_call=function)]))])
    generate = AsyncMock(return_value=response)
    monkeypatch.setattr(llm, 'get_gemini_client', lambda: SimpleNamespace(aio=SimpleNamespace(models=SimpleNamespace(generate_content=generate))))
    result = await llm.call_gemini_with_tools('system', 'user', [])
    assert result['arguments']['city'] == 'taraz'
    assert generate.call_args.kwargs['config'].tool_config.function_calling_config.mode == 'ANY'
