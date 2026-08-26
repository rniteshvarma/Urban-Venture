"use client";

// Left list panel (Part 6). Two-way sync with the map is what makes it worth
// building: hovering a row highlights its dot and vice versa, and the list only
// shows what is currently in the viewport.
//
// Virtualised — 3,000 rows must never all be in the DOM.

import { useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { X, BadgeCheck } from "lucide-react";
import { formatLakh, formatINRFull } from "@/lib/format";
import type { PropertyFeature } from "@/lib/explore/use-map-data";

export type SortKey = "score" | "priceAsc" | "priceDesc" | "area" | "newest";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "score", label: "Score" },
  { key: "priceAsc", label: "Price ↑" },
  { key: "priceDesc", label: "Price ↓" },
  { key: "area", label: "Area" },
  { key: "newest", label: "Newest" },
];

const GRADE_ORDER: Record<string, number> = { A: 4, B: 3, C: 2, D: 1 };

export default function ListPanel({
  open, onClose, features, total, sort, onSort, hoveredId, onHover, onSelect, isMobile,
}: {
  open: boolean;
  onClose: () => void;
  features: PropertyFeature[];
  total: number;
  sort: SortKey;
  onSort: (s: SortKey) => void;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (f: PropertyFeature) => void;
  isMobile: boolean;
}) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => {
    const list = [...features];
    switch (sort) {
      case "priceAsc": return list.sort((a, b) => a.properties.priceLakh - b.properties.priceLakh);
      case "priceDesc": return list.sort((a, b) => b.properties.priceLakh - a.properties.priceLakh);
      case "area": return list.sort((a, b) => (b.properties.areaValue ?? 0) - (a.properties.areaValue ?? 0));
      // The viewport payload is already ordered verified-first then best-scoring;
      // "newest" keeps that server order rather than inventing a date we don't carry.
      case "newest": return list;
      default:
        return list.sort((a, b) =>
          (GRADE_ORDER[b.properties.scoreGrade ?? ""] ?? 0) - (GRADE_ORDER[a.properties.scoreGrade ?? ""] ?? 0));
    }
  }, [features, sort]);

  const virt = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 96,
    overscan: 8,
  });

  if (!open) return null;

  const shell: React.CSSProperties = isMobile
    ? { position: "absolute", inset: 0, borderRadius: 0 }
    : { position: "absolute", left: 0, top: 0, bottom: 0, width: 400 };

  return (
    <div style={{ ...shell, background: "#fff", zIndex: 38, display: "flex", flexDirection: "column", boxShadow: "0 4px 20px rgba(16,16,26,.22)", pointerEvents: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", borderBottom: "1px solid #EFEFF3", flexShrink: 0 }}>
        <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#0D0D12" }}>
          <span className="uv-mono">{total.toLocaleString("en-IN")}</span> {total === 1 ? "property" : "properties"}
        </span>
        <select value={sort} onChange={(e) => onSort(e.target.value as SortKey)}
          style={{ marginLeft: "auto", fontSize: "0.75rem", fontWeight: 600, border: "1px solid #E4E4EA", borderRadius: 8, padding: "4px 7px", background: "#fff", color: "#2A2A35", cursor: "pointer" }}>
          {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <button onClick={onClose} aria-label="Close list" style={{ background: "none", border: "none", cursor: "pointer", color: "#8A8A99" }}><X size={17} /></button>
      </div>

      {rows.length === 0 ? (
        <div style={{ padding: "2.5rem 1.25rem", textAlign: "center", color: "#8A8A99", fontSize: "0.875rem" }}>
          No properties in the current view.
        </div>
      ) : (
        <div ref={parentRef} style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ height: virt.getTotalSize(), position: "relative" }}>
            {virt.getVirtualItems().map((vi) => {
              const f = rows[vi.index];
              const p = f.properties;
              const active = hoveredId === p.id;
              return (
                <div
                  key={p.id}
                  onMouseEnter={() => onHover(p.id)}
                  onMouseLeave={() => onHover(null)}
                  onClick={() => onSelect(f)}
                  style={{
                    position: "absolute", top: 0, left: 0, width: "100%", height: vi.size,
                    transform: `translateY(${vi.start}px)`,
                    display: "flex", gap: 10, padding: "10px 14px", cursor: "pointer",
                    borderBottom: "1px solid #F4F4F7",
                    background: active ? "#FFF9E9" : "#fff",
                  }}
                >
                  <div style={{ width: 76, height: 74, borderRadius: 10, overflow: "hidden", flexShrink: 0, background: "#F0F0F4" }}>
                    {p.thumb ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={p.thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ display: "grid", placeItems: "center", height: "100%", fontSize: 10, color: "#B4B4C0" }}>No photo</div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ fontWeight: 700, fontSize: "0.8125rem", color: "#0D0D12" }}>
                        {p.areaValue ? `${p.areaValue} ${p.areaUnit === "acre" ? "acres" : "sq.yd"}` : p.name}
                      </span>
                      {p.isVerified && <BadgeCheck size={13} style={{ color: "#0F9D58", flexShrink: 0 }} />}
                    </div>
                    <div style={{ fontSize: "0.6875rem", color: "#8A8A99", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                    <div className="uv-mono" style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#0D0D12", marginTop: 4 }}>
                      {formatLakh(p.priceLakh)}
                      {p.rateValue && <span style={{ fontWeight: 400, color: "#8A8A99" }}> · {formatINRFull(p.rateValue)}/{p.rateUnit}</span>}
                    </div>
                    {p.scoreGrade && (
                      <span style={{ display: "inline-block", marginTop: 4, fontSize: "0.5625rem", fontWeight: 800, color: "#7A5200", background: "#FFF4D6", borderRadius: 999, padding: "1px 6px" }}>
                        {p.scoreGrade}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
