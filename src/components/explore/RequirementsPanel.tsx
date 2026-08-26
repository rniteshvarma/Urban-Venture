"use client";

// "My Requirements" (§4.4). Reuses the existing saved-report / watchlist data
// from the user dashboard rather than introducing a new concept.
//
// Saved searches come from the existing SavedReport records (budget/city), and
// watched corridors from CorridorWatch. Signed-out users get a sign-in prompt
// that preserves the current filters through the auth round-trip.

import { useEffect, useState } from "react";
import { X, Pin, Star, Plus, LogIn } from "lucide-react";
import type { ExploreFilterState } from "@/lib/explore/use-url-state";

interface SavedReportRow { id: string; title: string; budget: number; horizon: number; city: string }
interface WatchRow { slug: string; name: string }

export default function RequirementsPanel({
  open, onToggleOpen, onApply, currentFilters,
}: {
  open: boolean;
  onToggleOpen: () => void;
  onApply: (f: Partial<ExploreFilterState>) => void;
  currentFilters: ExploreFilterState;
}) {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [reports, setReports] = useState<SavedReportRow[]>([]);
  const [watches, setWatches] = useState<WatchRow[]>([]);

  useEffect(() => {
    if (!open) return;
    fetch("/api/dashboard")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => {
        setAuthed(true);
        setReports(d.saved?.reports ?? []);
        setWatches((d.saved?.corridors ?? []).map((c: { slug: string; name: string }) => ({ slug: c.slug, name: c.name })));
      })
      .catch(() => setAuthed(false));
  }, [open]);

  if (!open) {
    return (
      <button onClick={onToggleOpen} style={pillBtn} title="My Requirements">
        <Pin size={14} /> My Requirements
      </button>
    );
  }

  return (
    <div style={{ width: 300, background: "#fff", borderRadius: 14, boxShadow: "0 4px 20px rgba(16,16,26,.18)", padding: "12px 14px 14px", pointerEvents: "auto", maxHeight: "min(60vh, 460px)", overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontFamily: "var(--font-jakarta)", fontWeight: 800, fontSize: "0.875rem", color: "#0D0D12" }}>My Requirements</span>
        <button onClick={onToggleOpen} aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", color: "#8A8A99" }}><X size={16} /></button>
      </div>

      {authed === null && <div style={{ fontSize: "0.75rem", color: "#A0A0AE" }}>Loading…</div>}

      {authed === false && (
        <div style={{ fontSize: "0.8125rem", color: "#5A5A66", lineHeight: 1.5 }}>
          Sign in to use your saved searches and watched corridors here.
          <a
            href={`/login?next=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname + window.location.search : "/explore")}`}
            className="uv-btn uv-btn-primary"
            style={{ marginTop: 12, fontSize: "0.75rem", display: "inline-flex" }}
          >
            <LogIn size={14} /> Sign in
          </a>
        </div>
      )}

      {authed && (
        <>
          {reports.length === 0 && watches.length === 0 && (
            <p style={{ fontSize: "0.75rem", color: "#A0A0AE", lineHeight: 1.5 }}>
              Nothing saved yet. Save a research report or watch a corridor, and it will show up here.
            </p>
          )}

          {reports.map((r) => (
            <button key={r.id} onClick={() => onApply({ maxPrice: r.budget })}
              style={rowBtn}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#F4F4F7")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}>
              <Pin size={13} style={{ color: "#B87A00", flexShrink: 0 }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#1A1A24", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.title}</span>
                <span style={{ display: "block", fontSize: "0.625rem", color: "#8A8A99" }}>Under ₹{r.budget}L · {r.city}</span>
              </span>
              <span style={{ fontSize: "0.625rem", color: "#B87A00", fontWeight: 700, flexShrink: 0 }}>APPLY</span>
            </button>
          ))}

          {watches.length > 0 && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #EFEFF3" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.625rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "#8A8A99", fontWeight: 700, marginBottom: 5 }}>
                <Star size={11} /> Watching
              </div>
              <div style={{ fontSize: "0.75rem", color: "#3A3A47" }}>{watches.map((w) => w.name).join(", ")}</div>
            </div>
          )}

          <button
            onClick={() => {
              // Hand the current filters to the existing research flow, which is
              // where saved searches are actually created.
              const p = new URLSearchParams();
              if (currentFilters.maxPrice != null) p.set("budget", String(currentFilters.maxPrice));
              window.open(`/research${p.toString() ? `?${p}` : ""}`, "_blank", "noopener");
            }}
            style={{ ...rowBtn, marginTop: 10, borderTop: "1px solid #EFEFF3", paddingTop: 12, color: "#B87A00", fontWeight: 700, fontSize: "0.75rem" }}
          >
            <Plus size={13} /> Save current filters as a requirement
          </button>
        </>
      )}
    </div>
  );
}

const pillBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", border: "none",
  borderRadius: 999, padding: "0 14px", height: 46, cursor: "pointer",
  boxShadow: "0 4px 20px rgba(16,16,26,.18)", fontSize: "0.8125rem", fontWeight: 600, color: "#2A2A35",
  pointerEvents: "auto", whiteSpace: "nowrap",
};

const rowBtn: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left",
  background: "none", border: "none", cursor: "pointer", padding: "7px 6px", borderRadius: 8,
};
