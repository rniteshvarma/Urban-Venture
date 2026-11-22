"use client";

// Active filters as removable pills, plus always-visible quick toggles (§4.2).

import { X } from "lucide-react";
import type { ExploreFilterState } from "@/lib/explore/use-url-state";
import { DEFAULT_FILTERS } from "@/lib/explore/use-url-state";
import { X as T, glass } from "./theme";

const TYPE_LABELS: Record<string, string> = {
  RESIDENTIAL_PLOT: "Plots",
  AGRICULTURAL_LAND: "Agricultural",
  VILLA: "Villas",
  COMMERCIAL: "Commercial",
  APARTMENT: "Apartments",
};

const lakh = (n: number) => (n >= 100 ? `₹${(n / 100).toFixed(1)}Cr` : `₹${n}L`);

interface Chip { key: string; label: string; clear: (f: ExploreFilterState) => ExploreFilterState }

function activeChips(f: ExploreFilterState): Chip[] {
  const out: Chip[] = [];

  for (const t of f.types) {
    out.push({
      key: `type-${t}`,
      label: TYPE_LABELS[t] ?? t,
      clear: (s) => ({ ...s, types: s.types.filter((x) => x !== t) }),
    });
  }

  if (f.minPrice != null || f.maxPrice != null) {
    out.push({
      key: "price",
      label: `${f.minPrice != null ? lakh(f.minPrice) : "Any"} – ${f.maxPrice != null ? lakh(f.maxPrice) : "Any"}`,
      clear: (s) => ({ ...s, minPrice: null, maxPrice: null }),
    });
  }

  if (f.minArea != null || f.maxArea != null) {
    out.push({
      key: "area",
      label: `${f.minArea ?? 0}–${f.maxArea ?? "∞"} sq.yd`,
      clear: (s) => ({ ...s, minArea: null, maxArea: null }),
    });
  }

  for (const a of f.approvals) {
    out.push({
      key: `approval-${a}`,
      label: a.replace(/_/g, " ").replace(/\bapproved\b/i, "approved"),
      clear: (s) => ({ ...s, approvals: s.approvals.filter((x) => x !== a) }),
    });
  }

  for (const g of f.grades) {
    out.push({ key: `grade-${g}`, label: `Grade ${g}`, clear: (s) => ({ ...s, grades: s.grades.filter((x) => x !== g) }) });
  }

  if (f.source !== "ALL") {
    out.push({
      key: "source",
      label: f.source === "ADMIN" ? "Listings we researched" : "Owner listed",
      clear: (s) => ({ ...s, source: "ALL" }),
    });
  }

  if (f.verifiedOnly) out.push({ key: "verified", label: "Verified only", clear: (s) => ({ ...s, verifiedOnly: false }) });
  if (f.postedWithin != null) {
    out.push({ key: "posted", label: `Last ${f.postedWithin} days`, clear: (s) => ({ ...s, postedWithin: null }) });
  }

  return out;
}

export function hasActiveFilters(f: ExploreFilterState): boolean {
  return activeChips(f).length > 0;
}

export default function FilterChips({ filters, onChange }: { filters: ExploreFilterState; onChange: (f: ExploreFilterState) => void }) {
  const chips = activeChips(filters);

  // Quick toggles stay visible while inactive so they're discoverable.
  const quick = [
    { key: "owner", label: "Owner listed", on: filters.source === "SELLER", toggle: () => onChange({ ...filters, source: filters.source === "SELLER" ? "ALL" : "SELLER" }) },
    { key: "verified", label: "Verified only", on: filters.verifiedOnly, toggle: () => onChange({ ...filters, verifiedOnly: !filters.verifiedOnly }) },
    { key: "recent", label: "Last 30 days", on: filters.postedWithin === 30, toggle: () => onChange({ ...filters, postedWithin: filters.postedWithin === 30 ? null : 30 }) },
  ];

  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", pointerEvents: "auto" }}>
      {chips.map((c) => (
        <span key={c.key} style={{
          display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(40,32,12,.92)",
          color: T.saffronText, border: `1px solid ${T.saffronLine}`, borderRadius: 999,
          padding: "5px 9px 5px 12px", fontSize: "0.75rem", fontWeight: 600,
          boxShadow: T.shadow, backdropFilter: T.blur,
        }}>
          {c.label}
          <button onClick={() => onChange(c.clear(filters))} aria-label={`Remove ${c.label}`}
            style={{ background: "none", border: "none", cursor: "pointer", color: T.saffronText, display: "grid", placeItems: "center", padding: 0 }}>
            <X size={12} />
          </button>
        </span>
      ))}

      {chips.length > 0 && (
        <button onClick={() => onChange(DEFAULT_FILTERS)}
          style={{ ...quickChip, color: T.textLo }}>
          Clear all
        </button>
      )}

      {quick.filter((qk) => !qk.on).map((qk) => (
        <button key={qk.key} onClick={qk.toggle}
          style={quickChip}>
          {qk.label}
        </button>
      ))}
    </div>
  );
}

const quickChip: React.CSSProperties = {
  ...glass, borderRadius: 999, padding: "6px 13px", fontSize: "0.75rem", fontWeight: 600, color: T.textMid, cursor: "pointer",
};
