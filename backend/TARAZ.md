# Taraz deployment

The active city is Taraz (`taraz`). Configuration lives in `app/city.py`.

- Official districts: Аулиеата / Әулиеата (`Aulieata`) and Жибек жолы / Жібек жолы (`ZhibekZholy`). [Official city announcement](https://www.gov.kz/memleket/entities/zhambyl/press/news/details/956493?lang=ru).
- The map center is 42.9, 71.3667. The operational bbox is 42.75, 71.15, 43.10, 71.60; it is not an administrative polygon.
- Krisha ingestion uses its Taraz feed and requires each card's city to be Тараз. Coordinates outside the operational bbox are rejected. Districts are only assigned when explicitly identified as a district; streets and microdistricts do not imply administrative membership.
- Searches without a district include the whole city. District searches can return fewer results because many ads omit their district.
- Taraz has no metro. Existing nullable metro response fields stay null. Transit uses actual nearby bus stops. No imported street bonuses, district rent medians, or invented district traffic hierarchy are used. Unknown footfall and unspecified-budget price scores use a neutral baseline of 50.

## Existing data

No destructive migration or relabeling is required. New listings carry `raw_data.city = "taraz"`; new sessions carry `status_meta.city = "taraz"`. Every listing/session query and associated dashboard, saved-business, result and heatmap join filters by that metadata. Progress updates retain the city marker. Upserts skip IDs belonging to another city or legacy untagged records. Old queued city searches are ignored.

Existing Almaty records and saved searches remain stored and excluded from the current Taraz experience. The existing `raw_data` and `status_meta` JSONB columns and foreign keys are required; the running database already has them.

`Asia/Almaty` remains the valid IANA timezone for scheduling in Taraz. There is no `Asia/Taraz` timezone.

## Run and verify

From the project root:

```sh
docker compose -f backend/docker-compose.yml up -d
docker compose -f backend/docker-compose.yml restart celery-worker celery-beat
docker compose -f backend/docker-compose.yml exec -T api pytest -q
curl http://localhost:8000/api/v1/health
curl 'http://localhost:8000/api/v1/listings?limit=5'
```

The scheduled scraper refreshes Taraz every six hours. For a bounded initial import, the development endpoint `POST /api/v1/dev/scrape-krisha?max_pages_per_type=1` imports up to one page per property type. Search fetches additional relevant listings and details on demand. Source access-denied responses stop the scraper instance; cached current-city data remains available.

## Location providers

2GIS supplies nearby places and competitors using the server-only `TWOGIS_API_KEY`. Gemini uses `GEMINI_API_KEY`; `GEMINI_MAPS_MODEL` selects a Maps-compatible model (default `gemini-2.5-flash`). The previous unused geocoder settings have been removed.

The authenticated `POST /api/v1/listings/{id}/neighborhood` endpoint generates a Google Maps grounded brief on demand for a Taraz listing. The results page displays all Maps sources directly below the answer. Responses without source citations are rejected, responses are not persisted, and the endpoint sends `Cache-Control: no-store`. Maps prose does not replace measured competitor counts or feed the numerical scoring model.

The interactive map continues to use attributed OpenStreetMap tiles. Gemini Maps grounding is a location-research tool, not a tile service. Reference: https://ai.google.dev/gemini-api/docs/generate-content/maps-grounding
