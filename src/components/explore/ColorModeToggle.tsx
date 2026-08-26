"use client";

// Bottom-right colour-mode switch plus the legend for the active mode (§3.3).

import { COLOR_MODE_LABELS, legendFor, type ColorMode } from "@/lib/explore/color-modes";

const MODES: ColorMode[] = ["price", "grade", "type"];

export default function ColorModeToggle({
  mode, onChange, priceBreaks, count, truncated,
}: {
  mode: ColorMode;
  onChange: (m: ColorMode) => void;
  priceBreaks: number[];
  count: number;
  truncated: boolean;
}) {
  const { items, note } = legendFor(mode, priceBreaks);

  return (
    <div style={{
      position: "absolute", right: 16, bottom: 20, zIndex: 15,
      background: "#fff", borderRadius: 14, boxShadow: "0 4px 20px rgba(16,16,26,.18)",
      padding: "10px 12px", minWidth: 190, pointerEvents: "auto",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "#8A8A99", fontWeight: 700 }}>Colour by</span>
        <select
          value={mode}
          onChange={(e) => onChange(e.target.value as ColorMode)}
          style={{ marginLeft: "auto", fontSize: "0.75rem", fontWeight: 600, border: "1px solid #E4E4EA", borderRadius: 8, padding: "3px 6px", background: "#fff", color: "#2A2A35", cursor: "pointer" }}
        >
          {MODES.map((m) => <option key={m} value={m}>{COLOR_MODE_LABELS[m]}</option>)}
        </select>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: "0.6875rem", color: "#4A4A57" }}>
            <span style={{ width: 10, height: 10, borderRadius: 999, background: it.color, flexShrink: 0, border: "1px solid rgba(0,0,0,.25)" }} />
            <span>{it.label}</span>
          </div>
        ))}
      </div>

      {note && <p style={{ fontSize: "0.625rem", color: "#8A8A99", marginTop: 7, lineHeight: 1.4 }}>{note}</p>}

      <div style={{ borderTop: "1px solid #EFEFF3", marginTop: 9, paddingTop: 7, fontSize: "0.75rem", color: "#2A2A35" }}>
        <b className="uv-mono">{count.toLocaleString("en-IN")}</b> {count === 1 ? "property" : "properties"}
        {truncated && (
          <div style={{ fontSize: "0.625rem", color: "#B87A00", marginTop: 2 }}>
            Showing top 3,000 — zoom in to see all
          </div>
        )}
      </div>
    </div>
  );
}
