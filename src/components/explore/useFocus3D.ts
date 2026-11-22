"use client";

/**
 * The 3D focus view for the Explore Map. When a listing is selected the map
 * flies in and tilts, and:
 *   • the listing stands in 3D — its real OpenStreetMap buildings lit saffron
 *     where they exist, otherwise towers drawn from the listing's own tower and
 *     floor counts (labelled approximate); plots and land only mark the site;
 *   • buildings within 2 km stay, everything further out is dimmed;
 *   • arcs, 3D beacons and labels run to the nearest station, hospital, ORR
 *     exit… (the same places the accessibility score uses);
 *   • the camera orbits slowly until the visitor takes the controls.
 *
 * MapLibre draws the buildings (from the "ofm" source every base map carries);
 * deck.gl, loaded only on the first focus, draws arcs, beacons, labels and
 * drawn towers, interleaved so they share MapLibre's depth buffer.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Map as MapLibreMap, GeoJSONSource, PaddingOptions } from "maplibre-gl";
import type { MapLibreOverlay } from "@deck.gl/maplibre";

import { focusBuildingLayers, BLD_CITY, BLD_OPACITY, NEAR_M, type BuildingTone } from "@/lib/explore/dark-style";
import { drawSite, type DrawnSite } from "@/lib/explore/towers";

export type FocusKind = "hospital" | "transit" | "orr_exit" | "bus_station" | "airport" | "school" | "college" | "mall" | "job_hub" | "park";

/** Beacon colours per kind of place. */
export const FOCUS_KIND_COLOR: Record<FocusKind, [number, number, number]> = {
  transit: [63, 169, 255],
  orr_exit: [230, 230, 238],
  hospital: [255, 92, 97],
  school: [125, 151, 255],
  college: [176, 122, 232],
  mall: [255, 138, 61],
  job_hub: [217, 144, 90],
  park: [70, 199, 127],
  bus_station: [43, 196, 176],
  airport: [201, 167, 255],
};
const KIND_LABEL: Record<FocusKind, string> = {
  transit: "Rail", orr_exit: "ORR exit", hospital: "Hospital", school: "School", college: "College",
  mall: "Mall", job_hub: "Job hub", park: "Park", bus_station: "Bus station", airport: "Airport",
};

interface NearestPlace { kind: FocusKind; name: string | null; sub: string | null; km: number; lat: number; lng: number; id: string }
export interface FocusData {
  id: string; name: string; lat: number; lng: number; propertyType: string;
  towerCount: number | null; floorsPerTower: string | null; totalLandAcres: number | null; totalUnits: number | null;
  tigerScore: number | null;
  nearest: NearestPlace[];
}

export const FOCUS_BLD_SOURCE = "focus-bld";
const FOCUS_LAYER_IDS = ["focus-far", "focus-near", "focus-site"];

/**
 * (Re-)add the focus building layers in the base map's tone, under `beforeId`
 * (the listing layers), replacing any left over from the previous style.
 */
export function addFocusBuildings(map: MapLibreMap, tone: BuildingTone, beforeId?: string) {
  for (const id of FOCUS_LAYER_IDS) if (map.getLayer(id)) map.removeLayer(id);
  if (!map.getSource(FOCUS_BLD_SOURCE)) map.addSource(FOCUS_BLD_SOURCE, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  const before = beforeId && map.getLayer(beforeId) ? beforeId : undefined;
  for (const l of focusBuildingLayers(tone)) map.addLayer(l as never, before);
}

const kmLabel = (km: number) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`);
const placeLabel = (n: NearestPlace) => (n.kind === "transit" ? (n.sub === "metro" ? "Metro" : "Rail") : KIND_LABEL[n.kind]);
const isBuilt = (t: string) => /apartment|villa/i.test(t);
const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type Deck = {
  MapLibreOverlay: typeof import("@deck.gl/maplibre").MapLibreOverlay;
  L: typeof import("@deck.gl/layers");
};
let deckModules: Promise<Deck> | null = null;
const loadDeck = () =>
  (deckModules ??= Promise.all([import("@deck.gl/maplibre"), import("@deck.gl/layers")]).then(([m, L]) => ({ MapLibreOverlay: m.MapLibreOverlay, L })));

export function useFocus3D({
  mapRef, ready, selectedId, tone, padding, dimLayers,
}: {
  mapRef: React.RefObject<MapLibreMap | null>;
  /** the style and our layers are in place */
  ready: boolean;
  selectedId: string | null;
  tone: BuildingTone;
  /** the part of the map not covered by panels, in map pixels */
  padding: () => PaddingOptions;
  /** listing layers to dim while one listing is in focus: [layerId, paint property, normal value] */
  dimLayers: [string, string, unknown][];
}) {
  const [focus, setFocus] = useState<FocusData | null>(null);
  const [error, setError] = useState(false);
  const [real, setReal] = useState<boolean | null>(null);
  const [siteTop, setSiteTop] = useState(0);
  const [orbit, setOrbit] = useState(true);
  const [activeKind, setActiveKind] = useState<FocusKind | null>(null);
  const [deck, setDeck] = useState<Deck | null>(null);
  const overlayRef = useRef<MapLibreOverlay | null>(null);
  // Latest values for the map callbacks below, synced after each render.
  const toneRef = useRef(tone);
  const paddingRef = useRef(padding);
  const dimRef = useRef(dimLayers);
  useLayoutEffect(() => {
    toneRef.current = tone;
    paddingRef.current = padding;
    dimRef.current = dimLayers;
  });
  /** camera pitch before the first focus, restored on exit */
  const cityPitch = useRef<number | null>(null);

  // The fetched listing only counts while it is still the selected one.
  const current = focus && focus.id === selectedId ? focus : null;
  const drawn: DrawnSite | null = useMemo(() => (current ? drawSite(current) : null), [current]);
  const realShown = current && !isBuilt(current.propertyType) ? false : real;

  // ── Load the selected listing's 3D facts ──
  useEffect(() => {
    if (!selectedId) return;
    let live = true;
    // Reset for the new listing (async, so the render that changed the
    // selection isn't followed by a cascade of synchronous state updates).
    queueMicrotask(() => {
      if (!live) return;
      setError(false); setReal(null); setSiteTop(0); setActiveKind(null); setOrbit(!reducedMotion());
    });
    loadDeck().then((d) => live && setDeck((prev) => prev ?? d)).catch(() => {});
    fetch(`/api/explore/focus/${selectedId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((f: FocusData) => { if (live) setFocus(f); })
      .catch(() => { if (live) { setFocus(null); setError(true); } });
    return () => { live = false; };
  }, [selectedId]);

  // ── The deck.gl overlay, once deck has loaded ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !deck || overlayRef.current) return;
    const overlay = new deck.MapLibreOverlay({ interleaved: true, layers: [] });
    map.addControl(overlay);
    overlayRef.current = overlay;
    return () => {
      try { map.removeControl(overlay); } catch { /* map already removed */ }
      overlayRef.current = null;
    };
  }, [deck, mapRef]);

  // ── Dim the other listings while one is in focus ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    for (const [id, prop, normal] of dimRef.current) {
      if (!map.getLayer(id)) continue;
      const dimmed = typeof normal === "number" ? normal * 0.3 : 0.3;
      map.setPaintProperty(id, prop as never, (current ? dimmed : normal) as never);
    }
  }, [current, ready, mapRef]);

  // ── Buildings: the site lit, 2 km kept, the rest dimmed ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const empty: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };
    // Fade, never hide: a hidden layer stops MapLibre parsing buildings out of
    // newly loaded tiles, and the banding below reads them from those tiles.
    const setCity = (on: boolean) => {
      if (map.getLayer(BLD_CITY)) map.setPaintProperty(BLD_CITY, "fill-extrusion-opacity", on ? BLD_OPACITY[toneRef.current] : 0);
    };
    if (!current || !drawn) {
      setCity(true);
      (map.getSource(FOCUS_BLD_SOURCE) as GeoJSONSource | undefined)?.setData(empty);
      return;
    }

    const built = isBuilt(current.propertyType);
    const siteM = built ? Math.min(drawn.siteRadiusM, 220) : 0;
    const mLng = 111_320 * Math.cos((current.lat * Math.PI) / 180);
    let timer: ReturnType<typeof setTimeout> | undefined;

    const refresh = () => {
      const src = map.getSource(FOCUS_BLD_SOURCE) as GeoJSONSource | undefined;
      if (!src || !map.getSource("ofm")) return;
      setCity(false);
      const features: GeoJSON.Feature[] = [];
      let realHit = false, top = 0;
      // MapLibre's `distance` expression misjudges building polygons from
      // overzoomed tiles, so the banding is done here from each centroid.
      for (const f of map.querySourceFeatures("ofm", { sourceLayer: "building" })) {
        if (f.properties?.hide_3d === true) continue;
        const g = f.geometry;
        const ring = g.type === "Polygon" ? g.coordinates[0] : g.type === "MultiPolygon" ? g.coordinates[0][0] : null;
        if (!ring?.length) continue;
        let x = 0, y = 0;
        for (const [lng, lat] of ring) { x += lng; y += lat; }
        const dist = Math.hypot((x / ring.length - current.lng) * mLng, (y / ring.length - current.lat) * 111_320);
        const band = dist <= siteM ? "site" : dist <= NEAR_M ? "near" : "far";
        const h = Number(f.properties?.render_height ?? 0);
        if (band === "site" && h >= 12) { realHit = true; top = Math.max(top, h); }
        features.push({ type: "Feature", geometry: g, properties: { band, render_height: f.properties?.render_height, render_min_height: f.properties?.render_min_height } });
      }
      src.setData({ type: "FeatureCollection", features });
      if (built) { setReal(realHit); setSiteTop(top); }
    };
    const soon = () => { clearTimeout(timer); timer = setTimeout(refresh, 350); };
    const onData = (e: { sourceId?: string; tile?: unknown }) => { if (e.sourceId === "ofm" && e.tile) soon(); };

    map.on("sourcedata", onData);
    const first = setTimeout(refresh, 2600); // after the fly-in has pulled the tiles
    soon();
    return () => { clearTimeout(timer); clearTimeout(first); map.off("sourcedata", onData); };
  }, [current, drawn, ready, mapRef]);

  // ── Camera: fly in on focus, settle back on exit ──
  const wasFocused = useRef(false);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (current && drawn) {
      if (!wasFocused.current) cityPitch.current = map.getPitch();
      wasFocused.current = true;
      map.flyTo({
        center: [current.lng, current.lat], zoom: drawn.kind === "site-only" ? 15.1 : 16.1, pitch: 62,
        bearing: map.getBearing() - 25, padding: paddingRef.current(), duration: reducedMotion() ? 0 : 2200, essential: true,
      });
      return;
    }
    if (!selectedId && wasFocused.current) {
      wasFocused.current = false;
      map.easeTo({
        pitch: cityPitch.current ?? 0, zoom: Math.min(map.getZoom(), 13.5),
        padding: { top: 0, bottom: 0, left: 0, right: 0 }, duration: reducedMotion() ? 0 : 900,
      });
    }
  }, [current, drawn, selectedId, mapRef]);

  // ── Orbit until the visitor takes the controls ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !current || !orbit) return;
    let raf = 0, last = performance.now();
    const spin = (t: number) => {
      if (!map.isMoving()) map.setBearing(map.getBearing() + (t - last) * 0.004);
      last = t;
      raf = requestAnimationFrame(spin);
    };
    const start = setTimeout(() => { last = performance.now(); raf = requestAnimationFrame(spin); }, 2400);
    const stop = () => setOrbit(false);
    map.on("dragstart", stop);
    map.on("wheel", stop);
    map.on("touchstart", stop);
    return () => {
      clearTimeout(start); cancelAnimationFrame(raf);
      map.off("dragstart", stop); map.off("wheel", stop); map.off("touchstart", stop);
    };
  }, [current, orbit, mapRef]);

  // ── deck.gl layers ──
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay || !deck) return;
    if (!current || !drawn) { overlay.setProps({ layers: [] }); return; }
    const { ArcLayer, ColumnLayer, PolygonLayer, ScatterplotLayer, TextLayer } = deck.L;
    const c: [number, number] = [current.lng, current.lat];
    const near = current.nearest.filter((n) => n.km <= 25);
    const on = (k: FocusKind) => !activeKind || activeKind === k;
    const showDrawn = realShown === false && drawn.blocks.length > 0;
    const font = "Inter, system-ui, sans-serif";
    const rgba = (k: FocusKind, a: number) => [...FOCUS_KIND_COLOR[k], a] as [number, number, number, number];

    overlay.setProps({
      layers: [
        new ScatterplotLayer({
          id: "focus-site", data: [c], getPosition: (d: [number, number]) => d, getRadius: drawn.siteRadiusM, radiusUnits: "meters",
          getFillColor: [255, 180, 0, drawn.kind === "site-only" ? 70 : 38], stroked: true, getLineColor: [255, 180, 0, 230], getLineWidth: 2, lineWidthUnits: "pixels",
        }),
        new ArcLayer<NearestPlace>({
          id: "focus-arcs", data: near, getSourcePosition: () => c, getTargetPosition: (n) => [n.lng, n.lat],
          getSourceColor: [255, 180, 0, 230], getTargetColor: (n) => rgba(n.kind, on(n.kind) ? 240 : 40),
          getWidth: (n) => (activeKind === n.kind ? 5 : 2.5), getHeight: 0.35, greatCircle: false,
          updateTriggers: { getTargetColor: activeKind, getWidth: activeKind },
        }),
        new ColumnLayer<NearestPlace>({
          id: "focus-beacons", data: near, getPosition: (n) => [n.lng, n.lat], diskResolution: 16, radius: 11,
          extruded: true, getElevation: (n) => (activeKind === n.kind ? 150 : 85),
          getFillColor: (n) => rgba(n.kind, on(n.kind) ? 235 : 50),
          material: { ambient: 0.6, diffuse: 0.6, shininess: 40 },
          updateTriggers: { getFillColor: activeKind, getElevation: activeKind },
        }),
        new TextLayer<NearestPlace>({
          id: "focus-beacon-labels", data: near.filter((n) => on(n.kind)), getPosition: (n) => [n.lng, n.lat, activeKind === n.kind ? 175 : 105],
          getText: (n) => `${placeLabel(n)} · ${kmLabel(n.km)}`, getSize: 12, parameters: { depthCompare: "always" }, getColor: [245, 245, 250, 255],
          fontFamily: font, fontWeight: 600, characterSet: "auto",
          background: true, getBackgroundColor: [13, 13, 18, 215], backgroundPadding: [6, 3],
          getBorderColor: (n) => rgba(n.kind, 255), getBorderWidth: 1,
          updateTriggers: { getPosition: activeKind },
        }),
        ...(showDrawn ? [new PolygonLayer<DrawnSite["blocks"][number]>({
          id: "focus-drawn", data: drawn.blocks, getPolygon: (b) => b.polygon, extruded: true, getElevation: (b) => b.heightM,
          getFillColor: [255, 180, 0, 235], getLineColor: [255, 226, 160, 255], wireframe: true, lineWidthMinPixels: 1,
          material: { ambient: 0.55, diffuse: 0.7, shininess: 24 },
        })] : []),
        new TextLayer({
          id: "focus-name", data: [c],
          getPosition: () => [c[0], c[1], Math.max(showDrawn ? Math.max(...drawn.blocks.map((b) => b.heightM)) : 0, realShown ? siteTop : 0, 50) + 35],
          getText: () => current.name, getSize: 14, parameters: { depthCompare: "always" }, getColor: [13, 13, 18, 255], fontFamily: font, fontWeight: 700,
          characterSet: "auto", background: true, getBackgroundColor: [255, 180, 0, 245], backgroundPadding: [8, 4],
        }),
      ],
    });
  }, [current, drawn, realShown, siteTop, activeKind, deck]);

  /** Tap a nearest place: highlight its beacon and frame it with the listing. */
  const pickNearest = useCallback((kind: string) => {
    const map = mapRef.current;
    const n = current?.nearest.find((x) => x.kind === kind);
    if (!map || !current || !n) return;
    const same = activeKind === n.kind;
    setActiveKind(same ? null : n.kind);
    setOrbit(false);
    if (same) return;
    map.fitBounds(
      [[Math.min(current.lng, n.lng), Math.min(current.lat, n.lat)], [Math.max(current.lng, n.lng), Math.max(current.lat, n.lat)]],
      { padding: (() => { const p = paddingRef.current(); return { ...p, top: (p.top ?? 0) + 60 }; })(), maxZoom: 16, pitch: 58, duration: reducedMotion() ? 0 : 1400 },
    );
  }, [current, activeKind, mapRef]);

  const shapeNote = !current || !drawn ? null
    : realShown === true ? "3D shape: real building outlines from OpenStreetMap"
    : realShown === null ? "Checking the map for real building outlines…"
    : drawn.note;

  return {
    /** the listing in focus (null while loading, on exit, or when it has no 3D data) */
    focus: current,
    failed: error,
    shapeNote,
    orbit, setOrbit,
    activeKind,
    /** kinds that have a beacon on the map (tap-to-fly works for these) */
    mappedKinds: current ? current.nearest.map((n) => n.kind as string) : [],
    pickNearest,
  };
}
