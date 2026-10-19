/** Visual language of the map overlays: the results page palette (powder blue, sage, terracotta). */

import type { HeatmapLayer } from "@/lib/api";

export interface LayerTheme {
  label: string;
  /** Solid colour for the active chip and text. */
  color: string;
  /** Pale tint for backgrounds. */
  tint: string;
  /** leaflet.heat gradient: intensity (0-1) -> colour. */
  gradient: Record<number, string>;
  /** Same ramp as a CSS gradient, for the legend. */
  legend: string;
}

function ramp(stops: Array<[number, string]>): { gradient: Record<number, string>; legend: string } {
  return {
    gradient: Object.fromEntries(stops),
    legend: `linear-gradient(90deg, ${stops.map(([at, color]) => `${color} ${Math.round(at * 100)}%`).join(", ")})`,
  };
}

export const LAYER_THEME: Record<HeatmapLayer, LayerTheme> = {
  transit: {
    label: "Транспорт",
    color: "#3f7a8b",
    tint: "#e4f1f5",
    ...ramp([[0.15, "#cfe6ee"], [0.4, "#87bdce"], [0.7, "#4f8799"], [1, "#24505f"]]),
  },
  footfall: {
    label: "Трафик",
    color: "#4f7f68",
    tint: "#e7f1ea",
    ...ramp([[0.15, "#d6e8dc"], [0.4, "#9cc7ab"], [0.7, "#5f9177"], [1, "#2c5642"]]),
  },
  competitors: {
    label: "Конкуренты",
    color: "#a2603f",
    tint: "#f7ebe3",
    ...ramp([[0.15, "#f1d9c9"], [0.4, "#dfac8b"], [0.7, "#b87450"], [1, "#6e3a20"]]),
  },
};

/** Colour of a numbered listing pin: sage for strong matches, amber for middling, clay for weak. */
export function markerColor(score: number): string {
  if (score >= 70) return "#5f9177";
  if (score >= 45) return "#c09a4e";
  return "#b0654a";
}
