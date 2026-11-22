"use client";

/**
 * 3D map sample (/preview/map-3d) — a design sample under review, not the live
 * /explore map.
 *
 * City view: a dark (or satellite) map with every OpenStreetMap building raised
 * in 3D and each listing as a glowing dot. Pick a listing and the map flies in
 * to a "focus" view:
 *   • the listing in 3D — real OSM buildings where they exist (lit saffron),
 *     otherwise towers drawn from the listing's own tower/floor counts and
 *     labelled "approximate";
 *   • every other building dimmed beyond 2 km ("masked");
 *   • arcs to the nearest hospital, station, ORR exit… with 3D beacons, and
 *     optionally every mapped place within 5 km;
 *   • a slow orbit until the visitor takes the controls.
 *
 * MapLibre draws the map and buildings; deck.gl (interleaved, so it shares the
 * depth buffer) draws arcs, beacons, labels, rings and drawn towers.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Map as MapLibreMap, AttributionControl, setWorkerUrl, type GeoJSONSource, type MapLayerMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapLibreOverlay } from "@deck.gl/maplibre";
import { ArcLayer, ColumnLayer, PolygonLayer, ScatterplotLayer, TextLayer, PathLayer } from "@deck.gl/layers";
import { ArrowLeft, Building2, ExternalLink, Layers3, Orbit, X } from "lucide-react";

import { style3D, focusBuildingLayers, BLD_CITY, NEAR_M, INK, type Base3D } from "@/lib/explore/dark-style";
import { drawSite, type DrawnSite } from "@/lib/explore/towers";
import { circleRing } from "@/lib/osm/geo";
import { formatLakh } from "@/lib/format";
import s from "./Map3D.module.css";

// See ExploreMap.tsx: MapLibre 6's worker is served from /public/maplibre.
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

const HYD = { center: [78.42, 17.42] as [number, number], zoom: 10.4, pitch: 45, bearing: -12 };
const REGION_BBOX = "77.75,16.8,79.1,18.0";

type Kind = "hospital" | "transit" | "orr_exit" | "bus_station" | "airport" | "school" | "college" | "mall" | "job_hub" | "park";
const KIND: Record<Kind, { label: string; color: [number, number, number] }> = {
  transit: { label: "Metro / rail", color: [63, 169, 255] },
  orr_exit: { label: "ORR exit", color: [230, 230, 238] },
  hospital: { label: "Hospital", color: [255, 92, 97] },
  school: { label: "School", color: [125, 151, 255] },
  college: { label: "College", color: [176, 122, 232] },
  mall: { label: "Mall", color: [255, 138, 61] },
  job_hub: { label: "Job hub", color: [217, 144, 90] },
  park: { label: "Park", color: [70, 199, 127] },
  bus_station: { label: "Bus station", color: [43, 196, 176] },
  airport: { label: "Airport", color: [201, 167, 255] },
};
const KIND_ORDER = Object.keys(KIND) as Kind[];
const hex = (c: [number, number, number]) => `rgb(${c.join(",")})`;

interface NearestPlace { kind: Kind; name: string | null; sub: string | null; km: number; lat: number; lng: number; id: string }
interface Place { id: string; kind: Kind; name: string | null; lat: number; lng: number; km: number }
interface Focus {
  id: string; name: string; developer: string | null; area: string | null; lat: number; lng: number; propertyType: string;
  towerCount: number | null; floorsPerTower: string | null; totalLandAcres: number | null; totalUnits: number | null;
  priceLakh: number; priceFrom: boolean; priceMaxLakh: number | null; possession: string | null; rera: boolean;
  tigerScore: number | null; image: string | null;
  accessibility: { score: number; confidence: string; components: { key: string; label: string; points: number; max: number; note: string }[] } | null;
  nearest: NearestPlace[]; places: Place[]; url: string;
}

const kmLabel = (km: number) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`);
const nearestLabel = (n: { kind: Kind; sub?: string | null }) =>
  n.kind === "transit" ? (n.sub === "metro" ? "Metro station" : "Railway station") : KIND[n.kind].label;
const isBuilt = (t: string) => /apartment|villa/i.test(t);

export default function Map3DSample() {
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const deckRef = useRef<MapLibreOverlay | null>(null);
  const orbitRaf = useRef(0);
  const listings = useRef<GeoJSON.FeatureCollection | null>(null);

  const [base, setBase] = useState<Base3D>("dark");
  const baseRef = useRef<Base3D>("dark");
  const [count, setCount] = useState<number | null>(null);
  // ?focus=<id> opens a listing directly (the page renders client-only, so window exists).
  const [focusId, setFocusId] = useState<string | null>(() => new URLSearchParams(window.location.search).get("focus"));
  const [focus, setFocus] = useState<Focus | null>(null);
  const [loading, setLoading] = useState(() => focusId != null);
  const [error, setError] = useState<string | null>(null);
  const [real, setReal] = useState<boolean | null>(null);
  const [siteTop, setSiteTop] = useState(0); // tallest real building on the site, metres
  const [orbit, setOrbit] = useState(true);
  const [allPlaces, setAllPlaces] = useState(false);
  const [activeKind, setActiveKind] = useState<Kind | null>(null);

  const drawn: DrawnSite | null = useMemo(() => (focus ? drawSite(focus) : null), [focus]);
  // Plots and land never claim a real building, whatever stands next door.
  const realShown = focus && !isBuilt(focus.propertyType) ? false : real;

  /** Switch the focused listing (null = back to the city), resetting the view state. */
  const openFocus = useCallback((id: string | null) => {
    setFocusId(id);
    setFocus(null);
    setError(null);
    setReal(null);
    setSiteTop(0);
    setActiveKind(null);
    setOrbit(id != null);
    setLoading(id != null);
  }, []);

  // ── Listing dots (re-added whenever the style is replaced) ──
  const addListingLayers = useCallback((map: MapLibreMap) => {
    if (map.getSource("listings")) return;
    // Focus-view buildings sit under the listing dots.
    map.addSource("focus-bld", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    for (const l of focusBuildingLayers(baseRef.current === "satellite")) map.addLayer(l as never);
    map.addSource("listings", { type: "geojson", data: listings.current ?? { type: "FeatureCollection", features: [] } });
    map.addLayer({
      id: "listing-glow", type: "circle", source: "listings",
      paint: {
        "circle-color": INK.saffron, "circle-blur": 1,
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 6, 13, 14, 16, 26],
        "circle-opacity": ["interpolate", ["linear"], ["zoom"], 9, 0.35, 15, 0.22],
      },
    } as never);
    map.addLayer({
      id: "listing-dot", type: "circle", source: "listings",
      paint: {
        "circle-color": ["match", ["get", "propertyType"], ["RESIDENTIAL_PLOT", "AGRICULTURAL_LAND"], "#FFE2A0", INK.saffron],
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 1.8, 13, 3.5, 16, 6],
        "circle-stroke-color": INK.bg, "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 11, 0, 14, 1.5],
        "circle-opacity": 1,
      },
    } as never);
  }, []);

  // ── Map + deck overlay, once ──
  useEffect(() => {
    if (!box.current || mapRef.current) return;
    const map = new MapLibreMap({
      container: box.current,
      style: style3D("dark"),
      center: HYD.center, zoom: HYD.zoom, pitch: HYD.pitch, bearing: HYD.bearing,
      maxPitch: 75,
      attributionControl: false,
      canvasContextAttributes: { antialias: true },
    });
    mapRef.current = map;
    map.addControl(new AttributionControl({ compact: true }), "bottom-right");
    const overlay = new MapLibreOverlay({ interleaved: true, layers: [] });
    map.addControl(overlay);
    deckRef.current = overlay;
    (window as unknown as { __map3d?: MapLibreMap }).__map3d = map; // for debugging the sample

    map.on("style.load", () => addListingLayers(map));
    map.on("click", "listing-dot", (e: MapLayerMouseEvent) => {
      const id = e.features?.[0]?.properties?.id as string | undefined;
      if (id) openFocus(id);
    });
    map.on("mouseenter", "listing-dot", () => (map.getCanvas().style.cursor = "pointer"));
    map.on("mouseleave", "listing-dot", () => (map.getCanvas().style.cursor = ""));
    // The visitor taking the controls stops the orbit.
    const stop = () => setOrbit(false);
    map.on("dragstart", stop);
    map.on("wheel", stop);
    map.on("touchstart", stop);

    fetch(`/api/explore/properties?bbox=${REGION_BBOX}&zoom=10`)
      .then((r) => r.json())
      .then((fc: GeoJSON.FeatureCollection & { count?: number }) => {
        listings.current = fc;
        setCount(fc.features?.length ?? 0);
        (map.getSource("listings") as GeoJSONSource | undefined)?.setData(fc);
      })
      .catch(() => setCount(0));

    return () => { cancelAnimationFrame(orbitRaf.current); map.remove(); mapRef.current = null; };
  }, [addListingLayers, openFocus]);

  // ── Base map switch ──
  const firstBase = useRef(true);
  useEffect(() => {
    if (firstBase.current) { firstBase.current = false; return; }
    baseRef.current = base;
    mapRef.current?.setStyle(style3D(base));
  }, [base]);

  // ── Load the focused listing ──
  useEffect(() => {
    const url = new URL(window.location.href);
    if (focusId) url.searchParams.set("focus", focusId); else url.searchParams.delete("focus");
    window.history.replaceState(null, "", url);
    if (!focusId) return;
    let live = true;
    fetch(`/api/explore/focus/${focusId}`)
      .then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error || "Could not load this listing"); return j as Focus; })
      .then((f) => { if (live) setFocus(f); })
      .catch((e) => { if (live) { setFocus(null); setError(e.message); } })
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [focusId]);

  // ── Dim the listing dots while one listing is in focus ──
  const applyDots = useCallback(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer("listing-dot")) return;
    map.setPaintProperty("listing-dot", "circle-opacity", focus ? 0.35 : 1);
    map.setPaintProperty("listing-glow", "circle-opacity", focus ? 0.08 : ["interpolate", ["linear"], ["zoom"], 9, 0.35, 15, 0.22]);
  }, [focus]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (map.isStyleLoaded()) applyDots();
    map.on("style.load", applyDots);
    return () => { map.off("style.load", applyDots); };
  }, [applyDots]);

  // ── Buildings in focus: site lit, 2 km kept, the rest dimmed ──
  // The city layer is hidden and the buildings in the loaded tiles are redrawn
  // from our own GeoJSON, banded by their distance from the listing.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const empty: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };
    // Fade, don't hide: a hidden layer stops MapLibre parsing buildings out of
    // newly loaded tiles, and the focus view reads them from those tiles.
    const setCity = (on: boolean) => {
      if (map.getLayer(BLD_CITY)) map.setPaintProperty(BLD_CITY, "fill-extrusion-opacity", on ? (baseRef.current === "satellite" ? 0.7 : 0.9) : 0);
    };

    if (!focus || !drawn) {
      const reset = () => { setCity(true); (map.getSource("focus-bld") as GeoJSONSource | undefined)?.setData(empty); };
      if (map.isStyleLoaded()) reset();
      map.on("style.load", reset);
      return () => { map.off("style.load", reset); };
    }

    const built = isBuilt(focus.propertyType);
    const siteM = built ? Math.min(drawn.siteRadiusM, 220) : 0;
    const mLng = 111_320 * Math.cos((focus.lat * Math.PI) / 180);
    let timer: ReturnType<typeof setTimeout> | undefined;

    const refresh = () => {
      if (!map.getSource("focus-bld")) return;
      setCity(false);
      const features: GeoJSON.Feature[] = [];
      let realHit = false, top = 0;
      for (const f of map.querySourceFeatures("ofm", { sourceLayer: "building" })) {
        if (f.properties?.hide_3d === true) continue;
        const g = f.geometry;
        const ring = g.type === "Polygon" ? g.coordinates[0] : g.type === "MultiPolygon" ? g.coordinates[0][0] : null;
        if (!ring?.length) continue;
        let x = 0, y = 0;
        for (const [lng, lat] of ring) { x += lng; y += lat; }
        const dist = Math.hypot((x / ring.length - focus.lng) * mLng, (y / ring.length - focus.lat) * 111_320);
        const band = dist <= siteM ? "site" : dist <= NEAR_M ? "near" : "far";
        const h = Number(f.properties?.render_height ?? 0);
        if (band === "site" && h >= 12) { realHit = true; top = Math.max(top, h); }
        features.push({ type: "Feature", geometry: g, properties: { band, render_height: f.properties?.render_height, render_min_height: f.properties?.render_min_height } });
      }
      (map.getSource("focus-bld") as GeoJSONSource).setData({ type: "FeatureCollection", features });
      if (built) { setReal(realHit); setSiteTop(top); }
    };
    const soon = () => { clearTimeout(timer); timer = setTimeout(refresh, 350); };
    const onData = (e: { sourceId?: string; tile?: unknown }) => { if (e.sourceId === "ofm" && e.tile) soon(); };

    map.on("sourcedata", onData);
    map.on("style.load", soon);
    const first = setTimeout(refresh, 2600); // after the fly-in has pulled the tiles
    return () => { clearTimeout(timer); clearTimeout(first); map.off("sourcedata", onData); map.off("style.load", soon); };
  }, [focus, drawn]);

  // ── Camera ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!focus || !drawn) {
      if (!focusId) map.flyTo({ ...HYD, padding: { top: 0, bottom: 0, left: 0, right: 0 }, duration: 1400 });
      return;
    }
    // Centre the listing in the part of the map the panel doesn't cover.
    const phone = window.innerWidth < 760;
    map.flyTo({
      center: [focus.lng, focus.lat], zoom: drawn.kind === "site-only" ? 15.1 : 16.1, pitch: 62, bearing: map.getBearing() - 25,
      padding: phone ? { top: 80, bottom: window.innerHeight * 0.48, left: 0, right: 0 } : { top: 0, bottom: 0, left: 0, right: 400 },
      duration: 2200, essential: true,
    });
  }, [focus, drawn, focusId]);

  // ── Orbit ──
  useEffect(() => {
    cancelAnimationFrame(orbitRaf.current);
    const map = mapRef.current;
    if (!map || !focus || !orbit) return;
    let last = performance.now();
    const spin = (t: number) => {
      if (!map.isMoving()) map.setBearing(map.getBearing() + (t - last) * 0.004);
      last = t;
      orbitRaf.current = requestAnimationFrame(spin);
    };
    const start = setTimeout(() => (orbitRaf.current = requestAnimationFrame(spin)), 2400);
    return () => { clearTimeout(start); cancelAnimationFrame(orbitRaf.current); };
  }, [focus, orbit]);

  // ── deck.gl layers ──
  useEffect(() => {
    const overlay = deckRef.current;
    if (!overlay) return;
    if (!focus || !drawn) { overlay.setProps({ layers: [] }); return; }
    const c: [number, number] = [focus.lng, focus.lat];
    const near = focus.nearest.filter((n) => n.km <= 25);
    const on = (k: Kind) => !activeKind || activeKind === k;
    const showDrawn = realShown === false && drawn.blocks.length > 0;

    const rings = [2, 5].map((km) => ({ km, path: circleRing(focus.lat, focus.lng, km, 160) }));
    overlay.setProps({
      layers: [
        new PathLayer({
          id: "rings", data: rings, getPath: (d) => d.path, getColor: [255, 180, 0, 110], getWidth: 2, widthUnits: "pixels",
        }),
        new TextLayer({
          id: "ring-labels", data: rings, getPosition: (d) => d.path[0], getText: (d) => `${d.km} km`, parameters: { depthCompare: "always" },
          getSize: 12, getColor: [255, 214, 120, 230], fontFamily: "Inter, system-ui, sans-serif", fontWeight: 600,
          getPixelOffset: [22, 0], background: true, getBackgroundColor: [13, 13, 18, 200], backgroundPadding: [5, 2],
        }),
        new ScatterplotLayer({
          id: "site", data: [c], getPosition: (d) => d, getRadius: drawn.siteRadiusM, radiusUnits: "meters",
          getFillColor: [255, 180, 0, drawn.kind === "site-only" ? 70 : 38], stroked: true, getLineColor: [255, 180, 0, 230], getLineWidth: 2, lineWidthUnits: "pixels",
        }),
        ...(allPlaces ? [new ScatterplotLayer<Place>({
          id: "places", data: focus.places.filter((p) => on(p.kind)), getPosition: (p) => [p.lng, p.lat],
          getRadius: 4, radiusUnits: "pixels", getFillColor: (p) => [...KIND[p.kind].color, 200] as [number, number, number, number],
          stroked: true, getLineColor: [13, 13, 18, 255], getLineWidth: 1, lineWidthUnits: "pixels",
          pickable: true,
        })] : []),
        new ArcLayer<NearestPlace>({
          id: "arcs", data: near, getSourcePosition: () => c, getTargetPosition: (n) => [n.lng, n.lat],
          getSourceColor: [255, 180, 0, 230], getTargetColor: (n) => [...KIND[n.kind].color, on(n.kind) ? 240 : 40] as [number, number, number, number],
          getWidth: (n) => (activeKind === n.kind ? 5 : 2.5), getHeight: 0.35, greatCircle: false,
          updateTriggers: { getTargetColor: activeKind, getWidth: activeKind },
        }),
        new ColumnLayer<NearestPlace>({
          id: "beacons", data: near, getPosition: (n) => [n.lng, n.lat], diskResolution: 16, radius: 11,
          extruded: true, getElevation: (n) => (activeKind === n.kind ? 150 : 85),
          getFillColor: (n) => [...KIND[n.kind].color, on(n.kind) ? 235 : 50] as [number, number, number, number],
          material: { ambient: 0.6, diffuse: 0.6, shininess: 40 },
          updateTriggers: { getFillColor: activeKind, getElevation: activeKind },
        }),
        new TextLayer<NearestPlace>({
          id: "beacon-labels", data: near.filter((n) => on(n.kind)), getPosition: (n) => [n.lng, n.lat, activeKind === n.kind ? 175 : 105],
          getText: (n) => `${nearestLabel(n)} · ${kmLabel(n.km)}`, getSize: 12, parameters: { depthCompare: "always" }, getColor: [245, 245, 250, 255],
          fontFamily: "Inter, system-ui, sans-serif", fontWeight: 600, characterSet: "auto",
          background: true, getBackgroundColor: [13, 13, 18, 215], backgroundPadding: [6, 3],
          getBorderColor: (n) => [...KIND[n.kind].color, 255] as [number, number, number, number], getBorderWidth: 1,
          updateTriggers: { getPosition: activeKind },
        }),
        ...(showDrawn ? [new PolygonLayer<DrawnSite["blocks"][number]>({
          id: "drawn", data: drawn.blocks, getPolygon: (b) => b.polygon, extruded: true, getElevation: (b) => b.heightM,
          getFillColor: [255, 180, 0, 235], getLineColor: [255, 226, 160, 255], wireframe: true, lineWidthMinPixels: 1,
          material: { ambient: 0.55, diffuse: 0.7, shininess: 24 },
        })] : []),
        new TextLayer({
          id: "name", data: [c], getPosition: () => [c[0], c[1], Math.max(showDrawn ? Math.max(...drawn.blocks.map((b) => b.heightM)) : 0, realShown ? siteTop : 0, 50) + 35],
          getText: () => focus.name, getSize: 14, parameters: { depthCompare: "always" }, getColor: [13, 13, 18, 255], fontFamily: "Inter, system-ui, sans-serif", fontWeight: 700,
          characterSet: "auto", background: true, getBackgroundColor: [255, 180, 0, 245], backgroundPadding: [8, 4],
        }),
      ],
    });
  }, [focus, drawn, realShown, siteTop, allPlaces, activeKind]);

  const flyToPlace = (n: NearestPlace) => {
    const map = mapRef.current;
    if (!map || !focus) return;
    setActiveKind((k) => (k === n.kind ? null : n.kind));
    setOrbit(false);
    // Frame the listing and the place together.
    map.fitBounds([[Math.min(focus.lng, n.lng), Math.min(focus.lat, n.lat)], [Math.max(focus.lng, n.lng), Math.max(focus.lat, n.lat)]],
      { padding: window.innerWidth < 760 ? { top: 90, bottom: window.innerHeight * 0.5, left: 40, right: 40 } : { top: 120, bottom: 120, left: 80, right: 460 }, maxZoom: 16, pitch: 58, duration: 1400 });
  };

  const exitFocus = () => openFocus(null);

  const shapeNote = !focus || !drawn ? null
    : realShown === true ? "3D shape: real building outlines from OpenStreetMap"
    : realShown === null ? "Checking the map for real building outlines…"
    : drawn.note;

  return (
    <div className={s.wrap}>
      <div ref={box} className={s.map} />

      {/* Top-left: title + base map */}
      <div className={s.brand}>
        <div className={s.kicker}>Sample · not the live map</div>
        <div className={s.title}>Hyderabad in 3D</div>
        <div className={s.sub}>{count == null ? "Loading listings…" : `${count.toLocaleString("en-IN")} listings with a map pin · click one`}</div>
        <div className={s.seg} role="group" aria-label="Base map">
          {(["dark", "satellite"] as Base3D[]).map((b) => (
            <button key={b} type="button" aria-pressed={base === b} className={base === b ? s.segOn : ""} onClick={() => setBase(b)}>
              {b === "dark" ? "Dark 3D" : "Satellite"}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className={s.toast}>Loading the 3D view…</div>}
      {error && <div className={s.toast} role="alert">{error}</div>}

      {/* Focus panel */}
      {focus && drawn && (
        <aside className={s.panel} aria-label={`${focus.name} in 3D`}>
          <div className={s.panelTop}>
            <button type="button" className={s.back} onClick={exitFocus}><ArrowLeft size={15} /> City view</button>
            <button type="button" className={s.close} onClick={exitFocus} aria-label="Close"><X size={16} /></button>
          </div>
          {focus.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className={s.photo} src={focus.image} alt={focus.name} />
          )}
          <h2 className={s.name}>{focus.name}</h2>
          <div className={s.meta}>{[focus.developer, focus.area].filter(Boolean).join(" · ")}</div>
          <div className={s.price}>
            {focus.priceLakh > 0 ? <>{focus.priceFrom ? "from " : ""}{formatLakh(focus.priceLakh)}</> : "Price on request"}
            {focus.rera && <span className={s.chip}>TG-RERA</span>}
          </div>
          {focus.possession && <div className={s.meta}>{focus.possession}</div>}

          <div className={s.scores}>
            {focus.tigerScore != null && <div className={s.score}><b>{focus.tigerScore.toFixed(1)}</b><span>Tiger Score /10</span></div>}
            {focus.accessibility && <div className={s.score}><b>{Math.round(focus.accessibility.score)}</b><span>Accessibility /100</span></div>}
          </div>

          <div className={s.note}><Building2 size={14} aria-hidden /> {shapeNote}</div>

          <div className={s.label}>Nearest · tap to fly there</div>
          {focus.nearest.length === 0 && <div className={s.meta}>No mapped places for this listing yet.</div>}
          <ul className={s.nearest}>
            {KIND_ORDER.flatMap((k) => focus.nearest.filter((n) => n.kind === k)).map((n) => (
              <li key={n.kind}>
                <button type="button" onClick={() => flyToPlace(n)} aria-pressed={activeKind === n.kind} className={activeKind === n.kind ? s.rowOn : ""}>
                  <i style={{ background: hex(KIND[n.kind].color) }} aria-hidden />
                  <span className={s.rowLabel}>{nearestLabel(n)}{n.name ? <em> · {n.name}</em> : null}</span>
                  <span className={s.km}>{kmLabel(n.km)}</span>
                </button>
              </li>
            ))}
          </ul>

          {focus.accessibility && (
            <>
              <div className={s.label}>Accessibility</div>
              {focus.accessibility.components.map((c) => (
                <div key={c.key} className={s.bar}>
                  <div className={s.barTop}><span>{c.label}</span><span>{c.points}/{c.max}</span></div>
                  <div className={s.track}><div style={{ width: `${(c.points / c.max) * 100}%` }} /></div>
                </div>
              ))}
            </>
          )}

          <div className={s.toggles}>
            <label><input type="checkbox" checked={orbit} onChange={(e) => setOrbit(e.target.checked)} /> <Orbit size={14} aria-hidden /> Orbit</label>
            <label><input type="checkbox" checked={allPlaces} onChange={(e) => setAllPlaces(e.target.checked)} /> <Layers3 size={14} aria-hidden /> All places within 5 km ({focus.places.length})</label>
          </div>

          <a className={s.cta} href={focus.url}>Open project page <ExternalLink size={14} aria-hidden /></a>
          <p className={s.fine}>Places and building outlines © OpenStreetMap contributors. Distances are straight-line.</p>
        </aside>
      )}
    </div>
  );
}
