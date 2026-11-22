"use client";

// Accessibility — how well connected and well served a listing's location is,
// from OpenStreetMap places. Its own score, deliberately separate from the
// listing rating. Distances are straight-line.

import { useState } from "react";
import { AlertTriangle, MapPin } from "lucide-react";
import { OSM_ATTRIBUTION, OSM_COPYRIGHT_URL } from "@/lib/osm/categories";

export interface AccessibilityView {
  score: number;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  components: { key: string; label: string; points: number; max: number; note: string }[];
  nearest: Record<string, { name: string | null; km: number; sub?: string | null } | undefined>;
  within: Record<"2" | "5", Record<string, number>>;
  watchOuts: { key: string; label: string }[];
}

const NEAREST: { key: string; label: (sub?: string | null) => string }[] = [
  { key: "hospital", label: () => "Hospital" },
  { key: "transit", label: (sub) => (sub === "metro" ? "Metro station" : "Railway station") },
  { key: "orr_exit", label: () => "ORR / expressway exit" },
  { key: "school", label: () => "School" },
  { key: "college", label: () => "College" },
  { key: "mall", label: () => "Mall" },
  { key: "park", label: () => "Park" },
  { key: "job_hub", label: () => "Job hub" },
  { key: "airport", label: () => "Airport" },
];

/** Beacon colours on the 3D map (match useFocus3D's FOCUS_KIND_COLOR). */
const NEAREST_DOT: Record<string, string> = {
  hospital: "rgb(255,92,97)", transit: "rgb(63,169,255)", orr_exit: "rgb(230,230,238)", school: "rgb(125,151,255)",
  college: "rgb(176,122,232)", mall: "rgb(255,138,61)", park: "rgb(70,199,127)", job_hub: "rgb(217,144,90)", airport: "rgb(201,167,255)",
};

const RING_LABELS: Record<string, string> = {
  hospital: "Hospitals", transit: "Stations", school: "Schools", college: "Colleges",
  mall: "Malls", park: "Parks", bus_station: "Bus stations", job_hub: "Job hubs",
};

const CONFIDENCE = {
  HIGH: "Well mapped area",
  MEDIUM: "Partly mapped area",
  LOW: "Few places mapped nearby yet",
};

export const accessTone = (score: number, dark = false) =>
  dark
    ? score >= 70 ? { fg: "#4ADE9B", bg: "rgba(74,222,155,.13)" } : score >= 50 ? { fg: "#FFCB52", bg: "rgba(255,180,0,.14)" } : { fg: "#C4C4D0", bg: "rgba(255,255,255,.08)" }
    : score >= 70 ? { fg: "#0B6B3D", bg: "#E6F4EC" } : score >= 50 ? { fg: "#7A5200", bg: "#FFF4D6" } : { fg: "#4A4A57", bg: "#F0F0F4" };

/** Text, line and surface colours for the light page and the dark map. */
const PALETTE = {
  light: { hi: "#0D0D12", mid: "#2A2A35", lo: "#6B6B78", faint: "#8A8A99", track: "#F0F0F4", line: "#E4E4EA", surface: "#fff", chip: "#F4F4F7", onBg: "#FFF4D6", onFg: "#7A5200", warnBg: "#FFF4E5", warnFg: "#8A4B00", rowOn: "#FFF4D6" },
  dark: { hi: "#F2F2F6", mid: "#C4C4D0", lo: "#9A9AAA", faint: "#8E8E9E", track: "rgba(255,255,255,.08)", line: "rgba(255,255,255,.12)", surface: "#1B1B24", chip: "rgba(255,255,255,.06)", onBg: "rgba(255,180,0,.14)", onFg: "#FFCB52", warnBg: "rgba(255,150,40,.12)", warnFg: "#FFB547", rowOn: "rgba(255,180,0,.12)" },
};

const dist = (km: number) => (km < 1 ? `${Math.round((km * 1000) / 10) * 10} m` : `${Math.round(km * 10) / 10} km`);

export default function AccessibilityPanel({ a, onShowNearby, dark = false, onPickNearest, activeNearest, pickable = [] }: {
  a: AccessibilityView;
  onShowNearby?: () => void;
  /** the dark Explore Map card */
  dark?: boolean;
  /** tap a nearest place (the 3D map flies to it) */
  onPickNearest?: (key: string) => void;
  activeNearest?: string | null;
  /** nearest kinds that can be picked (those with a position on the map) */
  pickable?: string[];
}) {
  const [ring, setRing] = useState<"2" | "5">("2");
  const tone = accessTone(a.score, dark);
  const P = PALETTE[dark ? "dark" : "light"];
  const counts = Object.entries(a.within[ring] ?? {}).filter(([, n]) => n > 0);

  return (
    <section aria-label="Accessibility" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ minWidth: 52, height: 52, borderRadius: 14, display: "grid", placeItems: "center", background: tone.bg, color: tone.fg, fontFamily: "var(--font-jakarta)", fontWeight: 800, fontSize: "1.375rem" }}>
          {a.score}
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-jakarta)", fontWeight: 800, fontSize: "0.9375rem", color: P.hi }}>Accessibility</div>
          <div style={{ fontSize: "0.75rem", color: P.lo }}>out of 100 · {CONFIDENCE[a.confidence]}</div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {a.components.map((c) => (
          <div key={c.key}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
              <span style={{ fontWeight: 600, color: P.mid }}>{c.label}</span>
              <span className="uv-mono" style={{ color: P.lo }}>{c.points}/{c.max}</span>
            </div>
            <div style={{ height: 5, borderRadius: 999, background: P.track, marginTop: 4 }}>
              <div style={{ height: "100%", width: `${(c.points / c.max) * 100}%`, borderRadius: 999, background: "#FFB400" }} />
            </div>
            <div style={{ fontSize: "0.6875rem", color: P.faint, marginTop: 3, lineHeight: 1.4 }}>{c.note}</div>
          </div>
        ))}
      </div>

      <div>
        <div style={{ fontSize: "0.625rem", textTransform: "uppercase", letterSpacing: "0.06em", color: P.faint, fontWeight: 700, marginBottom: 6 }}>
          Nearest{onPickNearest && pickable.length > 0 ? " · tap to see it in 3D" : ""}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 1, fontSize: "0.75rem" }}>
          {NEAREST.filter((n) => a.nearest[n.key]).map((n) => {
            const v = a.nearest[n.key]!;
            const can = !!onPickNearest && pickable.includes(n.key);
            const on = can && activeNearest === n.key;
            const row = (
              <>
                {can && <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, flexShrink: 0, background: NEAREST_DOT[n.key] ?? P.faint, boxShadow: `0 0 6px ${NEAREST_DOT[n.key] ?? P.faint}` }} />}
                <span style={{ flex: 1, color: P.mid, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "left" }}>
                  <span style={{ color: P.faint }}>{n.label(v.sub)}</span>{v.name ? ` · ${v.name}` : ""}
                </span>
                <span className="uv-mono" style={{ color: P.hi, fontWeight: 600, textAlign: "right", flexShrink: 0 }}>{dist(v.km)}</span>
              </>
            );
            return can ? (
              <button key={n.key} type="button" aria-pressed={on} onClick={() => onPickNearest!(n.key)} style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%", border: "none", cursor: "pointer", font: "inherit",
                background: on ? P.rowOn : "transparent", borderRadius: 8, padding: "5px 6px", margin: "0 -6px",
              }}>{row}</button>
            ) : (
              <div key={n.key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>{row}</div>
            );
          })}
        </div>
      </div>

      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: "0.625rem", textTransform: "uppercase", letterSpacing: "0.06em", color: P.faint, fontWeight: 700 }}>Within</span>
          <div role="group" aria-label="Ring radius" style={{ display: "flex", gap: 4 }}>
            {(["2", "5"] as const).map((k) => (
              <button key={k} type="button" aria-pressed={ring === k} onClick={() => setRing(k)} style={{
                borderRadius: 999, padding: "3px 10px", fontSize: "0.6875rem", fontWeight: 700, cursor: "pointer",
                border: ring === k ? "1px solid #FFB400" : `1px solid ${P.line}`, background: ring === k ? P.onBg : P.surface, color: ring === k ? P.onFg : P.mid,
              }}>{k} km</button>
            ))}
          </div>
        </div>
        {counts.length ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {counts.map(([k, n]) => (
              <span key={k} style={{ fontSize: "0.6875rem", color: P.mid, background: P.chip, borderRadius: 999, padding: "3px 9px" }}>
                <b>{n}</b> {RING_LABELS[k] ?? k}
              </span>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: "0.6875rem", color: P.faint }}>No mapped places within {ring} km.</div>
        )}
      </div>

      {a.watchOuts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {a.watchOuts.map((w) => (
            <div key={w.key} style={{ display: "flex", gap: 7, alignItems: "flex-start", fontSize: "0.75rem", color: P.warnFg, background: P.warnBg, borderRadius: 10, padding: "7px 9px" }}>
              <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} /> {w.label}
            </div>
          ))}
        </div>
      )}

      {onShowNearby && (
        <button type="button" onClick={onShowNearby} style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: "0.75rem", fontWeight: 700,
          border: `1px solid ${P.line}`, background: P.surface, color: P.mid, borderRadius: 10, padding: "8px 10px", cursor: "pointer",
        }}>
          <MapPin size={13} /> Show nearby places on the map
        </button>
      )}

      <div style={{ fontSize: "0.625rem", color: P.faint, lineHeight: 1.45 }}>
        Straight-line distances. Places from <a href={OSM_COPYRIGHT_URL} target="_blank" rel="noreferrer" style={{ color: P.lo }}>{OSM_ATTRIBUTION}</a>. Separate from the listing rating.
      </div>
    </section>
  );
}
