"use client";

// Top-left search (§4.1). Typeahead runs over this project's OWN geography —
// corridors, villages, mandals, districts — via /api/geo/search.
//
// A result whose centroid has not been populated (all mandals/districts today,
// and any corridor without centroidLat/Lng) cannot recentre the map. Rather
// than flying somewhere wrong, those results are labelled and apply a filter.

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, LocateFixed, X, Clock } from "lucide-react";

export interface GeoResult {
  id: string;
  label: string;
  sublabel: string | null;
  group: "Corridors" | "Villages" | "Mandals" | "Districts";
  flyTo: { lat: number; lng: number; zoom: number } | null;
  corridorSlug?: string;
}

const RECENTS_KEY = "uv_explore_recents";
const readRecents = (): GeoResult[] => {
  try { return JSON.parse(localStorage.getItem(RECENTS_KEY) ?? "[]"); } catch { return []; }
};

export default function MapSearchBar({ onPick, onLocate }: { onPick: (r: GeoResult) => void; onLocate: () => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [recents, setRecents] = useState<GeoResult[]>([]);
  const abort = useRef<AbortController | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => { setRecents(readRecents()); }, []);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      abort.current?.abort();
      const ctrl = new AbortController();
      abort.current = ctrl;
      setBusy(true);
      try {
        const r = await fetch(`/api/geo/search?q=${encodeURIComponent(q.trim())}`, { signal: ctrl.signal });
        const d = await r.json();
        setResults(d.results ?? []);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setResults([]);
      } finally { setBusy(false); }
    }, 220);
    return () => clearTimeout(t);
  }, [q]);

  const pick = useCallback((r: GeoResult) => {
    const next = [r, ...readRecents().filter((x) => x.id !== r.id)].slice(0, 5);
    try { localStorage.setItem(RECENTS_KEY, JSON.stringify(next)); } catch { /* private mode */ }
    setRecents(next);
    setQ(r.label);
    setOpen(false);
    onPick(r);
  }, [onPick]);

  const showRecents = open && q.trim().length < 2 && recents.length > 0;
  const grouped = results.reduce<Record<string, GeoResult[]>>((acc, r) => {
    (acc[r.group] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div ref={box} style={{ position: "relative", width: "min(380px, 74vw)", pointerEvents: "auto" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8, background: "#fff",
        borderRadius: 999, boxShadow: "0 4px 20px rgba(16,16,26,.18)", padding: "0 6px 0 14px", height: 46,
      }}>
        <Search size={17} style={{ color: "#8A8A99", flexShrink: 0 }} />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search a location — Kokapet, Adibatla, Shankarpally…"
          style={{ flex: 1, border: "none", outline: "none", fontSize: "0.875rem", color: "#1A1A24", background: "transparent", minWidth: 0 }}
        />
        {q && (
          <button onClick={() => { setQ(""); setResults([]); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#8A8A99", display: "grid", placeItems: "center" }} aria-label="Clear search">
            <X size={15} />
          </button>
        )}
        <button
          onClick={onLocate}
          title="Use my location"
          aria-label="Use my location"
          style={{ width: 34, height: 34, borderRadius: 999, border: "none", background: "#F4F4F7", cursor: "pointer", display: "grid", placeItems: "center", color: "#2A2A35", flexShrink: 0 }}
        >
          <LocateFixed size={16} />
        </button>
      </div>

      {(open && (results.length > 0 || showRecents || (q.trim().length >= 2 && !busy))) && (
        <div style={{
          position: "absolute", top: 54, left: 0, right: 0, background: "#fff", borderRadius: 14,
          boxShadow: "0 4px 20px rgba(16,16,26,.18)", maxHeight: 340, overflowY: "auto", padding: 6,
        }}>
          {showRecents && (
            <>
              <GroupLabel>Recent</GroupLabel>
              {recents.map((r) => <Row key={`r-${r.id}`} r={r} onPick={pick} icon={<Clock size={13} />} />)}
            </>
          )}

          {Object.entries(grouped).map(([group, rows]) => (
            <div key={group}>
              <GroupLabel>{group}</GroupLabel>
              {rows.map((r) => <Row key={r.id} r={r} onPick={pick} />)}
            </div>
          ))}

          {q.trim().length >= 2 && !busy && results.length === 0 && (
            <div style={{ padding: "14px 12px", fontSize: "0.8125rem", color: "#8A8A99" }}>
              No matching location.
              <div style={{ fontSize: "0.6875rem", marginTop: 4, lineHeight: 1.45 }}>
                Village and mandal search activates once the LGD geography dataset is loaded.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: "0.625rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "#A0A0AE", fontWeight: 700, padding: "8px 10px 4px" }}>
      {children}
    </div>
  );
}

function Row({ r, onPick, icon }: { r: GeoResult; onPick: (r: GeoResult) => void; icon?: React.ReactNode }) {
  return (
    <button
      onClick={() => onPick(r)}
      style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: "8px 10px", borderRadius: 9, color: "#1A1A24" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#F4F4F7")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
    >
      {icon && <span style={{ color: "#A0A0AE", flexShrink: 0 }}>{icon}</span>}
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.label}</span>
        {r.sublabel && <span style={{ display: "block", fontSize: "0.6875rem", color: "#8A8A99", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.sublabel}</span>}
      </span>
      {!r.flyTo && (
        <span title="No map position on file — this filters instead of recentring" style={{ fontSize: "0.5625rem", color: "#B87A00", background: "#FDF3DC", padding: "2px 6px", borderRadius: 999, fontWeight: 700, flexShrink: 0 }}>
          FILTER
        </span>
      )}
    </button>
  );
}
