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

const RING_LABELS: Record<string, string> = {
  hospital: "Hospitals", transit: "Stations", school: "Schools", college: "Colleges",
  mall: "Malls", park: "Parks", bus_station: "Bus stations", job_hub: "Job hubs",
};

const CONFIDENCE = {
  HIGH: "Well mapped area",
  MEDIUM: "Partly mapped area",
  LOW: "Few places mapped nearby yet",
};

export const accessTone = (score: number) =>
  score >= 70 ? { fg: "#0B6B3D", bg: "#E6F4EC" } : score >= 50 ? { fg: "#7A5200", bg: "#FFF4D6" } : { fg: "#4A4A57", bg: "#F0F0F4" };

const dist = (km: number) => (km < 1 ? `${Math.round((km * 1000) / 10) * 10} m` : `${Math.round(km * 10) / 10} km`);

export default function AccessibilityPanel({ a, onShowNearby }: { a: AccessibilityView; onShowNearby?: () => void }) {
  const [ring, setRing] = useState<"2" | "5">("2");
  const tone = accessTone(a.score);
  const counts = Object.entries(a.within[ring] ?? {}).filter(([, n]) => n > 0);

  return (
    <section aria-label="Accessibility" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ minWidth: 52, height: 52, borderRadius: 14, display: "grid", placeItems: "center", background: tone.bg, color: tone.fg, fontFamily: "var(--font-jakarta)", fontWeight: 800, fontSize: "1.375rem" }}>
          {a.score}
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-jakarta)", fontWeight: 800, fontSize: "0.9375rem", color: "#0D0D12" }}>Accessibility</div>
          <div style={{ fontSize: "0.75rem", color: "#6B6B78" }}>out of 100 · {CONFIDENCE[a.confidence]}</div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {a.components.map((c) => (
          <div key={c.key}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
              <span style={{ fontWeight: 600, color: "#2A2A35" }}>{c.label}</span>
              <span className="uv-mono" style={{ color: "#6B6B78" }}>{c.points}/{c.max}</span>
            </div>
            <div style={{ height: 5, borderRadius: 999, background: "#F0F0F4", marginTop: 4 }}>
              <div style={{ height: "100%", width: `${(c.points / c.max) * 100}%`, borderRadius: 999, background: "#FFB400" }} />
            </div>
            <div style={{ fontSize: "0.6875rem", color: "#8A8A99", marginTop: 3, lineHeight: 1.4 }}>{c.note}</div>
          </div>
        ))}
      </div>

      <div>
        <div style={{ fontSize: "0.625rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "#8A8A99", fontWeight: 700, marginBottom: 6 }}>Nearest</div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", rowGap: 5, columnGap: 10, fontSize: "0.75rem" }}>
          {NEAREST.filter((n) => a.nearest[n.key]).map((n) => {
            const v = a.nearest[n.key]!;
            return (
              <div key={n.key} style={{ display: "contents" }}>
                <span style={{ color: "#2A2A35", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  <span style={{ color: "#8A8A99" }}>{n.label(v.sub)}</span>{v.name ? ` · ${v.name}` : ""}
                </span>
                <span className="uv-mono" style={{ color: "#0D0D12", fontWeight: 600, textAlign: "right" }}>{dist(v.km)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: "0.625rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "#8A8A99", fontWeight: 700 }}>Within</span>
          <div role="group" aria-label="Ring radius" style={{ display: "flex", gap: 4 }}>
            {(["2", "5"] as const).map((k) => (
              <button key={k} type="button" aria-pressed={ring === k} onClick={() => setRing(k)} style={{
                borderRadius: 999, padding: "3px 10px", fontSize: "0.6875rem", fontWeight: 700, cursor: "pointer",
                border: ring === k ? "1px solid #FFB400" : "1px solid #E4E4EA", background: ring === k ? "#FFF4D6" : "#fff", color: ring === k ? "#7A5200" : "#3A3A47",
              }}>{k} km</button>
            ))}
          </div>
        </div>
        {counts.length ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {counts.map(([k, n]) => (
              <span key={k} style={{ fontSize: "0.6875rem", color: "#2A2A35", background: "#F4F4F7", borderRadius: 999, padding: "3px 9px" }}>
                <b>{n}</b> {RING_LABELS[k] ?? k}
              </span>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: "0.6875rem", color: "#8A8A99" }}>No mapped places within {ring} km.</div>
        )}
      </div>

      {a.watchOuts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {a.watchOuts.map((w) => (
            <div key={w.key} style={{ display: "flex", gap: 7, alignItems: "flex-start", fontSize: "0.75rem", color: "#8A4B00", background: "#FFF4E5", borderRadius: 10, padding: "7px 9px" }}>
              <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} /> {w.label}
            </div>
          ))}
        </div>
      )}

      {onShowNearby && (
        <button type="button" onClick={onShowNearby} style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: "0.75rem", fontWeight: 700,
          border: "1px solid #E4E4EA", background: "#fff", color: "#2A2A35", borderRadius: 10, padding: "8px 10px", cursor: "pointer",
        }}>
          <MapPin size={13} /> Show nearby places on the map
        </button>
      )}

      <div style={{ fontSize: "0.625rem", color: "#A0A0AE", lineHeight: 1.45 }}>
        Straight-line distances. Places from <a href={OSM_COPYRIGHT_URL} target="_blank" rel="noreferrer" style={{ color: "#8A8A99" }}>{OSM_ATTRIBUTION}</a>. Separate from the listing rating.
      </div>
    </section>
  );
}
