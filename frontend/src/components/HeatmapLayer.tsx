"use client";

import { useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";
import "leaflet.heat";

import type { HeatmapPoint } from "@/lib/api";
import type { HeatmapLayer as HeatmapLayerType } from "@/lib/api";

// ── Per-layer visual config ─────────────────────────────────────────────────

interface LayerConfig {
  baseRadius: number;
  baseBlur: number;
  max: number;
  minOpacity: number;
  gradient: Record<number, string>;
  /** Label shown in click popup */
  popupLabel: string;
  /** Unit for the intensity readout */
  popupUnit: string;
}

const LAYER_CONFIG: Record<HeatmapLayerType, LayerConfig> = {
  transit: {
    baseRadius: 14,
    baseBlur: 18,
    max: 1.0,
    minOpacity: 0.04,
    gradient: {
      0.0: "rgba(59,130,246,0)",
      0.15: "rgba(96,165,250,0.1)",
      0.3: "rgba(59,130,246,0.2)",
      0.45: "rgba(37,99,235,0.35)",
      0.6: "rgba(29,78,216,0.48)",
      0.75: "rgba(30,64,175,0.6)",
      0.9: "rgba(30,58,138,0.72)",
      1.0: "rgba(23,37,84,0.82)",
    },
    popupLabel: "Остановок рядом",
    popupUnit: "",
  },
  footfall: {
    baseRadius: 16,
    baseBlur: 22,
    max: 1.0,
    minOpacity: 0.04,
    gradient: {
      0.0: "rgba(13,148,136,0)",
      0.15: "rgba(45,212,191,0.08)",
      0.3: "rgba(13,148,136,0.18)",
      0.45: "rgba(15,118,110,0.3)",
      0.6: "rgba(17,94,89,0.42)",
      0.75: "rgba(19,78,74,0.55)",
      0.9: "rgba(6,95,70,0.68)",
      1.0: "rgba(4,47,46,0.78)",
    },
    popupLabel: "Индекс трафика",
    popupUnit: "%",
  },
  competitors: {
    baseRadius: 15,
    baseBlur: 20,
    max: 1.0,
    minOpacity: 0.04,
    gradient: {
      0.0: "rgba(201,80,46,0)",
      0.15: "rgba(251,146,60,0.08)",
      0.3: "rgba(234,88,12,0.18)",
      0.45: "rgba(220,38,38,0.3)",
      0.6: "rgba(185,28,28,0.42)",
      0.75: "rgba(153,27,27,0.55)",
      0.9: "rgba(127,29,29,0.68)",
      1.0: "rgba(69,10,10,0.78)",
    },
    popupLabel: "Конкурентов",
    popupUnit: "",
  },
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
      let totalIntensity = 0;
      let maxIntensity = 0;

      for (const p of points) {
        const d = haversineM(lat, lng, p.lat, p.lng);
        if (d <= searchRadius) {
          nearby++;
          totalIntensity += p.intensity;
          if (p.intensity > maxIntensity) maxIntensity = p.intensity;
        }
      }

      if (nearby === 0) {
        if (popupRef.current) {
          map.closePopup(popupRef.current);
          popupRef.current = null;
        }
        return;
      }

      const cfg = LAYER_CONFIG[layer];
      const avg = totalIntensity / nearby;
      const pct = Math.round(avg * 100);

      let detail = "";
      if (layer === "transit") {
        detail = `<strong>${nearby}</strong> ${cfg.popupLabel}`;
      } else if (layer === "footfall") {
        detail = `${cfg.popupLabel}: <strong>${pct}${cfg.popupUnit}</strong>`;
      } else {
        detail = `${cfg.popupLabel}: <strong>${nearby}</strong>`;
      }

      const levelLabel =
        pct >= 70 ? "Высокий" : pct >= 40 ? "Средний" : "Низкий";
      const levelColor =
        pct >= 70
          ? "var(--accent-orange)"
          : pct >= 40
            ? "var(--accent-yellow)"
            : "var(--accent-green)";

      const html = `
        <div style="font-family:var(--font-plus-jakarta),sans-serif;min-width:140px;padding:2px 0">
          <p style="font-size:13px;margin:0 0 6px;color:var(--neutral-30)">${detail}</p>
          <div style="display:flex;align-items:center;gap:6px">
            <span style="width:8px;height:8px;border-radius:50%;background:${levelColor};flex-shrink:0"></span>
            <span style="font-size:12px;color:var(--neutral-10)">${levelLabel}</span>
          </div>
        </div>
      `;

      if (popupRef.current) {
        map.closePopup(popupRef.current);
      }

      const popup = L.popup({
        closeButton: false,
        offset: [0, -4],
        className: "liq-heatmap-popup",
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
      max: cfg.max,
      maxZoom: 18,
      minOpacity: cfg.minOpacity,
      gradient: cfg.gradient,
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
