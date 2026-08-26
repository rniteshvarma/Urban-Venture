"use client";

// Viewport data fetching for the Explore Map: debounced on moveend, aborts the
// previous request, and caches by tile+filter so panning back is instant.
// On failure the last good data stays on screen (Part 7) — the map is never
// cleared because a refresh failed.

import { useCallback, useEffect, useRef, useState } from "react";
import type { ExploreFilterState } from "./use-url-state";
import { filtersToParams } from "./use-url-state";

export interface PropertyFeature {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: {
    id: string;
    ref: string;
    name: string;
    priceLakh: number;
    rateValue: number | null;
    rateUnit: string | null;
    areaValue: number | null;
    areaUnit: string | null;
    propertyType: string;
    source: "ADMIN" | "SELLER";
    isVerified: boolean;
    scoreGrade: string | null;
    priceBand: number;
    thumb: string | null;
  };
}

export interface FeatureCollection {
  type: "FeatureCollection";
  count: number;
  truncated: boolean;
  priceBreaks: number[];
  features: PropertyFeature[];
}

const EMPTY: FeatureCollection = { type: "FeatureCollection", count: 0, truncated: false, priceBreaks: [], features: [] };

export interface Bounds { minLng: number; minLat: number; maxLng: number; maxLat: number }

const CACHE_MAX = 50;

export function useMapData(filters: ExploreFilterState) {
  const [data, setData] = useState<FeatureCollection>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [staleError, setStaleError] = useState(false);
  /** false until the first successful response — drives the empty-state overlay */
  const [loadedOnce, setLoadedOnce] = useState(false);

  const cache = useRef(new Map<string, FeatureCollection>());
  const abort = useRef<AbortController | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retry = useRef<ReturnType<typeof setTimeout> | null>(null);

  const run = useCallback(async (bounds: Bounds, zoom: number) => {
    const q = (n: number) => Math.round(n * 100) / 100;
    const bbox = `${bounds.minLng},${bounds.minLat},${bounds.maxLng},${bounds.maxLat}`;
    const params = filtersToParams(filters);
    params.set("bbox", bbox);
    params.set("zoom", String(Math.round(zoom)));

    const key = `${q(bounds.minLng)},${q(bounds.minLat)},${q(bounds.maxLng)},${q(bounds.maxLat)}|${Math.round(zoom)}|${params.toString()}`;
    const hit = cache.current.get(key);
    if (hit) { setData(hit); setLoadedOnce(true); setStaleError(false); return; }

    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    setLoading(true);

    try {
      const res = await fetch(`/api/explore/properties?${params}`, { signal: ctrl.signal });
      if (!res.ok) throw new Error(String(res.status));
      const json: FeatureCollection = await res.json();
      if (cache.current.size >= CACHE_MAX) {
        const oldest = cache.current.keys().next().value;
        if (oldest) cache.current.delete(oldest);
      }
      cache.current.set(key, json);
      setData(json);
      setLoadedOnce(true);
      setStaleError(false);
    } catch (e) {
      if ((e as Error).name === "AbortError") return; // superseded by a newer move
      // Keep the last good data on screen and retry quietly.
      setStaleError(true);
      if (retry.current) clearTimeout(retry.current);
      retry.current = setTimeout(() => run(bounds, zoom), 4000);
    } finally {
      if (abort.current === ctrl) setLoading(false);
    }
  }, [filters]);

  /** Debounced entry point — call from the map's moveend handler. */
  const request = useCallback((bounds: Bounds, zoom: number, immediate = false) => {
    if (timer.current) clearTimeout(timer.current);
    if (immediate) { void run(bounds, zoom); return; }
    timer.current = setTimeout(() => void run(bounds, zoom), 400);
  }, [run]);

  // Filters changing invalidates the cache — the same viewport now means
  // something different.
  useEffect(() => { cache.current.clear(); }, [filters]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    if (retry.current) clearTimeout(retry.current);
    abort.current?.abort();
  }, []);

  return { data, loading, staleError, loadedOnce, request };
}
