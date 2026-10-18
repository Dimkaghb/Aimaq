-- Create listings table for storing scraped commercial real estate data
CREATE TABLE IF NOT EXISTS listings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    source TEXT NOT NULL,              -- "krisha" | "olx"
    external_id TEXT NOT NULL,
    title TEXT NOT NULL,
    address TEXT NOT NULL DEFAULT '',
    district TEXT,                      -- Normalized: "Almaly", "Medeu", etc.
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    price_tenge INTEGER,
    price_per_sqm INTEGER,
    area_sqm DOUBLE PRECISION,
    property_type TEXT,                -- "office" | "retail" | "cafe" | "pharmacy" | "free"
    description TEXT,
    url TEXT NOT NULL,
    photo_urls JSONB DEFAULT '[]'::JSONB,
    raw_data JSONB DEFAULT '{}'::JSONB,
    scraped_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint for deduplication
    CONSTRAINT listings_external_source_unique UNIQUE (external_id, source)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_listings_source ON listings (source);
CREATE INDEX IF NOT EXISTS idx_listings_district ON listings (district);
CREATE INDEX IF NOT EXISTS idx_listings_property_type ON listings (property_type);
CREATE INDEX IF NOT EXISTS idx_listings_price ON listings (price_tenge);
CREATE INDEX IF NOT EXISTS idx_listings_area ON listings (area_sqm);
CREATE INDEX IF NOT EXISTS idx_listings_coords ON listings (lat, lng) WHERE lat IS NOT NULL AND lng IS NOT NULL;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_listings_updated_at
    BEFORE UPDATE ON listings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
