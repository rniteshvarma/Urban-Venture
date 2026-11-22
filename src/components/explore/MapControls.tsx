"use client";

// Zoom / 3D tilt / locate / reset stack, bottom-right above the legend (§4.6).
// 44px targets so they stay usable on touch.

import { Plus, Minus, LocateFixed, Maximize } from "lucide-react";
import { X } from "./theme";

const btn: React.CSSProperties = {
  width: 44,
  height: 44,
  display: "grid",
  placeItems: "center",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  color: X.text,
};
const divider = { borderTop: `1px solid ${X.line}` };

export default function MapControls({
  onZoomIn, onZoomOut, onLocate, onReset, locating, pitched, onToggle3D,
}: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onLocate: () => void;
  onReset: () => void;
  locating?: boolean;
  /** the map is tilted (3D) */
  pitched?: boolean;
  onToggle3D?: () => void;
}) {
  return (
    <div style={{
      position: "absolute", right: 16, bottom: 230, zIndex: 15,
      borderRadius: 14, overflow: "hidden", background: X.panel, border: `1px solid ${X.line}`,
      boxShadow: X.shadow, backdropFilter: X.blur,
      display: "flex", flexDirection: "column", pointerEvents: "auto",
    }}>
      <button onClick={onZoomIn} style={btn} aria-label="Zoom in" title="Zoom in"><Plus size={18} /></button>
      <button onClick={onZoomOut} style={{ ...btn, ...divider }} aria-label="Zoom out" title="Zoom out"><Minus size={18} /></button>
      {onToggle3D && (
        <button onClick={onToggle3D} aria-pressed={pitched} style={{ ...btn, ...divider, fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.02em", color: pitched ? X.saffron : X.text }}
          aria-label={pitched ? "Flat 2D view" : "Tilt to 3D"} title={pitched ? "Flat 2D view" : "Tilt to 3D (or right-drag)"}>
          {pitched ? "2D" : "3D"}
        </button>
      )}
      <button onClick={onLocate} style={{ ...btn, ...divider, color: locating ? X.saffron : X.text }} aria-label="Use my location" title="Use my location"><LocateFixed size={17} /></button>
      <button onClick={onReset} style={{ ...btn, ...divider }} aria-label="Reset view" title="Reset view"><Maximize size={16} /></button>
    </div>
  );
}
