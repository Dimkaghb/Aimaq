"""Taraz configuration shared by ingestion, search and map data.

District names: https://www.gov.kz/memleket/entities/zhambyl/press/news/details/956493?lang=ru
The bbox is an operational search envelope, NOT an administrative boundary.
Legacy untagged records deliberately remain outside the current-city queries.
"""
import re

CITY_ID = "taraz"
CITY_NAME = "Тараз"
CITY_CENTER = (42.9, 71.3667)
CITY_BOUNDS = (42.75, 71.15, 43.10, 71.60)  # south, west, north, east
DISTRICTS = {"Aulieata": "Аулиеата", "ZhibekZholy": "Жибек жолы"}
DISTRICT_ALIASES = {
    "аулиеата": "Aulieata", "әулиеата": "Aulieata",
    "жибек жолы": "ZhibekZholy", "жібек жолы": "ZhibekZholy",
}


def normalize_district(value: str | None) -> str | None:
    if value is None or not value.strip():
        return None
    if value in DISTRICTS:
        return value
    normalized = re.sub(r"\s+", " ", value.strip().lower())
    if normalized in DISTRICT_ALIASES:
        return DISTRICT_ALIASES[normalized]
    raise ValueError("Choose a Taraz district: Aulieata or ZhibekZholy")


def in_city_bounds(lat: float | None, lng: float | None) -> bool:
    if lat is None or lng is None:
        return False
    south, west, north, east = CITY_BOUNDS
    return south <= lat <= north and west <= lng <= east
