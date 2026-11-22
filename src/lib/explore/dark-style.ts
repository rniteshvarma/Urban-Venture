/**
 * Map styles for the 3D map sample (/preview/map-3d).
 *
 * "dark": OpenFreeMap vector tiles (free, no key; data © OpenStreetMap
 * contributors) drawn in the site's ink palette, with every OSM building
 * raised in 3D. "satellite": the Esri imagery we already use, with the same
 * 3D buildings on top.
 *
 * In the focus view the map fades the city building layer out and redraws
 * the buildings around the listing from its own GeoJSON (site / within 2 km /
 * beyond), classified by distance in JS — MapLibre's `distance` expression
 * proved unreliable on building polygons from overzoomed tiles.
 */
import type { ExpressionSpecification, FilterSpecification, StyleSpecification } from "maplibre-gl";

export type Base3D = "dark" | "satellite";

const OFM = "https://tiles.openfreemap.org/planet";
export const GLYPHS = "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf";
export const OFM_ATTRIBUTION = '<a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a> · © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>';

export const INK = { bg: "#0D0D12", soft: "#15151C", line: "#2A2A35", text: "#9A9AAA", saffron: "#FFB400" };

/** The city's building layer (vector tiles). */
export const BLD_CITY = "bld-city";
export const NEAR_M = 2000;

const HAS_3D: FilterSpecification = ["!=", ["get", "hide_3d"], true];
export const HEIGHT: ExpressionSpecification = ["coalesce", ["get", "render_height"], 6];
export const BASE_H: ExpressionSpecification = ["coalesce", ["get", "render_min_height"], 0];

export type BuildingTone = "dark" | "sat" | "light";
const BLD_COLORS: Record<BuildingTone, [string, string, string]> = {
  dark: ["#22222C", "#33333F", "#454552"],
  sat: ["#8C8C99", "#B4B4C0", "#D0D0DA"],
  light: ["#D9D6CF", "#C9C5BC", "#B8B3A8"],
};
/** City building opacity per tone (the focus view fades it to 0 and back). */
export const BLD_OPACITY: Record<BuildingTone, number> = { dark: 0.9, sat: 0.7, light: 0.85 };

/** The OpenFreeMap vector source (buildings, roads, labels). */
export const OFM_SOURCE = { type: "vector", url: OFM, attribution: OFM_ATTRIBUTION } as const;

/** Every OSM building raised in 3D from street zoom (needs the "ofm" source). */
export function cityBuildings(tone: BuildingTone): unknown[] {
  const [lo, mid, hi] = BLD_COLORS[tone];
  return [{
    id: BLD_CITY, type: "fill-extrusion", source: "ofm", "source-layer": "building", minzoom: 13, filter: HAS_3D,
    paint: {
      "fill-extrusion-color": ["interpolate", ["linear"], HEIGHT, 0, lo, 60, mid, 150, hi],
      "fill-extrusion-height": HEIGHT, "fill-extrusion-base": BASE_H, "fill-extrusion-opacity": BLD_OPACITY[tone],
      "fill-extrusion-vertical-gradient": true,
    },
  }];
}
const buildings = (sat: boolean) => cityBuildings(sat ? "sat" : "dark");

/** Focus-view building layers over the component's "focus-bld" GeoJSON (property `band`). */
export function focusBuildingLayers(sat: boolean | BuildingTone): unknown[] {
  const tone: BuildingTone = sat === true ? "sat" : sat === false ? "dark" : sat;
  const layer = (band: string, color: string, opacity: number) => ({
    id: `focus-${band}`, type: "fill-extrusion", source: "focus-bld", filter: ["==", ["get", "band"], band],
    paint: { "fill-extrusion-color": color, "fill-extrusion-height": HEIGHT, "fill-extrusion-base": BASE_H, "fill-extrusion-opacity": opacity, "fill-extrusion-vertical-gradient": true },
  });
  return [
    layer("far", tone === "dark" ? "#1C1C24" : tone === "sat" ? "#5A5A66" : "#BDB9B0", tone === "dark" ? 0.35 : 0.3),
    layer("near", tone === "dark" ? "#4A4A58" : tone === "sat" ? "#E6E6EE" : "#8F8A80", 0.92),
    layer("site", INK.saffron, 0.97),
  ];
}

const labels = (sat: boolean): unknown[] => [
  {
    id: "lbl-road", type: "symbol", source: "ofm", "source-layer": "transportation_name", minzoom: 13,
    layout: { "symbol-placement": "line", "text-field": ["coalesce", ["get", "name:en"], ["get", "name"]], "text-font": ["Noto Sans Regular"], "text-size": 11 },
    paint: { "text-color": sat ? "#FFFFFF" : INK.text, "text-halo-color": sat ? "rgba(0,0,0,0.7)" : INK.bg, "text-halo-width": 1.4 },
  },
  {
    id: "lbl-place", type: "symbol", source: "ofm", "source-layer": "place", minzoom: 9,
    filter: ["in", ["get", "class"], ["literal", ["city", "town", "suburb", "neighbourhood", "village"]]],
    layout: {
      "text-field": ["coalesce", ["get", "name:en"], ["get", "name"]], "text-font": ["Noto Sans Bold"],
      "text-size": ["match", ["get", "class"], "city", 15, "town", 13, 11.5], "text-transform": "uppercase", "text-letter-spacing": 0.08,
    },
    paint: { "text-color": sat ? "#FFFFFF" : "#B7B7C6", "text-halo-color": sat ? "rgba(0,0,0,0.75)" : INK.bg, "text-halo-width": 1.6 },
  },
];

export function style3D(base: Base3D): StyleSpecification {
  const sources: Record<string, unknown> = { ofm: OFM_SOURCE };
  let layers: unknown[];

  if (base === "satellite") {
    sources.sat = {
      type: "raster", tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256, attribution: "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics", maxzoom: 19,
    };
    layers = [{ id: "sat", type: "raster", source: "sat" }, ...buildings(true), ...labels(true)];
  } else {
    layers = [
      { id: "bg", type: "background", paint: { "background-color": INK.bg } },
      { id: "landcover", type: "fill", source: "ofm", "source-layer": "landcover", paint: { "fill-color": "#141A16", "fill-opacity": 0.7 } },
      { id: "park", type: "fill", source: "ofm", "source-layer": "park", paint: { "fill-color": "#16201A", "fill-opacity": 0.8 } },
      { id: "water", type: "fill", source: "ofm", "source-layer": "water", paint: { "fill-color": "#0B1622" } },
      {
        id: "road-minor", type: "line", source: "ofm", "source-layer": "transportation", minzoom: 12,
        filter: ["in", ["get", "class"], ["literal", ["minor", "service", "track", "path"]]],
        paint: { "line-color": "#1E1E27", "line-width": ["interpolate", ["linear"], ["zoom"], 12, 0.4, 16, 3] },
      },
      {
        id: "road-major", type: "line", source: "ofm", "source-layer": "transportation",
        filter: ["in", ["get", "class"], ["literal", ["motorway", "trunk", "primary", "secondary", "tertiary"]]],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": ["match", ["get", "class"], ["motorway", "trunk"], "#3A3A48", "#2B2B36"],
          "line-width": ["interpolate", ["linear"], ["zoom"], 9, ["match", ["get", "class"], ["motorway", "trunk"], 1.2, 0.5], 16, ["match", ["get", "class"], ["motorway", "trunk"], 9, 5]],
        },
      },
      {
        id: "rail", type: "line", source: "ofm", "source-layer": "transportation", filter: ["==", ["get", "class"], "rail"],
        paint: { "line-color": "#3A3550", "line-width": 1.2, "line-dasharray": [3, 2] },
      },
      ...buildings(false),
      ...labels(false),
    ];
  }

  return { version: 8, glyphs: GLYPHS, sources, layers, sky: { "sky-color": INK.bg, "horizon-color": "#1A1A22", "fog-color": INK.bg } } as unknown as StyleSpecification;
}
