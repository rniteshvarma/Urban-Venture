"use client";

// Left list panel (Part 6). Two-way sync with the map is what makes it worth
// building: hovering a card highlights its home on the map and vice versa, and
// the list only shows what is currently in the viewport (the map sits beside
// the panel, so nothing in the list is hidden under it).
//
// Two columns of photo cards on desktop, one on mobile. Virtualised by row —
// 3,000 cards must never all be in the DOM.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { X, BadgeCheck, ShieldCheck } from "lucide-react";
import { formatLakh, formatLakhRange, formatINRFull } from "@/lib/format";
import type { PropertyFeature } from "@/lib/explore/use-map-data";
import { accessTone } from "@/components/accessibility/AccessibilityPanel";

export type SortKey = "score" | "priceAsc" | "priceDesc" | "area" | "newest";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "score", label: "Score" },
  { key: "priceAsc", label: "Price ↑" },
  { key: "priceDesc", label: "Price ↓" },
  { key: "area", label: "Area" },
  { key: "newest", label: "Newest" },
];

const GRADE_ORDER: Record<string, number> = { A: 4, B: 3, C: 2, D: 1 };

/** Desktop panel width — the map is laid out to the right of it. */
export const LIST_PANEL_WIDTH = "min(640px, 46vw)";

const TYPE_LABEL: Record<string, string> = {
  RESIDENTIAL_PLOT: "Plot",
  AGRICULTURAL_LAND: "Agricultural land",
  VILLA: "Villa",
  COMMERCIAL: "Commercial",
  APARTMENT: "Apartment",
};

const PHOTO_H = 150;
const CARD_H = 292;
const GAP = 14;

export default function ListPanel({
  open, onClose, features, total, sort, onSort, hoveredId, selectedId, onHover, onSelect, isMobile,
}: {
  open: boolean;
  onClose: () => void;
  features: PropertyFeature[];
  total: number;
  sort: SortKey;
  onSort: (s: SortKey) => void;
  hoveredId: string | null;
  selectedId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (f: PropertyFeature) => void;
  isMobile: boolean;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  // Two columns once the panel is wide enough for the price and facts lines to
  // fit; a narrow window gets one column of full-width cards instead.
  const [panelWidth, setPanelWidth] = useState(0);
  const [listEl, setListEl] = useState<HTMLDivElement | null>(null);
  const scrollRef = useCallback((el: HTMLDivElement | null) => {
    parentRef.current = el;
    setListEl(el);
  }, []);
  useEffect(() => {
    if (!listEl) return;
    const ro = new ResizeObserver(([e]) => setPanelWidth(e.contentRect.width));
    ro.observe(listEl);
    return () => ro.disconnect();
  }, [listEl]);
  const cols = !isMobile && panelWidth >= 540 ? 2 : 1;

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

  const lineCount = Math.ceil(rows.length / cols);
  const virt = useVirtualizer({
    count: lineCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => CARD_H + GAP,
    overscan: 4,
  });

  if (!open) return null;

  const shell: React.CSSProperties = isMobile
    ? { position: "absolute", inset: 0, borderRadius: 0 }
    : { position: "absolute", left: 0, top: 0, bottom: 0, width: LIST_PANEL_WIDTH };

  return (
    <div style={{ ...shell, background: "#F7F7F9", zIndex: 38, display: "flex", flexDirection: "column", boxShadow: "0 4px 20px rgba(16,16,26,.22)", pointerEvents: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 16px", background: "#fff", borderBottom: "1px solid #EFEFF3", flexShrink: 0 }}>
        <span style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#0D0D12" }}>
          <span className="uv-mono">{total.toLocaleString("en-IN")}</span> {total === 1 ? "property" : "properties"}
          <span style={{ fontWeight: 400, color: "#8A8A99", fontSize: "0.8125rem" }}> in this view</span>
        </span>
        <select value={sort} onChange={(e) => onSort(e.target.value as SortKey)} aria-label="Sort properties"
          style={{ marginLeft: "auto", fontSize: "0.75rem", fontWeight: 600, border: "1px solid #E4E4EA", borderRadius: 8, padding: "4px 24px 4px 8px", backgroundColor: "#fff", color: "#2A2A35", cursor: "pointer" }}>
          {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <button onClick={onClose} aria-label="Close list" style={{ background: "none", border: "none", cursor: "pointer", color: "#8A8A99" }}><X size={17} /></button>
      </div>

      {rows.length === 0 ? (
        <div style={{ padding: "2.5rem 1.25rem", textAlign: "center", color: "#8A8A99", fontSize: "0.875rem" }}>
          No properties in the current view.
        </div>
      ) : (
        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: `${GAP}px ${GAP}px 0` }}>
          <div style={{ height: virt.getTotalSize(), position: "relative" }}>
            {virt.getVirtualItems().map((vi) => (
              <div
                key={vi.key}
                style={{
                  position: "absolute", top: 0, left: 0, width: "100%", height: CARD_H,
                  transform: `translateY(${vi.start}px)`,
                  display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: GAP,
                }}
              >
                {rows.slice(vi.index * cols, vi.index * cols + cols).map((f) => (
                  <PropertyCard
                    key={f.properties.id}
                    f={f}
                    hovered={hoveredId === f.properties.id}
                    selected={selectedId === f.properties.id}
                    onHover={onHover}
                    onSelect={onSelect}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PropertyCard({ f, hovered, selected, onHover, onSelect }: {
  f: PropertyFeature;
  hovered: boolean;
  selected: boolean;
  onHover: (id: string | null) => void;
  onSelect: (f: PropertyFeature) => void;
}) {
  const p = f.properties;
  const price = p.priceMaxLakh && p.priceMaxLakh > p.priceLakh ? formatLakhRange(p.priceLakh, p.priceMaxLakh) : `${p.priceFrom ? "from " : ""}${formatLakh(p.priceLakh)}`;
  const facts = [p.bhk, p.size, TYPE_LABEL[p.propertyType]].filter(Boolean).join("  |  ");
  const meta = [p.developer, p.possession].filter(Boolean).join(" · ");

  return (
    <div
      role="button"
      tabIndex={0}
      onMouseEnter={() => onHover(p.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(p.id)}
      onBlur={() => onHover(null)}
      onClick={() => onSelect(f)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(f); } }}
      style={{
        height: CARD_H, display: "flex", flexDirection: "column", overflow: "hidden", cursor: "pointer",
        background: "#fff", borderRadius: 14, outline: "none",
        border: selected ? "2px solid #0D0D12" : hovered ? "2px solid #FFB400" : "2px solid transparent",
        boxShadow: hovered || selected ? "0 6px 18px rgba(16,16,26,.14)" : "0 1px 3px rgba(16,16,26,.08)",
        transition: "box-shadow .15s, border-color .15s",
      }}
    >
      <div style={{ position: "relative", height: PHOTO_H, flexShrink: 0, background: "#F0F0F4" }}>
        {p.thumb ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={p.thumb} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <div style={{ display: "grid", placeItems: "center", height: "100%", fontSize: 11, color: "#B4B4C0" }}>No photo</div>
        )}
        <div style={{ position: "absolute", top: 8, left: 8, right: 8, display: "flex", gap: 6, justifyContent: "space-between" }}>
          {p.scoreGrade ? (
            <span style={{ fontSize: "0.6875rem", fontWeight: 800, color: "#7A5200", background: "#FFF4D6", borderRadius: 999, padding: "3px 9px" }}>
              Rating {p.scoreGrade}
            </span>
          ) : <span />}
          {p.isVerified && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.6875rem", fontWeight: 700, color: "#0B7A43", background: "#fff", borderRadius: 999, padding: "3px 9px" }}>
              <BadgeCheck size={12} /> Verified
            </span>
          )}
        </div>
      </div>

      <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
        <div className="uv-mono" style={{ fontSize: "1.0625rem", fontWeight: 800, color: "#0D0D12", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {price}
        </div>
        {facts && (
          <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#2A2A35", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{facts}</div>
        )}
        <div style={{ fontSize: "0.8125rem", color: "#2A2A35", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          <span style={{ fontWeight: 700 }}>{p.name}</span>
          {p.locality && <span style={{ color: "#6B6B78" }}> · {p.locality}</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.6875rem", color: "#8A8A99", minWidth: 0 }}>
          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{meta || (p.rateValue ? `${formatINRFull(p.rateValue)}/${p.rateUnit}` : "")}</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, marginLeft: "auto", flexShrink: 0 }}>
            {p.access != null && (
              <span title="Accessibility: how well connected and well served this location is (separate from the rating)"
                style={{ fontWeight: 700, color: accessTone(p.access).fg, background: accessTone(p.access).bg, borderRadius: 999, padding: "1px 7px" }}>
                Access {p.access}
              </span>
            )}
            {p.rera && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "#0B7A43", fontWeight: 700 }}>
                <ShieldCheck size={12} /> RERA
              </span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
