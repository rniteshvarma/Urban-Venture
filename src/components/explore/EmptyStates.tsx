"use client";

// Part 7. An empty map is a valid, correct state — never an error, never a
// redirect, never a blank white screen (Constraint 3).

import Link from "next/link";
import { Map as MapIcon, SearchX, ZoomOut, WifiOff } from "lucide-react";

const panel: React.CSSProperties = {
  background: "#fff",
  borderRadius: 20,
  boxShadow: "0 4px 20px rgba(16,16,26,.18)",
  padding: "1.75rem 2rem",
  textAlign: "center",
  maxWidth: 380,
  pointerEvents: "auto",
};

/** Nothing in the database at all — a fresh install, before any listing has coordinates. */
export function NoPropertiesAnywhere() {
  return (
    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none", zIndex: 20 }}>
      <div style={panel}>
        <MapIcon size={30} style={{ color: "var(--color-saffron-deep, #B87A00)" }} />
        <h3 style={{ fontFamily: "var(--font-jakarta)", fontWeight: 800, fontSize: "1.05rem", color: "var(--color-ink, #0D0D12)", marginTop: 10 }}>
          No properties on the map yet
        </h3>
        <p style={{ color: "#5A5A66", fontSize: "0.875rem", marginTop: 6, lineHeight: 1.5 }}>
          Properties will appear here as they&apos;re added.
        </p>
        <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/market" className="uv-btn uv-btn-ghost" style={{ fontSize: "0.8125rem" }}>Browse corridors</Link>
          <Link href="/dashboard/selling/new" className="uv-btn uv-btn-primary" style={{ fontSize: "0.8125rem" }}>List your property</Link>
        </div>
      </div>
    </div>
  );
}

const toast: React.CSSProperties = {
  position: "absolute",
  bottom: 24,
  left: "50%",
  transform: "translateX(-50%)",
  background: "#fff",
  borderRadius: 14,
  boxShadow: "0 4px 20px rgba(16,16,26,.18)",
  padding: "10px 14px",
  display: "flex",
  alignItems: "center",
  gap: 10,
  fontSize: "0.8125rem",
  color: "#2A2A35",
  zIndex: 20,
  pointerEvents: "auto",
  maxWidth: "min(92vw, 520px)",
};

/** Data exists, but not in this viewport. */
export function NoneInViewport({ onZoomOut, onClearFilters, hasFilters }: { onZoomOut: () => void; onClearFilters: () => void; hasFilters: boolean }) {
  return (
    <div style={toast}>
      <ZoomOut size={16} style={{ flexShrink: 0, color: "#8A8A99" }} />
      <span style={{ flex: 1 }}>No properties in this area — try zooming out{hasFilters ? " or adjusting filters" : ""}</span>
      <button onClick={onZoomOut} className="uv-btn uv-btn-ghost" style={{ fontSize: "0.75rem", padding: "5px 10px" }}>Zoom out</button>
      {hasFilters && (
        <button onClick={onClearFilters} className="uv-btn uv-btn-ghost" style={{ fontSize: "0.75rem", padding: "5px 10px" }}>Clear filters</button>
      )}
    </div>
  );
}

/** Filters exclude everything, anywhere. */
export function NoFilterMatches({ onClearFilters }: { onClearFilters: () => void }) {
  return (
    <div style={toast}>
      <SearchX size={16} style={{ flexShrink: 0, color: "#8A8A99" }} />
      <span style={{ flex: 1 }}>No properties match your filters</span>
      <button onClick={onClearFilters} className="uv-btn uv-btn-primary" style={{ fontSize: "0.75rem", padding: "5px 10px" }}>Clear all filters</button>
    </div>
  );
}

/** A refresh failed — the last good data stays on screen behind this. */
export function StaleBanner() {
  return (
    <div style={{ ...toast, bottom: "auto", top: 88 }}>
      <WifiOff size={15} style={{ flexShrink: 0, color: "#B87A00" }} />
      <span>Couldn&apos;t refresh — retrying…</span>
    </div>
  );
}

/** Thin progress bar across the top of the canvas; never blocks interaction. */
export function LoadingBar({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, overflow: "hidden", zIndex: 30, pointerEvents: "none" }}>
      <div style={{ height: "100%", width: "40%", background: "var(--color-saffron, #FFB400)", animation: "uv-slide 1.1s ease-in-out infinite" }} />
      <style>{`@keyframes uv-slide { 0% { transform: translateX(-100%) } 100% { transform: translateX(350%) } }`}</style>
    </div>
  );
}
