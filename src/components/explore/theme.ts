// Dark "glass" theme for every panel on the Explore Map, matching the dark 3D
// base map. One place for the colours so the panels stay consistent.

import type { CSSProperties } from "react";

export const X = {
  /** Page behind the map */
  bg: "#0D0D12",
  /** Floating panels (glass over the map) */
  panel: "rgba(18,18,25,0.94)",
  /** Solid surfaces: list background, sheets */
  solid: "#121219",
  /** Cards, inputs and buttons inside a panel */
  raised: "#1B1B24",
  raisedHover: "#24242F",
  line: "rgba(255,255,255,0.09)",
  lineStrong: "rgba(255,255,255,0.16)",
  text: "#F2F2F6",
  textMid: "#C4C4D0",
  textLo: "#8E8E9E",
  textFaint: "#6A6A7A",
  saffron: "#FFB400",
  saffronText: "#FFCB52",
  saffronSoft: "rgba(255,180,0,0.14)",
  saffronLine: "rgba(255,180,0,0.45)",
  good: "#4ADE9B",
  goodSoft: "rgba(74,222,155,0.12)",
  warn: "#FFB547",
  shadow: "0 10px 30px rgba(0,0,0,.45)",
  blur: "blur(14px)",
} as const;

/** A floating glass panel. */
export const glass: CSSProperties = {
  background: X.panel,
  border: `1px solid ${X.line}`,
  boxShadow: X.shadow,
  backdropFilter: X.blur,
  WebkitBackdropFilter: X.blur,
  color: X.text,
};

/** The round top-bar buttons (Filters, My Requirements, Layers). */
export const pillBtn: CSSProperties = {
  ...glass,
  display: "inline-flex", alignItems: "center", gap: 7,
  borderRadius: 999, padding: "0 16px", height: 46, cursor: "pointer",
  fontSize: "0.8125rem", fontWeight: 600, color: X.text,
  pointerEvents: "auto", whiteSpace: "nowrap",
};

/** A toggle pill inside a panel (filters, base map, ring radius). */
export const choicePill = (on: boolean): CSSProperties => ({
  borderRadius: 999, padding: "6px 12px", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer",
  border: `1px solid ${on ? X.saffronLine : X.line}`,
  background: on ? X.saffronSoft : X.raised,
  color: on ? X.saffronText : X.textMid,
});

/** Small uppercase section label. */
export const sectionLabel: CSSProperties = {
  fontSize: "0.625rem", textTransform: "uppercase", letterSpacing: "0.08em", color: X.textLo, fontWeight: 700,
};

/** Secondary button on a dark panel (the site's ghost button is light). */
export const ghostBtn: CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
  borderRadius: 999, padding: "8px 14px", fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer",
  border: `1px solid ${X.lineStrong}`, background: X.raised, color: X.text,
};

export const iconBtn: CSSProperties = {
  background: "none", border: "none", cursor: "pointer", color: X.textLo, display: "grid", placeItems: "center",
};
