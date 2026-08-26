"use client";

// Left drawer on desktop, bottom sheet on mobile (§4.3).
// The result count updates live as filters change, BEFORE Apply — one
// count-only request against /api/explore/count, debounced 300ms.

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { ExploreFilterState } from "@/lib/explore/use-url-state";
import { DEFAULT_FILTERS, filtersToParams } from "@/lib/explore/use-url-state";
import type { Bounds } from "@/lib/explore/use-map-data";

const TYPES = [
  { key: "RESIDENTIAL_PLOT", label: "Plots" },
  { key: "AGRICULTURAL_LAND", label: "Agricultural" },
  { key: "VILLA", label: "Villas" },
  { key: "COMMERCIAL", label: "Commercial" },
  { key: "APARTMENT", label: "Apartments" },
];
const APPROVALS = [
  { key: "HMDA_APPROVED", label: "HMDA" },
  { key: "DTCP_APPROVED", label: "DTCP" },
  { key: "PANCHAYAT", label: "Panchayat" },
  { key: "UNAPPROVED", label: "Unapproved" },
];
const GRADES = ["A", "B", "C", "D"];
const POSTED = [
  { key: null, label: "Any time" },
  { key: 7, label: "Last 7 days" },
  { key: 30, label: "Last 30 days" },
  { key: 90, label: "Last 90 days" },
];

export default function FiltersPanel({
  open, filters, bounds, onApply, onClose, isMobile,
}: {
  open: boolean;
  filters: ExploreFilterState;
  bounds: Bounds | null;
  onApply: (f: ExploreFilterState) => void;
  onClose: () => void;
  isMobile: boolean;
}) {
  const [draft, setDraft] = useState<ExploreFilterState>(filters);
  const [count, setCount] = useState<number | null>(null);
  const [counting, setCounting] = useState(false);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => { if (open) setDraft(filters); }, [open, filters]);

  // Live count — debounced, count-only, scoped to the current viewport so the
  // number matches what the user would actually see.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      abort.current?.abort();
      const ctrl = new AbortController();
      abort.current = ctrl;
      setCounting(true);
      try {
        const p = filtersToParams(draft);
        if (bounds) p.set("bbox", `${bounds.minLng},${bounds.minLat},${bounds.maxLng},${bounds.maxLat}`);
        const r = await fetch(`/api/explore/count?${p}`, { signal: ctrl.signal });
        const d = await r.json();
        setCount(d.count ?? 0);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setCount(null);
      } finally { setCounting(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [draft, open, bounds]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;

  const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const shell: React.CSSProperties = isMobile
    ? { position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "78vh", borderRadius: "20px 20px 0 0" }
    : { position: "absolute", left: 0, top: 0, bottom: 0, width: 360, borderRadius: 0 };

  return (
    <>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(10,10,16,.35)", zIndex: 40, pointerEvents: "auto" }} />
      <div style={{ ...shell, background: "#fff", zIndex: 41, display: "flex", flexDirection: "column", boxShadow: "0 4px 20px rgba(16,16,26,.28)", pointerEvents: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderBottom: "1px solid #EFEFF3" }}>
          <h3 style={{ fontFamily: "var(--font-jakarta)", fontWeight: 800, fontSize: "1rem", color: "#0D0D12" }}>Filters</h3>
          <button onClick={onClose} aria-label="Close filters" style={{ background: "none", border: "none", cursor: "pointer", color: "#8A8A99" }}><X size={18} /></button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 20 }}>
          <Group label="Property type">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {TYPES.map((t) => (
                <Pill key={t.key} on={draft.types.includes(t.key)} onClick={() => setDraft({ ...draft, types: toggle(draft.types, t.key) })}>{t.label}</Pill>
              ))}
            </div>
          </Group>

          <Group label="Budget (₹ Lakh)">
            <Range
              min={draft.minPrice} max={draft.maxPrice}
              onMin={(v) => setDraft({ ...draft, minPrice: v })}
              onMax={(v) => setDraft({ ...draft, maxPrice: v })}
              minPlaceholder="Any" maxPlaceholder="Any"
            />
          </Group>

          <Group label="Area (sq.yd)">
            <Range
              min={draft.minArea} max={draft.maxArea}
              onMin={(v) => setDraft({ ...draft, minArea: v })}
              onMax={(v) => setDraft({ ...draft, maxArea: v })}
              minPlaceholder="Any" maxPlaceholder="Any"
            />
            <p style={{ fontSize: "0.625rem", color: "#A0A0AE", marginTop: 5 }}>1 acre = 4,840 sq.yd</p>
          </Group>

          <Group label="Listed by">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {([["ALL", "All"], ["ADMIN", "Our verified inventory"], ["SELLER", "Owners & agents"]] as const).map(([k, label]) => (
                <Pill key={k} on={draft.source === k} onClick={() => setDraft({ ...draft, source: k })}>{label}</Pill>
              ))}
            </div>
          </Group>

          <Group label="Approval">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {APPROVALS.map((a) => (
                <Pill key={a.key} on={draft.approvals.includes(a.key)} onClick={() => setDraft({ ...draft, approvals: toggle(draft.approvals, a.key) })}>{a.label}</Pill>
              ))}
            </div>
          </Group>

          <Group label="Listing grade">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {GRADES.map((g) => (
                <Pill key={g} on={draft.grades.includes(g)} onClick={() => setDraft({ ...draft, grades: toggle(draft.grades, g) })}>{g}</Pill>
              ))}
            </div>
            <p style={{ fontSize: "0.625rem", color: "#A0A0AE", marginTop: 5 }}>Verified inventory is unscored and always shown.</p>
          </Group>

          <Group label="Posted within">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {POSTED.map((p) => (
                <Pill key={String(p.key)} on={draft.postedWithin === p.key} onClick={() => setDraft({ ...draft, postedWithin: p.key })}>{p.label}</Pill>
              ))}
            </div>
          </Group>
        </div>

        <div style={{ borderTop: "1px solid #EFEFF3", padding: "12px 18px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ flex: 1, fontSize: "0.8125rem", color: "#3A3A47" }}>
            {counting ? "Counting…" : count == null ? "—" : <>Showing <b className="uv-mono">{count.toLocaleString("en-IN")}</b> {count === 1 ? "property" : "properties"}</>}
          </span>
          <button onClick={() => setDraft(DEFAULT_FILTERS)} className="uv-btn uv-btn-ghost" style={{ fontSize: "0.8125rem" }}>Reset</button>
          <button onClick={() => { onApply(draft); onClose(); }} className="uv-btn uv-btn-primary" style={{ fontSize: "0.8125rem" }}>Apply</button>
        </div>
      </div>
    </>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "#8A8A99", fontWeight: 700, marginBottom: 8 }}>{label}</div>
      {children}
    </div>
  );
}

function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      borderRadius: 999, padding: "6px 12px", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer",
      border: on ? "1px solid #FFB400" : "1px solid #E4E4EA",
      background: on ? "#FFF4D6" : "#fff",
      color: on ? "#7A5200" : "#3A3A47",
    }}>{children}</button>
  );
}

function Range({ min, max, onMin, onMax, minPlaceholder, maxPlaceholder }: {
  min: number | null; max: number | null;
  onMin: (v: number | null) => void; onMax: (v: number | null) => void;
  minPlaceholder: string; maxPlaceholder: string;
}) {
  const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: 9, border: "1px solid #E4E4EA", fontSize: "0.8125rem", color: "#1A1A24" };
  const parse = (v: string) => (v === "" ? null : Number.isFinite(Number(v)) ? Number(v) : null);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <input type="number" value={min ?? ""} placeholder={minPlaceholder} onChange={(e) => onMin(parse(e.target.value))} style={inp} />
      <span style={{ color: "#A0A0AE", fontSize: "0.8125rem" }}>–</span>
      <input type="number" value={max ?? ""} placeholder={maxPlaceholder} onChange={(e) => onMax(parse(e.target.value))} style={inp} />
    </div>
  );
}
