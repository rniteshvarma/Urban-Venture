"use client";

// Bottom-right colour-mode switch plus the legend for the active mode (§3.3).

import { COLOR_MODE_LABELS, legendFor, type ColorMode } from "@/lib/explore/color-modes";
import { X, glass, sectionLabel } from "./theme";

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
      ...glass, borderRadius: 14,
      padding: "10px 12px", minWidth: 190, pointerEvents: "auto",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <span style={sectionLabel}>Colour by</span>
        <select
          value={mode}
          onChange={(e) => onChange(e.target.value as ColorMode)}
          style={{ marginLeft: "auto", fontSize: "0.75rem", fontWeight: 600, border: `1px solid ${X.line}`, borderRadius: 8, padding: "3px 24px 3px 8px", backgroundColor: X.raised, color: X.text, cursor: "pointer" }}
        >
          {MODES.map((m) => <option key={m} value={m}>{COLOR_MODE_LABELS[m]}</option>)}
        </select>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: "0.6875rem", color: X.textMid }}>
            <span style={{ width: 10, height: 10, borderRadius: 999, background: it.color, flexShrink: 0, boxShadow: `0 0 8px ${it.color}` }} />
            <span>{it.label}</span>
          </div>
        ))}
      </div>

      {note && <p style={{ fontSize: "0.625rem", color: X.textLo, marginTop: 7, lineHeight: 1.4 }}>{note}</p>}

      <div style={{ borderTop: `1px solid ${X.line}`, marginTop: 9, paddingTop: 7, fontSize: "0.75rem", color: X.textMid }}>
        <b className="uv-mono" style={{ color: X.text }}>{count.toLocaleString("en-IN")}</b> {count === 1 ? "property" : "properties"}
        {truncated && (
          <div style={{ fontSize: "0.625rem", color: X.saffronText, marginTop: 2 }}>
            Showing top 3,000 — zoom in to see all
          </div>
        )}
      </div>
    </div>
  );
}
