from datetime import datetime

from pydantic import BaseModel


class Listing(BaseModel):
    """Raw listing as stored in the listings table."""

    id: str | None = None
    source: str  # "krisha" | "olx"
    external_id: str
    title: str
    address: str
    district: str | None = None
    lat: float | None = None
    lng: float | None = None
    price_tenge: int | None = None
    price_per_sqm: int | None = None
    area_sqm: float | None = None
    property_type: str | None = None  # "office" | "retail" | "cafe" | "pharmacy" | "free"
    description: str | None = None
    url: str
    photo_urls: list[str] = []
    raw_data: dict = {}
    scraped_at: datetime | None = None

    model_config = {"str_strip_whitespace": True}


class ListingUpsert(BaseModel):
    """Data shape for upserting a listing into Supabase."""

    source: str
    external_id: str
    title: str
    address: str
    district: str | None = None
    lat: float | None = None
    lng: float | None = None
    price_tenge: int | None = None
    price_per_sqm: int | None = None
    area_sqm: float | None = None
    property_type: str | None = None
    description: str | None = None
    url: str
    photo_urls: list[str] = []
    raw_data: dict = {}

    model_config = {"str_strip_whitespace": True}
