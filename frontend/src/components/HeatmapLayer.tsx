"use client";

import { useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";
import "leaflet.heat";

import type { HeatmapPoint } from "@/lib/api";
import type { HeatmapLayer as HeatmapLayerType } from "@/lib/api";
import { LAYER_THEME } from "@/lib/map-theme";
import m from "@/modules/search/map.module.css";

// ── Per-layer visual config ─────────────────────────────────────────────────

interface LayerConfig {
  baseRadius: number;
  baseBlur: number;
  minOpacity: number;
  /** Label shown in the click popup */
  popupLabel: string;
}

// Sparse layers (a few dozen bus stops) need a wider footprint than dense ones (hundreds of
// shops), or they read as isolated dots instead of coverage. Colours come from LAYER_THEME.
const LAYER_CONFIG: Record<HeatmapLayerType, LayerConfig> = {
  transit: { baseRadius: 40, baseBlur: 26, minOpacity: 0.38, popupLabel: "Остановок рядом" },
  footfall: { baseRadius: 20, baseBlur: 20, minOpacity: 0.25, popupLabel: "Мест притяжения рядом" },
  competitors: { baseRadius: 26, baseBlur: 20, minOpacity: 0.3, popupLabel: "Конкурентов рядом" },
};

// Reference zoom level for radius scaling
const REF_ZOOM = 12;

/** Scale radius smoothly based on current zoom relative to reference zoom. */
function scaledRadius(base: number, zoom: number): number {
  // Gentle exponential scaling — prevents jarring jumps
  const factor = Math.pow(1.35, zoom - REF_ZOOM);
  return Math.round(Math.max(6, Math.min(base * factor, 60)));
}

function scaledBlur(base: number, zoom: number): number {
  const factor = Math.pow(1.25, zoom - REF_ZOOM);
  return Math.round(Math.max(4, Math.min(base * factor, 50)));
}

// ── Haversine distance for click radius queries ─────────────────────────────

function haversineM(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Component ───────────────────────────────────────────────────────────────

interface HeatmapLayerProps {
  points: HeatmapPoint[];
  layer: HeatmapLayerType;
}

export function HeatmapOverlay({ points, layer }: HeatmapLayerProps) {
  const map = useMap();
  const heatRef = useRef<L.HeatLayer | null>(null);
  const popupRef = useRef<L.Popup | null>(null);

  // ── Zoom-responsive radius update ──────────────────────────────────────

  const updateRadius = useCallback(() => {
    if (!heatRef.current) return;
    const zoom = map.getZoom();
    const cfg = LAYER_CONFIG[layer];
    heatRef.current.setOptions({
      radius: scaledRadius(cfg.baseRadius, zoom),
      blur: scaledBlur(cfg.baseBlur, zoom),
    });
  }, [map, layer]);

  // ── Click-to-inspect handler ───────────────────────────────────────────

  const handleMapClick = useCallback(
    (e: L.LeafletMouseEvent) => {
      if (points.length === 0) return;

      const { lat, lng } = e.latlng;
      // Search radius in meters — adapts to zoom
      const zoom = map.getZoom();
      const searchRadius = Math.max(100, 800 / Math.pow(1.5, zoom - 12));

      let nearby = 0;
      for (const p of points) {
        if (haversineM(lat, lng, p.lat, p.lng) <= searchRadius) nearby++;
      }

      if (nearby === 0) {
        if (popupRef.current) {
          map.closePopup(popupRef.current);
          popupRef.current = null;
        }
        return;
      }

      const cfg = LAYER_CONFIG[layer];
      const theme = LAYER_THEME[layer];

      // How busy this spot is against the busiest spot on the map, by points nearby.
      const level = nearby >= 6 ? "Высокая" : nearby >= 3 ? "Средняя" : "Низкая";
      const html = `
        <div class="${m.popup}" style="--c:${theme.color}">
          <p class="${m.popupTitle}">${cfg.popupLabel}: ${nearby}</p>
          <p class="${m.popupRow}"><span class="${m.popupDot}"></span>${level} плотность</p>
        </div>`;

      if (popupRef.current) {
        map.closePopup(popupRef.current);
      }

      const popup = L.popup({
        closeButton: false,
        offset: [0, -4],
      })
        .setLatLng(e.latlng)
        .setContent(html)
        .openOn(map);

      popupRef.current = popup;
    },
    [map, points, layer],
  );

  // ── Create / destroy heat layer ────────────────────────────────────────

  useEffect(() => {
    if (heatRef.current) {
      map.removeLayer(heatRef.current);
      heatRef.current = null;
    }
    if (popupRef.current) {
      map.closePopup(popupRef.current);
      popupRef.current = null;
    }

    if (points.length === 0) return;

    const cfg = LAYER_CONFIG[layer];
    const zoom = map.getZoom();
    const latlngs: Array<[number, number, number]> = points.map((p) => [
      p.lat,
      p.lng,
      p.intensity,
    ]);

    const heat = L.heatLayer(latlngs, {
      radius: scaledRadius(cfg.baseRadius, zoom),
      blur: scaledBlur(cfg.baseBlur, zoom),
      max: 1.0,
      maxZoom: 18,
      minOpacity: cfg.minOpacity,
      gradient: LAYER_THEME[layer].gradient,
    });

    heat.addTo(map);
    heatRef.current = heat;

    // Listen to zoom for smooth radius adaptation
    map.on("zoomend", updateRadius);

    // Listen to click for inspect popup
    map.on("click", handleMapClick);

    return () => {
      map.off("zoomend", updateRadius);
      map.off("click", handleMapClick);
      if (popupRef.current) {
        map.closePopup(popupRef.current);
        popupRef.current = null;
      }
      if (heatRef.current) {
        map.removeLayer(heatRef.current);
        heatRef.current = null;
      }
    };
  }, [map, points, layer, updateRadius, handleMapClick]);

  return null;
}
