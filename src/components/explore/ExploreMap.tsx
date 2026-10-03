"use client";

// The Explore Map. MapLibre GL (GPU-rendered, clustering built into the GeoJSON
// source) — chosen over Leaflet because this must stay smooth at thousands of
// points.
//
// Notes that matter when reading this file:
//  • The GeoJSON source is created ONCE and updated with setData() (Part 9.3).
//  • URL is the source of truth for view/filters/colour/layers/selection.
//  • An empty map is a valid state, never an error (Constraint 3).
//  • Projects without coordinates are simply absent — never placed at a
//    corridor centroid (Constraint 2).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// maplibre-gl v6 ships named exports only — there is no default export.
import {
  Map as MapLibreMap, Popup, Marker, AttributionControl, setWorkerUrl,
  type GeoJSONSource, type MapLayerMouseEvent, type MapGeoJSONFeature,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// MapLibre 6 loads its worker as a separate ES module, resolved with
// `new URL('./maplibre-gl-worker.mjs', import.meta.url)`. Under Next's bundler
// import.meta.url is the emitted chunk, so that resolves to
// /_next/static/chunks/maplibre-gl-worker.mjs, which 404s and returns HTML —
// the browser then refuses it for its MIME type and the worker never starts.
// Without the worker, GeoJSON sources are never tiled, so no property marker
// ever renders while the raster basemap (which needs no worker) looks fine.
//
// scripts/copy-maplibre-worker.mjs places the worker and its sibling shared
// module under public/maplibre/ on predev/prebuild; point MapLibre at that copy
// before any map is constructed.
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
import { List, SlidersHorizontal } from "lucide-react";

import { useUrlState, DEFAULT_VIEW, DEFAULT_FILTERS, type ExploreFilterState } from "@/lib/explore/use-url-state";
import { useMapData, type Bounds, type PropertyFeature } from "@/lib/explore/use-map-data";
import { colorExpression, type ColorMode } from "@/lib/explore/color-modes";
import {
  SOURCE_ID, INFRA_SOURCE_ID, baseStyle, clusterLayer, clusterCountLayer, dotLayer,
  HIGHLIGHT_SOURCE_ID, HIGHLIGHT_HALO_LAYER, HIGHLIGHT_RING_LAYER, HIGHLIGHT_PIN_LAYER,
  highlightHaloLayer, highlightRingLayer, highlightPinLayer, highlightHaloPaint,
  CLUSTER_LAYER, DOT_LAYER, infraLineLayer, infraPointLayer,
  NEARBY_SOURCE_ID, NEARBY_LAYER, nearbyLayer, RING_SOURCE_ID, RING_2KM_LAYER, RING_5KM_LAYER, ring2kmLayer, ring5kmLayer,
  INFRA_CATEGORY_COLORS, BASEMAPS, type BasemapId,
} from "@/lib/explore/layer-styles";

import MapSearchBar, { type GeoResult } from "./MapSearchBar";
import FilterChips, { hasActiveFilters } from "./FilterChips";
import FiltersPanel from "./FiltersPanel";
import LayersPanel, { type InfraLayer } from "./LayersPanel";
import RequirementsPanel from "./RequirementsPanel";
import PropertyDetailCard from "./PropertyDetailCard";
import ListPanel, { LIST_PANEL_WIDTH, type SortKey } from "./ListPanel";
import { OSM_ATTRIBUTION } from "@/lib/osm/categories";
import { circleRing } from "@/lib/osm/geo";
import ColorModeToggle from "./ColorModeToggle";
import MapControls from "./MapControls";
import { NoPropertiesAnywhere, NoneInViewport, NoFilterMatches, StaleBanner, LoadingBar } from "./EmptyStates";
import { areaLabel } from "@/lib/explore/query";

const BASEMAP_KEY = "uv_explore_basemap";
const EMPTY_FC = { type: "FeatureCollection" as const, features: [] };

/** The hover / selection marker: its own source, drawn above everything else. */
function addHighlight(map: MapLibreMap) {
  if (!map.getSource(HIGHLIGHT_SOURCE_ID)) map.addSource(HIGHLIGHT_SOURCE_ID, { type: "geojson", data: EMPTY_FC });
  if (!map.getLayer(HIGHLIGHT_HALO_LAYER)) map.addLayer(highlightHaloLayer as never);
  if (!map.getLayer(HIGHLIGHT_RING_LAYER)) map.addLayer(highlightRingLayer as never);
  if (!map.getLayer(HIGHLIGHT_PIN_LAYER)) map.addLayer(highlightPinLayer as never);
}

/**
 * Everything drawn on top of the basemap besides the property source:
 * OpenStreetMap "Nearby" dots (under the property dots, so listings stay on
 * top and clickable), the 2 / 5 km rings, then the hover / selection marker.
 */
function addOverlays(map: MapLibreMap) {
  if (!map.getSource(NEARBY_SOURCE_ID)) map.addSource(NEARBY_SOURCE_ID, { type: "geojson", data: EMPTY_FC, attribution: OSM_ATTRIBUTION });
  if (!map.getLayer(NEARBY_LAYER)) map.addLayer(nearbyLayer() as never, map.getLayer(CLUSTER_LAYER) ? CLUSTER_LAYER : undefined);
  if (!map.getSource(RING_SOURCE_ID)) map.addSource(RING_SOURCE_ID, { type: "geojson", data: EMPTY_FC });
  if (!map.getLayer(RING_5KM_LAYER)) map.addLayer(ring5kmLayer as never);
  if (!map.getLayer(RING_2KM_LAYER)) map.addLayer(ring2kmLayer as never);
  addHighlight(map);
}

const NEARBY_KEY = "uv_explore_nearby";
/** What "Show nearby places on the map" turns on. */
const DEFAULT_NEARBY = ["hospital", "transit", "school", "mall", "park"];
const NEARBY_NAME: Record<string, (sub?: string | null) => string> = {
  hospital: () => "Hospital",
  transit: (sub) => (sub === "metro" ? "Metro station" : "Railway station"),
  orr_exit: () => "ORR / expressway exit",
  school: () => "School",
  college: () => "College / university",
  mall: () => "Mall",
  job_hub: () => "IT park / industrial area",
  park: () => "Park",
  lake: () => "Lake",
  bus_station: () => "Bus station",
};
type NearbyRow = { id: string; c: string; s: string | null; n: string | null; lat: number; lng: number };

export default function ExploreMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const [ready, setReady] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const {
    view, filters, color, layers, selected, hydrated, urlHadView,
    commitView, commitFilters, commitSelected, commitColor, commitLayers,
  } = useUrlState();

  const { data, loading, staleError, loadedOnce, request } = useMapData(filters);

  // Streets by default (clearest for finding a locality); a choice made in Layers is remembered.
  const [basemap, setBasemap] = useState<BasemapId>("streets");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [reqOpen, setReqOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [sort, setSort] = useState<SortKey>("score");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [nearby, setNearby] = useState<string[]>([]);
  const nearbyCache = useRef<Record<string, NearbyRow[]>>({});
  const [nearbyRev, setNearbyRev] = useState(0);
  const [tip, setTip] = useState<{ x: number; y: number; name: string; label: string } | null>(null);
  const ringMarkers = useRef<Marker[]>([]);
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [showAdmin, setShowAdmin] = useState(true);
  const [showSeller, setShowSeller] = useState(true);
  const [locating, setLocating] = useState(false);
  const [infraCatalog, setInfraCatalog] = useState<InfraLayer[]>([]);

  // Latest values for use inside map event handlers registered once.
  const requestRef = useRef(request);
  requestRef.current = request;
  const commitViewRef = useRef(commitView);
  commitViewRef.current = commitView;
  const commitSelectedRef = useRef(commitSelected);
  commitSelectedRef.current = commitSelected;

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(BASEMAP_KEY) as BasemapId | null;
      if (saved && BASEMAPS[saved]) setBasemap(saved);
      const savedNearby = JSON.parse(localStorage.getItem(NEARBY_KEY) ?? "[]");
      if (Array.isArray(savedNearby)) setNearby(savedNearby.filter((c) => typeof c === "string" && c in NEARBY_NAME));
    } catch { /* private mode */ }
  }, []);

  const boundsOf = (m: MapLibreMap): Bounds => {
    const b = m.getBounds();
    return { minLng: b.getWest(), minLat: b.getSouth(), maxLng: b.getEast(), maxLat: b.getNorth() };
  };

  // ── Map init (once, after URL state hydrates so we don't fly twice) ──
  useEffect(() => {
    if (!hydrated || mapRef.current || !containerRef.current) return;

    const map = new MapLibreMap({
      container: containerRef.current,
      style: baseStyle(basemap),
      center: [view.lng, view.lat],
      zoom: view.zoom,
      attributionControl: false,
      // Accidental rotation is the most common complaint about mobile maps.
      dragRotate: false,
      pitchWithRotate: false,
      touchZoomRotate: true,
    });
    map.touchZoomRotate.disableRotation();
    mapRef.current = map;

    // Esri attribution must remain visible at all times (Constraint 9).
    map.addControl(new AttributionControl({ compact: true }), "bottom-right");

    map.on("load", () => {
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: EMPTY_FC,
        cluster: true,
        clusterMaxZoom: 13,
        clusterRadius: 45,
      });
      map.addLayer(clusterLayer as never);
      map.addLayer(clusterCountLayer as never);
      map.addLayer(dotLayer("price") as never);
      addOverlays(map);
      // Data may already have arrived while the style was loading — seed the
      // source immediately rather than waiting for the next change to `visible`,
      // which may never come.
      (map.getSource(SOURCE_ID) as GeoJSONSource | undefined)
        ?.setData({ type: "FeatureCollection", features: visibleRef.current } as GeoJSON.FeatureCollection);
      // The container is laid out by flex/vh after the map constructs, so the
      // canvas can latch onto a stale size. Resize once the style is up, and
      // again on the next frame — the first paint can otherwise land before the
      // new canvas size is in effect, leaving the map blank until interaction.
      map.resize();
      requestAnimationFrame(() => { map.resize(); map.triggerRepaint(); });
      setReady(true);
      const b = boundsOf(map);
      setBounds(b);
      requestRef.current(b, map.getZoom(), true);
    });

    // Keep the canvas matched to the container (window resize, panel open,
    // devtools, orientation change).
    const ro = new ResizeObserver(() => {
      map.resize();
      // A resize (e.g. the list panel opening beside the map) changes what is
      // in view, so refresh the list exactly as a pan does.
      if (map.isStyleLoaded()) map.fire("moveend");
    });
    ro.observe(containerRef.current);

    const onMoveEnd = () => {
      const b = boundsOf(map);
      setBounds(b);
      requestRef.current(b, map.getZoom());
      const c = map.getCenter();
      commitViewRef.current({ lat: c.lat, lng: c.lng, zoom: map.getZoom() });
    };
    map.on("moveend", onMoveEnd);

    // Cluster click → expand
    map.on("click", CLUSTER_LAYER, (e: MapLayerMouseEvent) => {
      const f: MapGeoJSONFeature | undefined = map.queryRenderedFeatures(e.point, { layers: [CLUSTER_LAYER] })[0];
      const clusterId = f?.properties?.cluster_id;
      if (clusterId == null) return;
      const src = map.getSource(SOURCE_ID) as GeoJSONSource;
      src.getClusterExpansionZoom(clusterId).then((z: number) => {
        map.easeTo({ center: (f.geometry as GeoJSON.Point).coordinates as [number, number], zoom: z, duration: 500 });
      }).catch(() => {});
    });

    // Dot click → open detail card
    map.on("click", DOT_LAYER, (e: MapLayerMouseEvent) => {
      const id = e.features?.[0]?.properties?.id;
      if (typeof id === "string") commitSelectedRef.current(id);
    });

    // Clicking the background closes the card
    map.on("click", (e: MapLayerMouseEvent) => {
      const hits = map.queryRenderedFeatures(e.point, { layers: [CLUSTER_LAYER, DOT_LAYER] });
      if (hits.length === 0) commitSelectedRef.current(null);
    });

    // Hover tooltip
    map.on("mouseenter", DOT_LAYER, () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", DOT_LAYER, () => {
      map.getCanvas().style.cursor = "";
      popupRef.current?.remove();
      popupRef.current = null;
      setHoveredId(null);
    });
    map.on("mousemove", DOT_LAYER, (e: MapLayerMouseEvent) => {
      const f = e.features?.[0];
      if (!f) return;
      const p = f.properties as PropertyFeature["properties"];
      setHoveredId(typeof p.id === "string" ? p.id : null);
      // GeoJSON properties round-trip as strings/booleans depending on the source; accept both.
      const from = p.priceFrom === true || (p.priceFrom as unknown) === "true" ? "from " : "";
      const price = from + (p.priceLakh >= 100 ? `₹${(p.priceLakh / 100).toFixed(2)} Cr` : `₹${p.priceLakh} L`);
      const area = p.areaValue ? ` · ${areaLabel(p.areaValue, p.areaUnit)}` : "";
      popupRef.current?.remove();
      popupRef.current = new Popup({ closeButton: false, closeOnClick: false, offset: 12, className: "uv-map-tip" })
        .setLngLat((f.geometry as GeoJSON.Point).coordinates as [number, number])
        .setHTML(`<span style="font:600 12px Inter,system-ui;color:#0D0D12">${price}${area}</span>`)
        .addTo(map);
    });
    // Nearby place: name it on hover.
    map.on("mousemove", NEARBY_LAYER, (e: MapLayerMouseEvent) => {
      const p = e.features?.[0]?.properties as { c?: string; n?: string; s?: string } | undefined;
      if (!p?.c) return;
      const kind = NEARBY_NAME[p.c]?.(p.s) ?? p.c;
      setTip({ x: e.point.x, y: e.point.y, name: p.n || kind, label: p.n ? kind : "" });
    });
    map.on("mouseleave", NEARBY_LAYER, () => setTip(null));
    map.on("mouseenter", CLUSTER_LAYER, () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", CLUSTER_LAYER, () => { map.getCanvas().style.cursor = ""; });

    return () => { ro.disconnect(); map.remove(); mapRef.current = null; };
    // Init once; view/basemap changes are handled by their own effects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  // ── Push new data into the existing source (never re-create it) ──
  const visible = useMemo(() => {
    return data.features.filter((f) =>
      (f.properties.source === "ADMIN" ? showAdmin : showSeller));
  }, [data.features, showAdmin, showSeller]);

  // Hold the latest features so the map can pull them whenever its source
  // appears, rather than relying on the effect below happening to fire at a
  // moment when the source exists.
  const visibleRef = useRef(visible);
  useEffect(() => { visibleRef.current = visible; }, [visible]);

  const applyData = useCallback(() => {
    const map = mapRef.current;
    if (!map) return false;
    const src = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    if (!src) return false;
    src.setData({ type: "FeatureCollection", features: visibleRef.current } as GeoJSON.FeatureCollection);
    return true;
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    // This used to be `src?.setData(...)` behind a `ready` gate. When the source
    // was momentarily absent — a style swap, or React re-running the init effect
    // and replacing the map underneath us — the optional chain swallowed the
    // update and nothing ever retried, because `visible` and `ready` do not
    // change again. The map then sat empty while the list and the legend both
    // showed the listing. Retry on the next source/style event instead.
    if (applyData()) return;
    const retry = () => { if (applyData()) { map.off("sourcedata", retry); map.off("styledata", retry); map.off("idle", retry); } };
    map.on("sourcedata", retry);
    map.on("styledata", retry);
    map.on("idle", retry);
    return () => { map.off("sourcedata", retry); map.off("styledata", retry); map.off("idle", retry); };
  }, [visible, ready, applyData]);

  // Colour mode → repaint dots
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.setPaintProperty(DOT_LAYER, "circle-color", colorExpression(color) as never);
  }, [color, ready]);

  // Selection + hover marker — from its own unclustered source, so the home
  // shows even while it sits inside a cluster bubble.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const mark = (id: string | null, kind: "hover" | "selected") => {
      const f = id ? visible.find((v) => v.properties.id === id) : undefined;
      return f ? [{ type: "Feature" as const, geometry: f.geometry, properties: { id, kind } }] : [];
    };
    const features = [...(hoveredId !== selected ? mark(hoveredId, "hover") : []), ...mark(selected, "selected")];
    (map.getSource(HIGHLIGHT_SOURCE_ID) as GeoJSONSource | undefined)
      ?.setData({ type: "FeatureCollection", features } as GeoJSON.FeatureCollection);
  }, [selected, hoveredId, visible, ready]);

  // ── Nearby places: load a category the first time it is switched on ──
  const commitNearby = useCallback((cats: string[]) => {
    setNearby(cats);
    try { localStorage.setItem(NEARBY_KEY, JSON.stringify(cats)); } catch { /* private mode */ }
  }, []);

  useEffect(() => {
    const missing = nearby.filter((c) => !nearbyCache.current[c]);
    if (!missing.length) return;
    let alive = true;
    fetch(`/api/explore/nearby?categories=${missing.join(",")}`)
      .then((r) => (r.ok ? r.json() : { features: [] }))
      .then((d: { features?: NearbyRow[] }) => {
        for (const c of missing) nearbyCache.current[c] = [];
        for (const f of d.features ?? []) (nearbyCache.current[f.c] ??= []).push(f);
        if (alive) setNearbyRev((n) => n + 1);
      })
      .catch(() => { /* layer simply stays empty */ });
    return () => { alive = false; };
  }, [nearby]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const features = nearby.flatMap((c) => (nearbyCache.current[c] ?? []).map((f) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [f.lng, f.lat] },
      properties: { c: f.c, n: f.n, s: f.s },
    })));
    (map.getSource(NEARBY_SOURCE_ID) as GeoJSONSource | undefined)
      ?.setData({ type: "FeatureCollection", features } as GeoJSON.FeatureCollection);
  }, [nearby, nearbyRev, ready]);

  // ── 2 km / 5 km rings around the selected home ──
  const selectedAt = useMemo(() => {
    const f = selected ? visible.find((v) => v.properties.id === selected) : undefined;
    return f ? f.geometry.coordinates.join(",") : null;
  }, [selected, visible]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    ringMarkers.current.forEach((m) => m.remove());
    ringMarkers.current = [];
    const src = map.getSource(RING_SOURCE_ID) as GeoJSONSource | undefined;
    if (!selectedAt) { src?.setData(EMPTY_FC as GeoJSON.FeatureCollection); return; }
    const [lng, lat] = selectedAt.split(",").map(Number);
    src?.setData({
      type: "FeatureCollection",
      features: [2, 5].map((km) => ({ type: "Feature", geometry: { type: "LineString", coordinates: circleRing(lat, lng, km) }, properties: { km } })),
    } as GeoJSON.FeatureCollection);
    for (const km of [2, 5]) {
      const el = document.createElement("div");
      el.textContent = `${km} km`;
      el.style.cssText = "font:700 11px/1 var(--font-jakarta),sans-serif;color:#0D0D12;background:#fff;border-radius:999px;padding:3px 7px;box-shadow:0 1px 4px rgba(16,16,26,.25);pointer-events:none";
      ringMarkers.current.push(new Marker({ element: el }).setLngLat([lng, lat + km / 110.574]).addTo(map));
    }
  }, [selectedAt, ready]);

  // Pulse the selected home's halo so it is easy to find on a busy map.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !selected) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      if (map.getLayer(HIGHLIGHT_HALO_LAYER)) {
        const paint = highlightHaloPaint(((now - start) % 1600) / 1600);
        map.setPaintProperty(HIGHLIGHT_HALO_LAYER, "circle-radius", paint["circle-radius"] as never);
        map.setPaintProperty(HIGHLIGHT_HALO_LAYER, "circle-opacity", paint["circle-opacity"] as never);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      if (map.getLayer(HIGHLIGHT_HALO_LAYER)) {
        const still = highlightHaloPaint();
        map.setPaintProperty(HIGHLIGHT_HALO_LAYER, "circle-radius", still["circle-radius"] as never);
        map.setPaintProperty(HIGHLIGHT_HALO_LAYER, "circle-opacity", still["circle-opacity"] as never);
      }
    };
  }, [selected, ready]);

  // Basemap switch — restyle, then re-add our layers on top.
  const changeBasemap = useCallback((b: BasemapId) => {
    setBasemap(b);
    try { localStorage.setItem(BASEMAP_KEY, b); } catch { /* private mode */ }
    const map = mapRef.current;
    if (!map) return;
    setReady(false);
    map.setStyle(baseStyle(b));
    map.once("styledata", () => {
      // setStyle() usually drops our source with the old style, but not always.
      // The early return here used to skip setReady(true) when the source had
      // survived, leaving `ready` false for good — after which the effect that
      // pushes data into the source bailed out on every update and the map
      // silently stopped showing properties until a full reload.
      if (!map.getSource(SOURCE_ID)) {
        map.addSource(SOURCE_ID, { type: "geojson", data: EMPTY_FC, cluster: true, clusterMaxZoom: 13, clusterRadius: 45 });
        map.addLayer(clusterLayer as never);
        map.addLayer(clusterCountLayer as never);
        map.addLayer(dotLayer(color) as never);
      }
      addOverlays(map);
      setReady(true);
    });
  }, [color]);

  // ── Infrastructure layers: lazy-load geometry, cache, add/remove ──
  useEffect(() => {
    if (layers.length === 0 || infraCatalog.length > 0) return;
    fetch("/api/explore/infrastructure")
      .then((r) => r.json())
      .then((d) => setInfraCatalog(d.layers ?? []))
      .catch(() => setInfraCatalog([]));
  }, [layers, infraCatalog.length]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    for (const l of infraCatalog) {
      const srcId = `${INFRA_SOURCE_ID}-${l.id}`;
      const lineId = `infra-line-${l.id}`;
      const pointId = `infra-point-${l.id}`;
      const on = layers.includes(l.id) && l.hasGeometry && l.geometry;

      if (on) {
        if (!map.getSource(srcId)) {
          map.addSource(srcId, {
            type: "geojson",
            data: { type: "Feature", geometry: l.geometry, properties: { name: l.name } } as GeoJSON.Feature,
          });
        }
        const color = INFRA_CATEGORY_COLORS[l.category] ?? "#94A3B8";
        if (l.geometry!.type === "LineString" && !map.getLayer(lineId)) {
          map.addLayer(infraLineLayer(l.id, color, l.confirmed) as never);
        }
        if (l.geometry!.type === "Point" && !map.getLayer(pointId)) {
          map.addLayer(infraPointLayer(l.id, color, l.confirmed) as never);
        }
      } else {
        if (map.getLayer(lineId)) map.removeLayer(lineId);
        if (map.getLayer(pointId)) map.removeLayer(pointId);
        if (map.getSource(srcId)) map.removeSource(srcId);
      }
    }
    // Keep the hover / selection marker above any infrastructure just drawn.
    for (const id of [HIGHLIGHT_HALO_LAYER, HIGHLIGHT_RING_LAYER, HIGHLIGHT_PIN_LAYER]) if (map.getLayer(id)) map.moveLayer(id);
  }, [layers, infraCatalog, ready]);

  // ── Actions ──
  const flyTo = useCallback((lat: number, lng: number, zoom: number) => {
    mapRef.current?.flyTo({ center: [lng, lat], zoom, duration: 900 });
  }, []);

  const onPickLocation = useCallback((r: GeoResult) => {
    // A locality or area: frame all of its homes (never closer than street level).
    if (r.bounds) {
      mapRef.current?.fitBounds(r.bounds, { padding: 80, maxZoom: 15, duration: 900 });
      return;
    }
    if (r.flyTo) { flyTo(r.flyTo.lat, r.flyTo.lng, r.flyTo.zoom); return; }
    // No stored position — narrow the map by that corridor instead of guessing.
    if (r.corridorSlug) commitFilters({ ...filters, types: filters.types });
  }, [flyTo, commitFilters, filters]);

  const locate = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocating(false); flyTo(pos.coords.latitude, pos.coords.longitude, 12); },
      () => setLocating(false),
      { timeout: 8000 },
    );
  }, [flyTo]);

  const selectFeature = useCallback((f: PropertyFeature) => {
    const [lng, lat] = f.geometry.coordinates;
    mapRef.current?.flyTo({ center: [lng, lat], zoom: Math.max(mapRef.current.getZoom(), 14), duration: 700 });
    commitSelected(f.properties.id);
  }, [commitSelected]);

  // Saved city preference only applies when the URL didn't carry a position.
  useEffect(() => {
    if (!ready || urlHadView) return;
    // Nothing to do today: the app has a single city. Kept explicit so the
    // precedence rule (URL wins) is obvious.
  }, [ready, urlHadView]);

  const filtersActive = hasActiveFilters(filters);

  // "Nothing anywhere" vs "nothing here" are different states and read
  // differently — but data.count only ever answers "how many are in this
  // viewport". Treating count===0 as "nothing anywhere" meant panning away from
  // a listing announced that the map had none at all, contradicting the list
  // panel on the same screen. Fetch the unbounded total once so the states can
  // actually be told apart.
  const [totalListings, setTotalListings] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/explore/count")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d) setTotalListings(typeof d.count === "number" ? d.count : null); })
      .catch(() => { /* unknown total: never claim emptiness */ });
    return () => { alive = false; };
  }, []);

  // On desktop the map sits beside the open list (not under it), so every home
  // in the list is visible on the map.
  const listOffset = !isMobile && listOpen ? LIST_PANEL_WIDTH : "0px";
  const nothingInView = loadedOnce && data.count === 0;
  const showEmptyAll = nothingInView && totalListings === 0;
  const showNoneHere = nothingInView && totalListings !== 0 && filtersActive;
  const showZoomOut = nothingInView && totalListings !== 0 && !filtersActive;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", background: "#0D0D12" }}>
      <div ref={containerRef} style={{ position: "absolute", inset: 0, left: listOffset }} />

      <LoadingBar active={loading} />
      {staleError && <StaleBanner />}

      {/* Top control bar */}
      <div style={{ position: "absolute", top: 16, left: `calc(16px + ${listOffset})`, right: 16, display: "flex", gap: 10, alignItems: "flex-start", zIndex: 16, pointerEvents: "none", flexWrap: "wrap" }}>
        {!isMobile && <MapSearchBar onPick={onPickLocation} onLocate={locate} />}

        {!isMobile && (
          <button onClick={() => setFiltersOpen(true)} style={pillBtn}>
            <SlidersHorizontal size={15} /> Filters
          </button>
        )}

        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "flex-start" }}>
          {!isMobile && (
            <RequirementsPanel open={reqOpen} onToggleOpen={() => setReqOpen((v) => !v)} currentFilters={filters}
              onApply={(patch) => { commitFilters({ ...filters, ...patch }); setReqOpen(false); }} />
          )}
          <LayersPanel
            open={layersOpen}
            onToggleOpen={() => setLayersOpen((v) => !v)}
            enabled={layers}
            onChange={commitLayers}
            basemap={basemap}
            onBasemap={changeBasemap}
            showAdmin={showAdmin}
            showSeller={showSeller}
            onShowAdmin={setShowAdmin}
            onShowSeller={setShowSeller}
            nearby={nearby}
            onNearby={commitNearby}
          />
        </div>
      </div>

      {/* Chips */}
      {!isMobile && (
        <div style={{ position: "absolute", top: 74, left: `calc(16px + ${listOffset})`, right: 16, zIndex: 15, pointerEvents: "none" }}>
          <FilterChips filters={filters} onChange={commitFilters} />
        </div>
      )}

      {/* Mobile FABs */}
      {isMobile && (
        <>
          <button onClick={() => setFiltersOpen(true)} style={{ ...fab, right: 16, bottom: 96 }} aria-label="Filters"><SlidersHorizontal size={19} /></button>
          <button onClick={() => setListOpen(true)} style={{ ...fab, left: 16, bottom: 96 }} aria-label="List view"><List size={19} /></button>
        </>
      )}

      {/* Desktop list tab */}
      {!isMobile && !listOpen && (
        <button onClick={() => setListOpen(true)} title="List view"
          style={{
            position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", zIndex: 16,
            background: "#fff", border: "none", borderRadius: "0 12px 12px 0", cursor: "pointer",
            boxShadow: "0 4px 20px rgba(16,16,26,.18)", padding: "16px 7px",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 6, color: "#2A2A35",
          }}>
          <List size={16} />
          <span style={{ writingMode: "vertical-rl", fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.05em" }}>LIST</span>
        </button>
      )}

      <ListPanel
        open={listOpen}
        onClose={() => setListOpen(false)}
        features={visible}
        total={data.count}
        sort={sort}
        onSort={setSort}
        hoveredId={hoveredId}
        selectedId={selected}
        onHover={setHoveredId}
        onSelect={(f) => { selectFeature(f); if (isMobile) setListOpen(false); }}
        isMobile={isMobile}
      />

      {!isMobile && (
        <MapControls
          onZoomIn={() => mapRef.current?.zoomIn()}
          onZoomOut={() => mapRef.current?.zoomOut()}
          onLocate={locate}
          onReset={() => flyTo(DEFAULT_VIEW.lat, DEFAULT_VIEW.lng, DEFAULT_VIEW.zoom)}
          locating={locating}
        />
      )}

      {!isMobile && (
        <ColorModeToggle mode={color} onChange={commitColor} priceBreaks={data.priceBreaks} count={data.count} truncated={data.truncated} />
      )}

      {selected && (
        <PropertyDetailCard
          id={selected}
          onClose={() => commitSelected(null)}
          isMobile={isMobile}
          onShowNearby={() => commitNearby([...new Set([...nearby, ...DEFAULT_NEARBY])])}
        />
      )}

      {/* Nearby place tooltip (positions are relative to the map, which sits beside an open list). */}
      {tip && (
        <div style={{ position: "absolute", left: `calc(${listOffset} + ${tip.x + 12}px)`, top: tip.y - 12, zIndex: 30, pointerEvents: "none", background: "#0D0D12", color: "#fff", fontSize: "0.75rem", padding: "5px 9px", borderRadius: 8, whiteSpace: "nowrap", boxShadow: "0 4px 14px rgba(16,16,26,.25)" }}>
          <b>{tip.name}</b>{tip.label && <span style={{ opacity: 0.7 }}> · {tip.label}</span>}
        </div>
      )}

      <FiltersPanel
        open={filtersOpen}
        filters={filters}
        bounds={bounds}
        onApply={commitFilters}
        onClose={() => setFiltersOpen(false)}
        isMobile={isMobile}
      />

      {showEmptyAll && <NoPropertiesAnywhere />}
      {showNoneHere && <NoFilterMatches onClearFilters={() => commitFilters(DEFAULT_FILTERS)} />}
      {(showZoomOut || (loadedOnce && data.count > 0 && visible.length === 0)) && (
        <NoneInViewport
          hasFilters={filtersActive}
          onZoomOut={() => mapRef.current?.zoomOut()}
          onClearFilters={() => commitFilters(DEFAULT_FILTERS as ExploreFilterState)}
        />
      )}

      <style>{`
        .uv-map-tip .maplibregl-popup-content { padding: 5px 9px; border-radius: 8px; box-shadow: 0 4px 20px rgba(16,16,26,.18); }
        .uv-map-tip .maplibregl-popup-tip { display: none; }
      `}</style>
    </div>
  );
}

const pillBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", border: "none",
  borderRadius: 999, padding: "0 16px", height: 46, cursor: "pointer",
  boxShadow: "0 4px 20px rgba(16,16,26,.18)", fontSize: "0.8125rem", fontWeight: 600, color: "#2A2A35",
  pointerEvents: "auto",
};

const fab: React.CSSProperties = {
  position: "absolute", zIndex: 16, width: 52, height: 52, borderRadius: 999,
  background: "#fff", border: "none", cursor: "pointer", display: "grid", placeItems: "center",
  boxShadow: "0 4px 20px rgba(16,16,26,.22)", color: "#2A2A35",
};
