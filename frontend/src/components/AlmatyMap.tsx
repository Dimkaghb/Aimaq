"use client";

import { useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  useMap,
} from "react-leaflet";
import { useLocationIQStore } from "@/store/useLocationIQStore";
import { ALMATY_DISTRICTS } from "@/lib/almaty-districts";
import { scoreToColor } from "@/lib/score-utils";
import { fetchHeatmap } from "@/lib/api";
import type { HeatmapLayer } from "@/lib/api";
import type { Map as LeafletMap, Layer, GeoJSONOptions } from "leaflet";
import { useMapSync } from "@/hooks/useMapSync";
import { HeatmapOverlay } from "./HeatmapLayer";
import "leaflet/dist/leaflet.css";

const ALMATY_CENTER: [number, number] = [43.238, 76.945];

function footfallToOpacity(score: number): number {
  const min = 40;
  const max = 95;
  return 0.08 + ((score - min) / (max - min)) * 0.35;
}

function MapController({
  mapRef,
}: {
  mapRef: React.MutableRefObject<LeafletMap | null>;
}) {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
  }, [map, mapRef]);
  useMapSync(mapRef);
  return null;
}

function ListingMarkers() {
  const listings = useLocationIQStore((s) => s.listings);
  const activeListingId = useLocationIQStore((s) => s.activeListingId);
  const setActiveListingId = useLocationIQStore((s) => s.setActiveListingId);
  const setExpandedListingId = useLocationIQStore((s) => s.setExpandedListingId);
  const setAppState = useLocationIQStore((s) => s.setAppState);
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const markers: Layer[] = [];

    listings.forEach((listing, index) => {
      const { lat, lng } = listing;
      if (
        typeof lat !== "number" ||
        typeof lng !== "number" ||
        isNaN(lat) ||
        isNaN(lng)
      )
        return;

      const rank = index + 1;
      const color = scoreToColor(listing.total_score);
      const isActive = listing.listing_id === activeListingId;

      const html = `
        <div class="liq-marker ${isActive ? "liq-marker--active" : ""}"
             style="--marker-color: ${color}">
          <span>${rank}</span>
        </div>
      `;

      const icon = L.divIcon({
        html,
        className: "",
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker([lat, lng], { icon });

      marker.bindPopup(
        `<div style="font-family:sans-serif;min-width:160px">
          <p style="font-weight:600;font-size:13px;margin:0 0 4px">${listing.address}</p>
          <p style="font-size:12px;color:#666;margin:0">Оценка: <strong style="color:${color}">${listing.total_score}</strong></p>
        </div>`,
        { closeButton: false, offset: [0, -18] }
      );

      marker.on("click", () => {
        setActiveListingId(listing.listing_id);
        setExpandedListingId(listing.listing_id);
        setAppState("detail");

        const el = document.getElementById(`card-${listing.listing_id}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });

      marker.on("mouseover", () => marker.openPopup());
      marker.on("mouseout", () => marker.closePopup());

      marker.addTo(map);
      markers.push(marker);
    });

    return () => {
      markers.forEach((m) => map.removeLayer(m));
    };
  }, [listings, activeListingId, map, setActiveListingId, setExpandedListingId, setAppState]);

  return null;
}

// ── Heatmap layer picker ────────────────────────────────────────────────────

const HEATMAP_OPTIONS: { id: HeatmapLayer; label: string; icon: React.ReactNode }[] = [
  {
    id: "transit",
    label: "Транспорт",
    icon: (
      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </svg>
    ),
  },
  {
    id: "footfall",
    label: "Трафик",
    icon: (
      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    id: "competitors",
    label: "Конкуренты",
    icon: (
      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 7v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7l-3-5zM3 7h18" />
      </svg>
    ),
  },
];

const HEATMAP_COLORS: Record<HeatmapLayer, string> = {
  transit: "var(--accent-blue)",
  footfall: "#0d9488",
  competitors: "var(--accent-orange)",
};

function HeatmapControls() {
  const activeHeatmap = useLocationIQStore((s) => s.activeHeatmap);
  const setActiveHeatmap = useLocationIQStore((s) => s.setActiveHeatmap);
  const setHeatmapPoints = useLocationIQStore((s) => s.setHeatmapPoints);
  const heatmapLoading = useLocationIQStore((s) => s.heatmapLoading);
  const setHeatmapLoading = useLocationIQStore((s) => s.setHeatmapLoading);
  const businessType = useLocationIQStore((s) => s.businessType);

  const handleToggle = useCallback(
    async (layer: HeatmapLayer) => {
      if (activeHeatmap === layer) {
        // Toggle off
        setActiveHeatmap(null);
        setHeatmapPoints([]);
        return;
      }

      setActiveHeatmap(layer);
      setHeatmapLoading(true);
      setHeatmapPoints([]);

      try {
        const res = await fetchHeatmap(layer, businessType ?? undefined);
        setHeatmapPoints(res.points);
      } catch {
        setHeatmapPoints([]);
      } finally {
        setHeatmapLoading(false);
      }
    },
    [activeHeatmap, businessType, setActiveHeatmap, setHeatmapPoints, setHeatmapLoading],
  );

  return (
    <div
      className="absolute top-4 right-4 z-[1000] flex flex-col"
      style={{ gap: 6 }}
    >
      {HEATMAP_OPTIONS.map((opt) => {
        const isActive = activeHeatmap === opt.id;
        const isLoading = heatmapLoading && activeHeatmap === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => handleToggle(opt.id)}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-full font-medium shadow-sm transition-all hover:shadow-md"
            style={{
              padding: "8px 14px",
              fontSize: 12,
              backgroundColor: isActive ? "rgba(255,255,255,0.98)" : "rgba(255,255,255,0.85)",
              color: isActive ? HEATMAP_COLORS[opt.id] : "var(--neutral-20)",
              border: isActive
                ? `1.5px solid ${HEATMAP_COLORS[opt.id]}`
                : "1.5px solid var(--stroke)",
              backdropFilter: "blur(8px)",
              cursor: isLoading ? "wait" : "pointer",
              opacity: isLoading ? 0.7 : 1,
              whiteSpace: "nowrap",
            }}
          >
            {opt.icon}
            {opt.label}
            {isLoading && (
              <span
                className="inline-block animate-spin rounded-full"
                style={{
                  width: 10,
                  height: 10,
                  border: "1.5px solid var(--stroke)",
                  borderTopColor: HEATMAP_COLORS[opt.id],
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Heatmap legend ──────────────────────────────────────────────────────────

const HEATMAP_LEGENDS: Record<HeatmapLayer, { title: string; gradient: string; border: string }> = {
  transit: {
    title: "Доступность транспорта",
    gradient: "linear-gradient(to right, rgba(59,130,246,0.05), rgba(30,58,138,0.7))",
    border: "1px solid rgba(59,130,246,0.2)",
  },
  footfall: {
    title: "Пешеходный трафик",
    gradient: "linear-gradient(to right, rgba(13,148,136,0.05), rgba(6,95,70,0.7))",
    border: "1px solid rgba(13,148,136,0.2)",
  },
  competitors: {
    title: "Плотность конкурентов",
    gradient: "linear-gradient(to right, rgba(201,80,46,0.05), rgba(127,29,29,0.7))",
    border: "1px solid rgba(201,80,46,0.2)",
  },
};

function HeatmapLegend({ layer }: { layer: HeatmapLayer }) {
  const cfg = HEATMAP_LEGENDS[layer];
  return (
    <div
      className="absolute bottom-6 left-3 z-[1000] rounded-xl px-3 py-2 flex flex-col"
      style={{
        backgroundColor: "rgba(255,255,255,0.9)",
        backdropFilter: "blur(6px)",
        gap: 6,
        fontSize: 11,
        color: "var(--neutral-20)",
        border: "1px solid var(--stroke)",
      }}
    >
      <span className="font-semibold" style={{ fontSize: 11 }}>
        {cfg.title}
      </span>
      <div
        className="rounded-sm"
        style={{
          width: 100,
          height: 8,
          background: cfg.gradient,
          border: cfg.border,
        }}
      />
      <div className="flex justify-between" style={{ fontSize: 10, color: "var(--neutral-10)" }}>
        <span>Низкий</span>
        <span>Высокий</span>
      </div>
    </div>
  );
}

// ── Stale banner ────────────────────────────────────────────────────────────

interface StaleBannerProps {
  onRefresh: () => void;
}

function StaleBanner({ onRefresh }: StaleBannerProps) {
  return (
    <div
      className="absolute top-2 left-1/2 z-[1000] flex items-center gap-2 rounded-xl px-4 py-2 shadow-md"
      style={{
        transform: "translateX(-50%)",
        backgroundColor: "rgba(255,255,255,0.95)",
        border: "1.5px solid var(--stroke)",
        backdropFilter: "blur(8px)",
        fontSize: 13,
        color: "var(--neutral-20)",
        whiteSpace: "nowrap",
      }}
    >
      <span>Параметры изменены — запустите новый поиск</span>
      <button
        type="button"
        onClick={onRefresh}
        className="font-semibold rounded-lg px-2 py-0.5 transition-colors"
        style={{
          fontSize: 12,
          color: "var(--accent-blue)",
          backgroundColor: "var(--blue-10)",
          border: "none",
          cursor: "pointer",
        }}
      >
        Обновить
      </button>
    </div>
  );
}

// ── Main AlmatyMap ──────────────────────────────────────────────────────────

interface AlmatyMapProps {
  isStale: boolean;
  onRefresh: () => void;
}

export function AlmatyMap({ isStale, onRefresh }: AlmatyMapProps) {
  const mapRef = useRef<LeafletMap | null>(null);
  const appState = useLocationIQStore((s) => s.appState);
  const activeHeatmap = useLocationIQStore((s) => s.activeHeatmap);
  const heatmapPoints = useLocationIQStore((s) => s.heatmapPoints);

  const showDistricts = appState === "idle" || appState === "loading";
  const showListings =
    appState === "results" || appState === "detail" || appState === "contact";

  const districtStyle: GeoJSONOptions["style"] = (feature) => {
    const score = (feature?.properties as { footfall_score: number })
      .footfall_score;
    return {
      fillColor: "#0d9488",
      fillOpacity: footfallToOpacity(score),
      color: "#0f766e",
      weight: 1.5,
      opacity: 0.6,
    };
  };

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={ALMATY_CENTER}
        zoom={12}
        style={{ width: "100%", height: "100%" }}
        zoomControl={true}
        attributionControl={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        {showDistricts && !activeHeatmap && (
          <GeoJSON
            key="districts"
            data={ALMATY_DISTRICTS}
            style={districtStyle}
            onEachFeature={(feature, layer) => {
              const name = (feature.properties as { name: string }).name;
              const score = (
                feature.properties as { footfall_score: number }
              ).footfall_score;
              layer.bindTooltip(
                `<div style="font-family:sans-serif;font-size:12px;font-weight:600">${name}</div>
                 <div style="font-size:11px;color:#666">Трафик: ${score}</div>`,
                { sticky: true }
              );
            }}
          />
        )}

        {showListings && <ListingMarkers />}

        {activeHeatmap && heatmapPoints.length > 0 && (
          <HeatmapOverlay points={heatmapPoints} layer={activeHeatmap} />
        )}

        <MapController mapRef={mapRef} />
      </MapContainer>

      {/* Heatmap layer picker — always visible */}
      <HeatmapControls />

      {/* Legend: show heatmap legend when active, district legend when no heatmap and districts shown */}
      {activeHeatmap ? (
        <HeatmapLegend layer={activeHeatmap} />
      ) : (
        showDistricts && (
          <div
            className="absolute bottom-6 left-3 z-[1000] rounded-xl px-3 py-2 flex flex-col"
            style={{
              backgroundColor: "rgba(255,255,255,0.9)",
              backdropFilter: "blur(6px)",
              gap: 6,
              fontSize: 11,
              color: "var(--neutral-20)",
              border: "1px solid var(--stroke)",
            }}
          >
            <span className="font-semibold" style={{ fontSize: 11 }}>
              Коммерческий трафик района
            </span>
            <div
              className="rounded-sm"
              style={{
                width: 100,
                height: 8,
                background: "linear-gradient(to right, rgba(13,148,136,0.1), rgba(13,148,136,0.45))",
                border: "1px solid rgba(13,148,136,0.2)",
              }}
            />
            <div className="flex justify-between" style={{ fontSize: 10, color: "var(--neutral-10)" }}>
              <span>Низкий</span>
              <span>Высокий</span>
            </div>
          </div>
        )
      )}

      {/* Stale banner */}
      {isStale && showListings && <StaleBanner onRefresh={onRefresh} />}
    </div>
  );
}
