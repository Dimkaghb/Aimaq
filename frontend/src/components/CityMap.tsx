"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  ZoomControl,
  useMap,
} from "react-leaflet";
import { useLocationIQStore } from "@/store/useLocationIQStore";
import { scoreToColor } from "@/lib/score-utils";
import { fetchHeatmap } from "@/lib/api";
import type { HeatmapLayer } from "@/lib/api";
import type { Map as LeafletMap, Layer } from "leaflet";
import { useMapSync } from "@/hooks/useMapSync";
import { HeatmapOverlay } from "./HeatmapLayer";
import "leaflet/dist/leaflet.css";

const CITY_CENTER: [number, number] = [42.9, 71.3667];


function MapController({
  mapRef,
}: {
  mapRef: React.MutableRefObject<LeafletMap | null>;
}) {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
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

      const popup = document.createElement("div");
      popup.style.cssText = "font-family:inherit;min-width:160px;padding:4px";
      const title = document.createElement("strong");
      title.textContent = listing.address;
      const score = document.createElement("p");
      score.textContent = `Оценка: ${listing.total_score} / 100`;
      score.style.cssText = "font-size:12px;color:#67828c;margin:5px 0 0";
      popup.append(title, score);
      marker.bindPopup(popup, { closeButton: false, offset: [0, -18] });

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
  const latestRequest = useRef(0);
  const [message, setMessage] = useState("");
  useEffect(() => () => { latestRequest.current += 1; }, []);
  const activeHeatmap = useLocationIQStore((s) => s.activeHeatmap);
  const setActiveHeatmap = useLocationIQStore((s) => s.setActiveHeatmap);
  const setHeatmapPoints = useLocationIQStore((s) => s.setHeatmapPoints);
  const heatmapLoading = useLocationIQStore((s) => s.heatmapLoading);
  const setHeatmapLoading = useLocationIQStore((s) => s.setHeatmapLoading);
  const businessType = useLocationIQStore((s) => s.businessType);

  const handleToggle = useCallback(
    async (layer: HeatmapLayer) => {
      const request = ++latestRequest.current;
      setMessage("");
      if (activeHeatmap === layer) {
        // Toggle off
        setActiveHeatmap(null);
        setHeatmapPoints([]);
        setHeatmapLoading(false);
        return;
      }

      setActiveHeatmap(layer);
      setHeatmapLoading(true);
      setHeatmapPoints([]);

      try {
        const res = await fetchHeatmap(layer, businessType ?? undefined);
        if (request !== latestRequest.current) return;
        setHeatmapPoints(res.points);
        if (!res.points.length) setMessage("В этом слое пока нет данных.");
      } catch {
        if (request !== latestRequest.current) return;
        setHeatmapPoints([]);
        setMessage("Не удалось загрузить слой. Попробуйте снова.");
      } finally {
        if (request === latestRequest.current) setHeatmapLoading(false);
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
            aria-pressed={isActive}
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
      {message && <p role="status" style={{ maxWidth: 190, fontSize: 11, padding: 10, background: "white", borderRadius: 8, color: "#657e89" }}>{message}</p>}
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

// ── Main CityMap ──────────────────────────────────────────────────────────

interface CityMapProps {
  isStale: boolean;
  onRefresh: () => void;
}

export function CityMap({ isStale, onRefresh }: CityMapProps) {
  const mapRef = useRef<LeafletMap | null>(null);
  const appState = useLocationIQStore((s) => s.appState);
  const activeHeatmap = useLocationIQStore((s) => s.activeHeatmap);
  const heatmapPoints = useLocationIQStore((s) => s.heatmapPoints);

  const showListings =
    appState === "results" || appState === "detail" || appState === "contact";


  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={CITY_CENTER}
        zoom={12}
        style={{ width: "100%", height: "100%" }}
        zoomControl={false}
        attributionControl={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />


        {showListings && <ListingMarkers />}

        {activeHeatmap && heatmapPoints.length > 0 && (
          <HeatmapOverlay points={heatmapPoints} layer={activeHeatmap} />
        )}

        <ZoomControl position="bottomright" />
        <MapController mapRef={mapRef} />
      </MapContainer>

      {/* Heatmap layer picker — always visible */}
      <HeatmapControls />

      {activeHeatmap && <HeatmapLegend layer={activeHeatmap} />}

      {/* Stale banner */}
      {isStale && showListings && <StaleBanner onRefresh={onRefresh} />}
    </div>
  );
}
