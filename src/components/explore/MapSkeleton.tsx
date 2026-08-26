"use client";

/** Shown while the ~200KB maplibre-gl chunk loads (Part 9.5). */
export default function MapSkeleton() {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", background: "#0D0D12", overflow: "hidden" }}>
      <div className="uv-skeleton" style={{ position: "absolute", inset: 0, opacity: 0.15 }} />
      <div style={{ position: "absolute", top: 16, left: 16, display: "flex", gap: 10 }}>
        <div className="uv-skeleton" style={{ width: 320, height: 46, borderRadius: 999 }} />
        <div className="uv-skeleton" style={{ width: 96, height: 46, borderRadius: 999 }} />
      </div>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: 999, border: "3px solid rgba(255,255,255,0.15)", borderTopColor: "var(--color-saffron)", animation: "uv-spin 0.9s linear infinite" }} />
        <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.8125rem" }}>Loading map…</span>
      </div>
      <style>{`@keyframes uv-spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
