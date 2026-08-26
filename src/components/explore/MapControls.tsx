"use client";

// Zoom / locate / reset stack, bottom-right above the legend (§4.6).
// 44px targets so they stay usable on touch.

import { Plus, Minus, LocateFixed, Maximize } from "lucide-react";

const btn: React.CSSProperties = {
  width: 44,
  height: 44,
  display: "grid",
  placeItems: "center",
  background: "#fff",
  border: "none",
  cursor: "pointer",
  color: "#2A2A35",
};

export default function MapControls({
  onZoomIn, onZoomOut, onLocate, onReset, locating,
}: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onLocate: () => void;
  onReset: () => void;
  locating?: boolean;
}) {
  return (
    <div style={{
      position: "absolute", right: 16, bottom: 230, zIndex: 15,
      borderRadius: 14, overflow: "hidden", boxShadow: "0 4px 20px rgba(16,16,26,.18)",
      display: "flex", flexDirection: "column", pointerEvents: "auto",
    }}>
      <button onClick={onZoomIn} style={btn} aria-label="Zoom in" title="Zoom in"><Plus size={18} /></button>
      <button onClick={onZoomOut} style={{ ...btn, borderTop: "1px solid #EFEFF3" }} aria-label="Zoom out" title="Zoom out"><Minus size={18} /></button>
      <button onClick={onLocate} style={{ ...btn, borderTop: "1px solid #EFEFF3", color: locating ? "var(--color-saffron-deep, #B87A00)" : "#2A2A35" }} aria-label="Use my location" title="Use my location"><LocateFixed size={17} /></button>
      <button onClick={onReset} style={{ ...btn, borderTop: "1px solid #EFEFF3" }} aria-label="Reset view" title="Reset view"><Maximize size={16} /></button>
    </div>
  );
}
