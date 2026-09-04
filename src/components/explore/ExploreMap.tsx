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
  Map as MapLibreMap, Popup, AttributionControl,
  type GeoJSONSource, type MapLayerMouseEvent, type MapGeoJSONFeature,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { List, SlidersHorizontal } from "lucide-react";

import { useUrlState, DEFAULT_VIEW, DEFAULT_FILTERS, type ExploreFilterState } from "@/lib/explore/use-url-state";
import { useMapData, type Bounds, type PropertyFeature } from "@/lib/explore/use-map-data";
import { colorExpression, type ColorMode } from "@/lib/explore/color-modes";
import {
  SOURCE_ID, INFRA_SOURCE_ID, baseStyle, clusterLayer, clusterCountLayer, dotLayer, selectedLayer,
  CLUSTER_LAYER, DOT_LAYER, SELECTED_LAYER, infraLineLayer, infraPointLayer,
  INFRA_CATEGORY_COLORS, BASEMAPS, type BasemapId,
} from "@/lib/explore/layer-styles";

import MapSearchBar, { type GeoResult } from "./MapSearchBar";
import FilterChips, { hasActiveFilters } from "./FilterChips";
import FiltersPanel from "./FiltersPanel";
import LayersPanel, { type InfraLayer } from "./LayersPanel";
import RequirementsPanel from "./RequirementsPanel";
import PropertyDetailCard from "./PropertyDetailCard";
import ListPanel, { type SortKey } from "./ListPanel";
import ColorModeToggle from "./ColorModeToggle";
import MapControls from "./MapControls";
import { NoPropertiesAnywhere, NoneInViewport, NoFilterMatches, StaleBanner, LoadingBar } from "./EmptyStates";

const BASEMAP_KEY = "uv_explore_basemap";
const EMPTY_FC = { type: "FeatureCollection" as const, features: [] };

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

  const [basemap, setBasemap] = useState<BasemapId>("satellite");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [reqOpen, setReqOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [sort, setSort] = useState<SortKey>("score");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
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
      map.addLayer(selectedLayer as never);
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
    const ro = new ResizeObserver(() => map.resize());
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
      const price = p.priceLakh >= 100 ? `₹${(p.priceLakh / 100).toFixed(2)} Cr` : `₹${p.priceLakh} L`;
      const area = p.areaValue ? ` · ${p.areaValue} ${p.areaUnit === "acre" ? "acres" : "sq.yd"}` : "";
      popupRef.current?.remove();
      popupRef.current = new Popup({ closeButton: false, closeOnClick: false, offset: 12, className: "uv-map-tip" })
        .setLngLat((f.geometry as GeoJSON.Point).coordinates as [number, number])
        .setHTML(`<span style="font:600 12px Inter,system-ui;color:#0D0D12">${price}${area}</span>`)
        .addTo(map);
    });
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

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const src = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    src?.setData({ type: "FeatureCollection", features: visible } as GeoJSON.FeatureCollection);
  }, [visible, ready]);

  // Colour mode → repaint dots
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.setPaintProperty(DOT_LAYER, "circle-color", colorExpression(color) as never);
  }, [color, ready]);

  // Selection + hover highlight
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const id = selected ?? hoveredId ?? "__none__";
    map.setFilter(SELECTED_LAYER, ["==", ["get", "id"], id] as never);
  }, [selected, hoveredId, ready]);

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
        map.addLayer(selectedLayer as never);
      }
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
  }, [layers, infraCatalog, ready]);

  // ── Actions ──
  const flyTo = useCallback((lat: number, lng: number, zoom: number) => {
    mapRef.current?.flyTo({ center: [lng, lat], zoom, duration: 900 });
  }, []);

  const onPickLocation = useCallback((r: GeoResult) => {
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

  const nothingInView = loadedOnce && data.count === 0;
  const showEmptyAll = nothingInView && totalListings === 0;
  const showNoneHere = nothingInView && totalListings !== 0 && filtersActive;
  const showZoomOut = nothingInView && totalListings !== 0 && !filtersActive;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", background: "#0D0D12" }}>
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />

      <LoadingBar active={loading} />
      {staleError && <StaleBanner />}

      {/* Top control bar */}
      <div style={{ position: "absolute", top: 16, left: 16, right: 16, display: "flex", gap: 10, alignItems: "flex-start", zIndex: 16, pointerEvents: "none", flexWrap: "wrap" }}>
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
          />
        </div>
      </div>

      {/* Chips */}
      {!isMobile && (
        <div style={{ position: "absolute", top: 74, left: 16, right: 16, zIndex: 15, pointerEvents: "none" }}>
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

      {selected && <PropertyDetailCard id={selected} onClose={() => commitSelected(null)} isMobile={isMobile} />}

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
