"use client";

// URL is the source of truth for map position, filters, colour mode, enabled
// layers, and selection (Constraint 8) — so any view is shareable and the
// browser Back button behaves.
//
// Position uses replaceState (a pan must not flood history); filters and
// selection use pushState so Back closes the detail card.

import { useCallback, useEffect, useRef, useState } from "react";
import type { ColorMode } from "./color-modes";

export interface ExploreFilterState {
  types: string[];
  source: "ADMIN" | "SELLER" | "ALL";
  minPrice: number | null;
  maxPrice: number | null;
  minArea: number | null;
  maxArea: number | null;
  approvals: string[];
  grades: string[];
  postedWithin: number | null;
  verifiedOnly: boolean;
}

export interface ExploreView {
  lat: number;
  lng: number;
  zoom: number;
}

export const DEFAULT_VIEW: ExploreView = { lat: 17.385, lng: 78.4867, zoom: 9 };

export const DEFAULT_FILTERS: ExploreFilterState = {
  types: [],
  source: "ALL",
  minPrice: null,
  maxPrice: null,
  minArea: null,
  maxArea: null,
  approvals: [],
  grades: [],
  postedWithin: null,
  verifiedOnly: false,
};

const GRADE_MIN: Record<string, number> = { A: 80, B: 65, C: 50, D: 0 };

/** Filter state → API query params. */
export function filtersToParams(f: ExploreFilterState): URLSearchParams {
  const p = new URLSearchParams();
  if (f.types.length) p.set("propertyType", f.types.join(","));
  if (f.source !== "ALL") p.set("source", f.source);
  if (f.minPrice != null) p.set("minPrice", String(f.minPrice));
  if (f.maxPrice != null) p.set("maxPrice", String(f.maxPrice));
  if (f.minArea != null) p.set("minArea", String(f.minArea));
  if (f.maxArea != null) p.set("maxArea", String(f.maxArea));
  if (f.approvals.length) p.set("approvalStatus", f.approvals.join(","));
  if (f.postedWithin != null) p.set("postedWithin", String(f.postedWithin));
  if (f.verifiedOnly) p.set("verifiedOnly", "true");
  // Grades are expressed to the API as a minimum score.
  if (f.grades.length) {
    const min = Math.min(...f.grades.map((g) => GRADE_MIN[g] ?? 0));
    if (min > 0) p.set("minScore", String(min));
  }
  return p;
}

const numOrNull = (v: string | null) => (v == null || v === "" ? null : Number.isFinite(Number(v)) ? Number(v) : null);
const listOf = (v: string | null) => (v ?? "").split(",").map((s) => s.trim()).filter(Boolean);

function readUrl() {
  const sp = new URLSearchParams(window.location.search);
  const lat = numOrNull(sp.get("lat"));
  const lng = numOrNull(sp.get("lng"));
  const z = numOrNull(sp.get("z"));
  const view: ExploreView = {
    lat: lat ?? DEFAULT_VIEW.lat,
    lng: lng ?? DEFAULT_VIEW.lng,
    zoom: z ?? DEFAULT_VIEW.zoom,
  };
  const srcRaw = (sp.get("src") ?? "ALL").toUpperCase();
  const filters: ExploreFilterState = {
    types: listOf(sp.get("type")),
    source: srcRaw === "ADMIN" || srcRaw === "SELLER" ? srcRaw : "ALL",
    minPrice: numOrNull(sp.get("min")),
    maxPrice: numOrNull(sp.get("max")),
    minArea: numOrNull(sp.get("amin")),
    maxArea: numOrNull(sp.get("amax")),
    approvals: listOf(sp.get("approval")),
    grades: listOf(sp.get("grade")),
    postedWithin: numOrNull(sp.get("posted")),
    verifiedOnly: sp.get("verified") === "true",
  };
  return {
    view,
    filters,
    hadView: lat != null && lng != null,
    color: (sp.get("color") as ColorMode) || "price",
    layers: listOf(sp.get("layers")),
    selected: sp.get("sel"),
  };
}

export function useUrlState() {
  const [view, setView] = useState<ExploreView>(DEFAULT_VIEW);
  const [filters, setFilters] = useState<ExploreFilterState>(DEFAULT_FILTERS);
  const [color, setColor] = useState<ColorMode>("price");
  const [layers, setLayers] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  /** True when the URL carried an explicit position — it wins over saved prefs. */
  const hadView = useRef(false);

  // Read on mount; URL wins over saved preferences.
  useEffect(() => {
    const s = readUrl();
    hadView.current = s.hadView;
    setView(s.view);
    setFilters(s.filters);
    setColor(s.color);
    setLayers(s.layers);
    setSelected(s.selected);
    setHydrated(true);
  }, []);

  // Back/forward must reproduce the view.
  useEffect(() => {
    const onPop = () => {
      const s = readUrl();
      setView(s.view);
      setFilters(s.filters);
      setColor(s.color);
      setLayers(s.layers);
      setSelected(s.selected);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const write = useCallback((push: boolean, next: Partial<{
    view: ExploreView; filters: ExploreFilterState; color: ColorMode; layers: string[]; selected: string | null;
  }>) => {
    const v = next.view ?? view;
    const f = next.filters ?? filters;
    const c = next.color ?? color;
    const l = next.layers ?? layers;
    const sel = next.selected !== undefined ? next.selected : selected;

    const p = new URLSearchParams();
    p.set("lat", v.lat.toFixed(4));
    p.set("lng", v.lng.toFixed(4));
    p.set("z", String(Math.round(v.zoom * 10) / 10));
    if (f.types.length) p.set("type", f.types.join(","));
    if (f.source !== "ALL") p.set("src", f.source);
    if (f.minPrice != null) p.set("min", String(f.minPrice));
    if (f.maxPrice != null) p.set("max", String(f.maxPrice));
    if (f.minArea != null) p.set("amin", String(f.minArea));
    if (f.maxArea != null) p.set("amax", String(f.maxArea));
    if (f.approvals.length) p.set("approval", f.approvals.join(","));
    if (f.grades.length) p.set("grade", f.grades.join(","));
    if (f.postedWithin != null) p.set("posted", String(f.postedWithin));
    if (f.verifiedOnly) p.set("verified", "true");
    if (c !== "price") p.set("color", c);
    if (l.length) p.set("layers", l.join(","));
    if (sel) p.set("sel", sel);

    const url = `${window.location.pathname}?${p.toString()}`;
    if (push) window.history.pushState(null, "", url);
    else window.history.replaceState(null, "", url);
  }, [view, filters, color, layers, selected]);

  // Panning replaces (never pushes) so history isn't flooded.
  const commitView = useCallback((v: ExploreView) => { setView(v); write(false, { view: v }); }, [write]);
  // Filters and selection push, so Back closes the card / undoes a filter.
  const commitFilters = useCallback((f: ExploreFilterState) => { setFilters(f); write(true, { filters: f }); }, [write]);
  const commitSelected = useCallback((id: string | null) => { setSelected(id); write(true, { selected: id }); }, [write]);
  const commitColor = useCallback((c: ColorMode) => { setColor(c); write(false, { color: c }); }, [write]);
  const commitLayers = useCallback((l: string[]) => { setLayers(l); write(false, { layers: l }); }, [write]);

  return {
    view, filters, color, layers, selected, hydrated, urlHadView: hadView.current,
    commitView, commitFilters, commitSelected, commitColor, commitLayers,
  };
}
