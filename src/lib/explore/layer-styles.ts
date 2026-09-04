// All MapLibre style objects for the Explore Map, kept out of the component so
// the paint specs are reviewable in one place.

import type { StyleSpecification } from "maplibre-gl";
import type { ColorMode } from "./color-modes";
import { colorExpression } from "./color-modes";

export const SOURCE_ID = "properties";
export const INFRA_SOURCE_ID = "infrastructure";

// ── Basemaps ─────────────────────────────────────────────────────────
// Esri World Imagery is free and needs no API key, but its attribution must
// stay visible at all times (Constraint 9).
export const ESRI_ATTRIBUTION = "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics";

export type BasemapId = "satellite" | "terrain" | "streets";

const ESRI = (service: string) =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/${service}/MapServer/tile/{z}/{y}/{x}`;

export const BASEMAPS: Record<BasemapId, { label: string; tiles: string; attribution: string; labelsOverlay?: string }> = {
  satellite: {
    label: "Satellite",
    tiles: ESRI("World_Imagery"),
    attribution: ESRI_ATTRIBUTION,
    // Place names stay readable over imagery.
    labelsOverlay: ESRI("Reference/World_Boundaries_and_Places"),
  },
  terrain: {
    label: "Terrain",
    tiles: ESRI("World_Terrain_Base"),
    attribution: "Tiles © Esri — Source: Esri, USGS, NOAA",
    labelsOverlay: ESRI("Reference/World_Boundaries_and_Places"),
  },
  streets: {
    label: "Streets",
    tiles: ESRI("World_Street_Map"),
    attribution: "Tiles © Esri — Source: Esri, HERE, Garmin, USGS",
  },
};

/** A complete MapLibre style for a raster basemap (no glyph server needed). */
export function baseStyle(id: BasemapId): StyleSpecification {
  const b = BASEMAPS[id];
  const sources: Record<string, unknown> = {
    basemap: { type: "raster", tiles: [b.tiles], tileSize: 256, attribution: b.attribution, maxzoom: 19 },
  };
  const layers: unknown[] = [{ id: "basemap", type: "raster", source: "basemap" }];

  if (b.labelsOverlay) {
    sources.basemapLabels = { type: "raster", tiles: [b.labelsOverlay], tileSize: 256, maxzoom: 19 };
    layers.push({ id: "basemap-labels", type: "raster", source: "basemapLabels" });
  }

  return { version: 8, sources, layers } as unknown as StyleSpecification;
}

// ── Property layers ──────────────────────────────────────────────────
export const CLUSTER_LAYER = "clusters";
export const CLUSTER_COUNT_LAYER = "cluster-count";
export const DOT_LAYER = "property-dots";
export const SELECTED_LAYER = "property-selected";

export const clusterLayer = {
  id: CLUSTER_LAYER,
  type: "circle" as const,
  source: SOURCE_ID,
  filter: ["has", "point_count"],
  paint: {
    "circle-color": "#2563EB",
    "circle-opacity": 0.92,
    "circle-radius": ["step", ["get", "point_count"], 18, 10, 24, 50, 32, 200, 42, 1000, 54],
    // The wide translucent stroke is what produces the soft glow ring.
    "circle-stroke-width": 8,
    "circle-stroke-color": "#2563EB",
    "circle-stroke-opacity": 0.25,
  },
};

export const clusterCountLayer = {
  id: CLUSTER_COUNT_LAYER,
  type: "symbol" as const,
  source: SOURCE_ID,
  filter: ["has", "point_count"],
  layout: {
    "text-field": ["get", "point_count_abbreviated"],
    "text-size": 13,
    "text-allow-overlap": true,
  },
  paint: { "text-color": "#FFFFFF" },
};

export function dotLayer(mode: ColorMode) {
  return {
    id: DOT_LAYER,
    type: "circle" as const,
    source: SOURCE_ID,
    filter: ["!", ["has", "point_count"]],
    paint: {
      // A 3px dot on satellite imagery is invisible — the basemap is busy,
      // mid-tone and roughly the same warm hue as the price-band colours. Keep
      // a floor of 7px at the zooms people actually browse at, and ring every
      // dot in white so it separates from terrain instead of blending into it.
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 7, 10, 8, 14, 10, 16, 12],
      "circle-color": colorExpression(mode),
      "circle-opacity": 1,
      "circle-stroke-width": 2,
      "circle-stroke-color": "#FFFFFF",
    },
  };
}

/** Keeps the selected pin visible while its card is open. */
export const selectedLayer = {
  id: SELECTED_LAYER,
  type: "circle" as const,
  source: SOURCE_ID,
  filter: ["==", ["get", "id"], "__none__"],
  paint: {
    "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 7, 11, 9, 14, 11, 16, 13],
    "circle-color": "rgba(0,0,0,0)",
    "circle-stroke-width": 3,
    "circle-stroke-color": "#FFB400",
  },
};

// ── Infrastructure layers ────────────────────────────────────────────
// Constraint 6: committed vs uncommitted alignments must never look alike.
export const INFRA_CATEGORY_COLORS: Record<string, string> = {
  ROAD_HIGHWAY: "#38BDF8",
  METRO_RAIL: "#F472B6",
  PHARMA_BIOTECH: "#34D399",
  INDUSTRIAL_ZONE: "#FBBF24",
  IT_TECH_PARK: "#A78BFA",
  TOWNSHIP: "#FB923C",
  LOGISTICS_PARK: "#22D3EE",
  AIRPORT_AVIATION: "#60A5FA",
  GOVT_APPROVAL: "#94A3B8",
  UTILITY: "#94A3B8",
};

export function infraLineLayer(id: string, color: string, confirmed: boolean) {
  return {
    id: `infra-line-${id}`,
    type: "line" as const,
    source: `${INFRA_SOURCE_ID}-${id}`,
    layout: { "line-cap": "round" as const, "line-join": "round" as const },
    paint: {
      "line-color": color,
      // Pending alignments read as muted and dashed.
      "line-width": confirmed ? 4 : 3,
      "line-opacity": confirmed ? 0.95 : 0.55,
      ...(confirmed ? {} : { "line-dasharray": [2, 2] }),
    },
  };
}

export function infraPointLayer(id: string, color: string, confirmed: boolean) {
  return {
    id: `infra-point-${id}`,
    type: "circle" as const,
    source: `${INFRA_SOURCE_ID}-${id}`,
    paint: {
      "circle-radius": 7,
      "circle-color": color,
      "circle-opacity": confirmed ? 0.9 : 0.45,
      "circle-stroke-width": 2,
      "circle-stroke-color": "#FFFFFF",
      "circle-stroke-opacity": confirmed ? 0.9 : 0.5,
    },
  };
}
