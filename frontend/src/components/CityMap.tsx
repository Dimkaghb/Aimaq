"use client";

import { useEffect, useRef, useCallback, useState, type CSSProperties } from "react";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  ZoomControl,
  useMap,
} from "react-leaflet";
import { useLocationIQStore } from "@/store/useLocationIQStore";
import { LAYER_THEME, markerColor } from "@/lib/map-theme";
import { fetchHeatmap } from "@/lib/api";
import type { HeatmapLayer, HeatmapMeta } from "@/lib/api";
import type { Map as LeafletMap, Layer } from "leaflet";
import { useMapSync } from "@/hooks/useMapSync";
import { HeatmapOverlay } from "./HeatmapLayer";
import m from "@/modules/search/map.module.css";
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
      const color = markerColor(listing.total_score);
      const isActive = listing.listing_id === activeListingId;

      const html = `<div class="${m.pin} ${isActive ? m.pinActive : ""}" style="--c:${color}">${rank}</div>`;

      const icon = L.divIcon({
        html,
        className: "",
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker([lat, lng], { icon });

      // Built with DOM nodes (not HTML strings): the address comes from a scraped listing.
      const popup = document.createElement("div");
      popup.className = m.popup;
      const title = document.createElement("p");
      title.className = m.popupTitle;
      title.textContent = listing.address;
      const row = document.createElement("p");
      row.className = m.popupRow;
      row.style.setProperty("--c", color);
      const dot = document.createElement("span");
      dot.className = m.popupDot;
      const score = document.createElement("span");
      score.innerHTML = `Оценка <span class="${m.popupStrong}">${Math.round(listing.total_score)}</span> / 100`;
      row.append(dot, score);
      popup.append(title, row);
      marker.bindPopup(popup, { closeButton: false, offset: [0, -16] });

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

// ── Layer picker (with the active layer's legend) ───────────────────────────

const LAYER_ICONS: Record<HeatmapLayer, React.ReactNode> = {
  transit: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="3" width="16" height="14" rx="3" /><path d="M4 11h16M8 21l1.5-4M16 21l-1.5-4" /><circle cx="8.5" cy="14" r=".6" /><circle cx="15.5" cy="14" r=".6" />
    </svg>
  ),
  footfall: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="7" r="3.5" /><path d="M2.5 21v-1.5a5 5 0 0 1 5-5h3a5 5 0 0 1 5 5V21M16 3.4a3.5 3.5 0 0 1 0 6.7M21.5 21v-1.5a5 5 0 0 0-3.5-4.8" />
    </svg>
  ),
  competitors: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m3 9 2-6h14l2 6M4 12v9h16v-9M9 21v-7h6v7M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0Z" />
    </svg>
  ),
};

const LAYER_ORDER: HeatmapLayer[] = ["transit", "footfall", "competitors"];

function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

type PanelStatus =
  | { kind: "idle" }
  | { kind: "error" }
  | { kind: "ready"; count: number; meta?: HeatmapMeta };

function LayerPanel() {
  const latestRequest = useRef(0);
  const [status, setStatus] = useState<PanelStatus>({ kind: "idle" });
  useEffect(() => () => { latestRequest.current += 1; }, []);
  const activeHeatmap = useLocationIQStore((s) => s.activeHeatmap);
  const setActiveHeatmap = useLocationIQStore((s) => s.setActiveHeatmap);
  const setHeatmapPoints = useLocationIQStore((s) => s.setHeatmapPoints);
  const heatmapLoading = useLocationIQStore((s) => s.heatmapLoading);
  const setHeatmapLoading = useLocationIQStore((s) => s.setHeatmapLoading);
  const businessType = useLocationIQStore((s) => s.businessType);

  const load = useCallback(
    async (layer: HeatmapLayer) => {
      const request = ++latestRequest.current;
      setActiveHeatmap(layer);
      setHeatmapLoading(true);
      setHeatmapPoints([]);
      setStatus({ kind: "idle" });
      try {
        const res = await fetchHeatmap(layer, businessType ?? undefined);
        if (request !== latestRequest.current) return;
        setHeatmapPoints(res.points);
        setStatus(res.points.length ? { kind: "ready", count: res.count, meta: res.meta } : { kind: "error" });
      } catch {
        if (request !== latestRequest.current) return;
        setHeatmapPoints([]);
        setStatus({ kind: "error" });
      } finally {
        if (request === latestRequest.current) setHeatmapLoading(false);
      }
    },
    [businessType, setActiveHeatmap, setHeatmapLoading, setHeatmapPoints],
  );

  const toggle = useCallback(
    (layer: HeatmapLayer) => {
      if (activeHeatmap === layer) {
        latestRequest.current += 1; // drop any response still in flight
        setActiveHeatmap(null);
        setHeatmapPoints([]);
        setHeatmapLoading(false);
        setStatus({ kind: "idle" });
        return;
      }
      void load(layer);
    },
    [activeHeatmap, load, setActiveHeatmap, setHeatmapLoading, setHeatmapPoints],
  );

  const theme = activeHeatmap ? LAYER_THEME[activeHeatmap] : null;

  return (
    <div className={m.panel} role="group" aria-label="Слои карты">
      <p className={m.panelTitle}>Слои карты</p>
      {LAYER_ORDER.map((id) => {
        const t = LAYER_THEME[id];
        const active = activeHeatmap === id;
        const loading = heatmapLoading && active;
        return (
          <button
            key={id}
            type="button"
            className={m.layerButton}
            style={{ "--color": t.color, "--tint": t.tint } as CSSProperties}
            aria-pressed={active}
            disabled={loading}
            onClick={() => toggle(id)}
          >
            <span className={m.layerIcon}>{LAYER_ICONS[id]}</span>
            <span className={m.layerName}>{t.label}</span>
            {loading ? <span className={m.spinner} aria-label="Загрузка" /> : <span className={m.switch} aria-hidden="true" />}
          </button>
        );
      })}

      {theme && status.kind === "ready" && (
        <div className={m.legend} role="status">
          <p className={m.legendTitle}>
            {status.meta?.label ?? theme.label} · {status.count}{" "}
            {plural(status.count, "точка", "точки", "точек")}
          </p>
          <div className={m.legendBar} style={{ background: theme.legend }} />
          <div className={m.legendScale}><span>Меньше</span><span>Больше</span></div>
          <p className={m.legendMeta}>Данные OpenStreetMap. Нажмите на карту, чтобы посмотреть, что рядом.</p>
        </div>
      )}
      {activeHeatmap && status.kind === "error" && (
        <div className={m.status} role="status">
          Не удалось загрузить слой. Данные карты подгружаются — попробуйте ещё раз через минуту.
          <br />
          <button type="button" className={m.retry} onClick={() => void load(activeHeatmap)}>Повторить</button>
        </div>
      )}
    </div>
  );
}

// ── Stale banner ────────────────────────────────────────────────────────────

function StaleBanner({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className={m.banner}>
      <span>Параметры изменены — запустите новый поиск</span>
      <button type="button" className={m.bannerButton} onClick={onRefresh}>Обновить</button>
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
    <div className={m.map}>
      <MapContainer
        center={CITY_CENTER}
        zoom={12}
        style={{ width: "100%", height: "100%" }}
        zoomControl={false}
        attributionControl={true}
      >
        {/* Standard OSM tiles, muted by CSS (map.module.css) so a heatmap stays readable on top.
            CARTO's free basemap now requires an API key, so it is not an option. */}
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

      {/* Layer picker (and the active layer's legend): always visible */}
      <LayerPanel />

      {/* Stale banner */}
      {isStale && showListings && <StaleBanner onRefresh={onRefresh} />}
    </div>
  );
}
