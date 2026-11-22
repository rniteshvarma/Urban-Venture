// All MapLibre style objects for the Explore Map, kept out of the component so
// the paint specs are reviewable in one place.

import { NEARBY_CATEGORIES, OSM_CATEGORIES, type OsmCategoryDef } from "@/lib/osm/categories";
import type { StyleSpecification } from "maplibre-gl";
import type { ColorMode } from "./color-modes";
import { colorExpression } from "./color-modes";
import { style3D, cityBuildings, OFM_SOURCE, GLYPHS, type BuildingTone } from "./dark-style";

export const SOURCE_ID = "properties";
export const INFRA_SOURCE_ID = "infrastructure";

// ── Basemaps ─────────────────────────────────────────────────────────
// Esri World Imagery is free and needs no API key, but its attribution must
// stay visible at all times (Constraint 9).
export const ESRI_ATTRIBUTION = "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics";

export type BasemapId = "dark" | "satellite" | "terrain" | "streets";

const ESRI = (service: string) =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/${service}/MapServer/tile/{z}/{y}/{x}`;

export const BASEMAPS: Record<BasemapId, { label: string; tiles: string; attribution: string; labelsOverlay?: string }> = {
  // OpenFreeMap vector tiles in the site's ink palette, every OSM building in
  // 3D (free, no key; built in dark-style.ts — `tiles` is unused here).
  dark: {
    label: "Dark 3D",
    tiles: "",
    attribution: "OpenFreeMap © OpenStreetMap contributors",
  },
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

/** The default base map: dark, with 3D buildings. */
export const DEFAULT_BASEMAP: BasemapId = "dark";

const BUILDING_TONE: Record<BasemapId, BuildingTone> = { dark: "dark", satellite: "sat", terrain: "light", streets: "light" };
export const buildingTone = (id: BasemapId) => BUILDING_TONE[id];

/**
 * A complete MapLibre style. Every base map also carries the OpenFreeMap
 * building layer (3D from street zoom), which the 3D focus view reads to light
 * the selected listing's real buildings and dim the rest.
 */
export function baseStyle(id: BasemapId): StyleSpecification {
  if (id === "dark") return style3D("dark");
  const b = BASEMAPS[id];
  const sources: Record<string, unknown> = {
    basemap: { type: "raster", tiles: [b.tiles], tileSize: 256, attribution: b.attribution, maxzoom: 19 },
  };
  const layers: unknown[] = [{ id: "basemap", type: "raster", source: "basemap" }];

  if (b.labelsOverlay) {
    sources.basemapLabels = { type: "raster", tiles: [b.labelsOverlay], tileSize: 256, maxzoom: 19 };
    layers.push({ id: "basemap-labels", type: "raster", source: "basemapLabels" });
  }
  sources.ofm = OFM_SOURCE;
  layers.push(...cityBuildings(BUILDING_TONE[id]));

  return { version: 8, glyphs: GLYPHS, sources, layers } as unknown as StyleSpecification;
}

// ── Property layers ──────────────────────────────────────────────────
export const CLUSTER_LAYER = "clusters";
export const CLUSTER_COUNT_LAYER = "cluster-count";
export const DOT_LAYER = "property-dots";

export const CLUSTER_GLOW_LAYER = "clusters-glow";
export const DOT_GLOW_LAYER = "property-dots-glow";

const CLUSTER_RADIUS = ["step", ["get", "point_count"], 17, 10, 22, 50, 29, 200, 37, 1000, 46];

/** A soft saffron glow behind each cluster bubble. */
export const clusterGlowLayer = {
  id: CLUSTER_GLOW_LAYER,
  type: "circle" as const,
  source: SOURCE_ID,
  filter: ["has", "point_count"],
  paint: {
    "circle-color": "#FFB400",
    "circle-radius": ["+", CLUSTER_RADIUS, 10],
    "circle-blur": 0.9,
    "circle-opacity": 0.32,
  },
};

/** Ink glass bubble with a saffron ring — reads on dark, satellite and streets. */
export const clusterLayer = {
  id: CLUSTER_LAYER,
  type: "circle" as const,
  source: SOURCE_ID,
  filter: ["has", "point_count"],
  paint: {
    "circle-color": "#15151C",
    "circle-opacity": 0.9,
    "circle-radius": CLUSTER_RADIUS,
    "circle-stroke-width": 2,
    "circle-stroke-color": "#FFB400",
    "circle-stroke-opacity": 0.9,
  },
};

export const clusterCountLayer = {
  id: CLUSTER_COUNT_LAYER,
  type: "symbol" as const,
  source: SOURCE_ID,
  filter: ["has", "point_count"],
  layout: {
    "text-field": ["get", "point_count_abbreviated"],
    "text-font": ["Noto Sans Bold"],
    "text-size": 13,
    "text-allow-overlap": true,
  },
  paint: { "text-color": "#FFE2A0" },
};

/** The glowing halo under each listing dot, in the dot's own colour. */
export function dotGlowLayer(mode: ColorMode) {
  return {
    id: DOT_GLOW_LAYER,
    type: "circle" as const,
    source: SOURCE_ID,
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 13, 10, 15, 14, 19, 16, 24],
      "circle-color": colorExpression(mode),
      "circle-blur": 1,
      "circle-opacity": 0.45,
    },
  };
}

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
      // dot in ink with a glow (dotGlowLayer) so it separates from any base map.
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 6, 10, 7, 14, 9, 16, 11],
      "circle-color": colorExpression(mode),
      "circle-opacity": 1,
      "circle-stroke-width": 1.5,
      "circle-stroke-color": "#0D0D12",
    },
  };
}

// ── Nearby places (OpenStreetMap) ────────────────────────────────────
// Small category-coloured dots drawn under the property dots, so listings stay
// on top and clickable. Shown only from street-ish zoom to keep the city view
// clean. Data © OpenStreetMap contributors.
export const NEARBY_SOURCE_ID = "osm-nearby";
export const NEARBY_LAYER = "osm-nearby-dots";

export function nearbyLayer() {
  const colors = NEARBY_CATEGORIES.flatMap((c) => [c, (OSM_CATEGORIES[c] as OsmCategoryDef).nearby!.color]);
  return {
    id: NEARBY_LAYER,
    type: "circle" as const,
    source: NEARBY_SOURCE_ID,
    minzoom: 11,
    paint: {
      "circle-color": ["match", ["get", "c"], ...colors, "#8A8A99"],
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 3, 14, 5, 16, 7],
      "circle-stroke-width": 1.5,
      "circle-stroke-color": "#0D0D12",
      "circle-opacity": 0.95,
    },
  };
}

// ── 2 km / 5 km rings around the selected home ──────────────────────
export const RING_SOURCE_ID = "selected-rings";
export const RING_2KM_LAYER = "selected-ring-2km";
export const RING_5KM_LAYER = "selected-ring-5km";

export const ring2kmLayer = {
  id: RING_2KM_LAYER,
  type: "line" as const,
  source: RING_SOURCE_ID,
  filter: ["==", ["get", "km"], 2],
  paint: { "line-color": "#FFB400", "line-width": 2, "line-opacity": 0.7 },
};

export const ring5kmLayer = {
  id: RING_5KM_LAYER,
  type: "line" as const,
  source: RING_SOURCE_ID,
  filter: ["==", ["get", "km"], 5],
  paint: { "line-color": "#FFB400", "line-width": 1.5, "line-opacity": 0.5, "line-dasharray": [3, 2] },
};

// ── Hover / selection marker ─────────────────────────────────────────
// Drawn from its own unclustered source, above clusters and dots, so the home a
// buyer is looking at shows even while it sits inside a cluster bubble. A dark
// pin with a white ring reads against every price colour and basemap; the
// selected home also gets a pulsing saffron halo (animated in ExploreMap).
export const HIGHLIGHT_SOURCE_ID = "property-highlight";
export const HIGHLIGHT_HALO_LAYER = "property-highlight-halo";
export const HIGHLIGHT_PIN_LAYER = "property-highlight-pin";
export const HIGHLIGHT_RING_LAYER = "property-highlight-ring";

/** Static halo paint; `pulse` (0–1) grows and fades the selected halo. */
export function highlightHaloPaint(pulse = 0.35) {
  return {
    "circle-radius": ["match", ["get", "kind"], "selected", 18 + 22 * pulse, 16],
    "circle-color": "#FFB400",
    "circle-opacity": ["match", ["get", "kind"], "selected", 0.6 * (1 - pulse), 0.35],
  };
}

export const highlightHaloLayer = {
  id: HIGHLIGHT_HALO_LAYER,
  type: "circle" as const,
  source: HIGHLIGHT_SOURCE_ID,
  paint: highlightHaloPaint(),
};

/** A solid saffron ring that always marks the selected home, pulse or not. */
export const highlightRingLayer = {
  id: HIGHLIGHT_RING_LAYER,
  type: "circle" as const,
  source: HIGHLIGHT_SOURCE_ID,
  filter: ["==", ["get", "kind"], "selected"],
  paint: {
    "circle-radius": 19,
    "circle-color": "rgba(0,0,0,0)",
    "circle-stroke-width": 4,
    "circle-stroke-color": "#FFB400",
  },
};

export const highlightPinLayer = {
  id: HIGHLIGHT_PIN_LAYER,
  type: "circle" as const,
  source: HIGHLIGHT_SOURCE_ID,
  paint: {
    "circle-radius": ["match", ["get", "kind"], "selected", 12, 8],
    "circle-color": "#0D0D12",
    "circle-stroke-width": ["match", ["get", "kind"], "selected", 4, 3],
    "circle-stroke-color": "#FFFFFF",
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
