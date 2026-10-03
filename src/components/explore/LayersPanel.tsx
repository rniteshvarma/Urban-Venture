"use client";

// Top-right layers panel (§4.5) — the government infrastructure data as map
// overlays.
//
// Constraint 6: confirmed and unconfirmed infrastructure must never look alike.
// "Pending" is derived from each InfraProject's real status, so whichever arc
// is genuinely in land acquisition renders dashed and muted with a tooltip —
// rather than trusting a hardcoded name.
//
// A layer whose geometry has not been loaded is shown disabled with a reason,
// instead of a checkbox that silently draws nothing.

import { useEffect, useState } from "react";
import { Layers, X, Info } from "lucide-react";
import { INFRA_CATEGORY_COLORS, BASEMAPS, type BasemapId } from "@/lib/explore/layer-styles";
import { NEARBY_CATEGORIES, OSM_CATEGORIES, OSM_ATTRIBUTION, type OsmCategoryDef } from "@/lib/osm/categories";

export interface InfraLayer {
  id: string;
  name: string;
  shortName: string;
  category: string;
  status: string;
  confirmed: boolean;
  statusNote: string;
  hasGeometry: boolean;
  geometry: { type: "LineString" | "Point"; coordinates: number[] | number[][] } | null;
}

const CATEGORY_GROUPS: { label: string; categories: string[] }[] = [
  { label: "Roads & highways", categories: ["ROAD_HIGHWAY"] },
  { label: "Metro & rail", categories: ["METRO_RAIL"] },
  { label: "Industry & zones", categories: ["PHARMA_BIOTECH", "INDUSTRIAL_ZONE", "IT_TECH_PARK", "LOGISTICS_PARK", "AIRPORT_AVIATION"] },
  { label: "Townships & other", categories: ["TOWNSHIP", "GOVT_APPROVAL", "UTILITY"] },
];

export default function LayersPanel({
  open, onToggleOpen, enabled, onChange, basemap, onBasemap, showAdmin, showSeller, onShowAdmin, onShowSeller, nearby, onNearby,
}: {
  open: boolean;
  onToggleOpen: () => void;
  enabled: string[];
  onChange: (ids: string[]) => void;
  basemap: BasemapId;
  onBasemap: (b: BasemapId) => void;
  showAdmin: boolean;
  showSeller: boolean;
  onShowAdmin: (v: boolean) => void;
  onShowSeller: (v: boolean) => void;
  /** OpenStreetMap categories drawn as "Nearby" layers */
  nearby: string[];
  onNearby: (categories: string[]) => void;
}) {
  const [layers, setLayers] = useState<InfraLayer[] | null>(null);

  // Lazily load the catalogue the first time the panel opens.
  useEffect(() => {
    if (!open || layers) return;
    fetch("/api/explore/infrastructure")
      .then((r) => r.json())
      .then((d) => setLayers(d.layers ?? []))
      .catch(() => setLayers([]));
  }, [open, layers]);

  if (!open) {
    return (
      <button onClick={onToggleOpen} style={pillBtn} title="Layers">
        <Layers size={15} /> Layers
      </button>
    );
  }

  const toggle = (id: string) => onChange(enabled.includes(id) ? enabled.filter((x) => x !== id) : [...enabled, id]);

  return (
    <div style={{
      width: 288, background: "#fff", borderRadius: 14, boxShadow: "0 4px 20px rgba(16,16,26,.18)",
      maxHeight: "min(70vh, 560px)", display: "flex", flexDirection: "column", pointerEvents: "auto",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: "1px solid #EFEFF3" }}>
        <span style={{ fontFamily: "var(--font-jakarta)", fontWeight: 800, fontSize: "0.875rem", color: "#0D0D12" }}>Layers</span>
        <button onClick={onToggleOpen} aria-label="Close layers" style={{ background: "none", border: "none", cursor: "pointer", color: "#8A8A99" }}><X size={16} /></button>
      </div>

      <div style={{ overflowY: "auto", padding: "10px 14px 14px" }}>
        <SectionLabel>Properties</SectionLabel>
        <Row label="Our verified inventory" color="#2563EB" checked={showAdmin} onChange={() => onShowAdmin(!showAdmin)} />
        <Row label="Owner & agent listings" color="#FFB400" checked={showSeller} onChange={() => onShowSeller(!showSeller)} />

        <SectionLabel>Nearby places</SectionLabel>
        {NEARBY_CATEGORIES.map((c) => (
          <Row
            key={c}
            label={OSM_CATEGORIES[c].label}
            color={(OSM_CATEGORIES[c] as OsmCategoryDef).nearby!.color}
            dot
            checked={nearby.includes(c)}
            onChange={() => onNearby(nearby.includes(c) ? nearby.filter((x) => x !== c) : [...nearby, c])}
          />
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: 4 }}>
          <span style={{ fontSize: "0.625rem", color: "#A0A0AE", lineHeight: 1.4 }}>Shown when zoomed in · {OSM_ATTRIBUTION}</span>
          {nearby.length > 0 && (
            <button type="button" onClick={() => onNearby([])} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.6875rem", fontWeight: 700, color: "#7A5200", flexShrink: 0 }}>Clear</button>
          )}
        </div>

        <SectionLabel>Infrastructure</SectionLabel>
        {layers == null && <div style={{ fontSize: "0.75rem", color: "#A0A0AE", padding: "6px 0" }}>Loading…</div>}
        {layers?.length === 0 && <div style={{ fontSize: "0.75rem", color: "#A0A0AE", padding: "6px 0" }}>No infrastructure records.</div>}

        {layers && CATEGORY_GROUPS.map((g) => {
          const rows = layers.filter((l) => g.categories.includes(l.category));
          if (rows.length === 0) return null;
          return (
            <div key={g.label} style={{ marginTop: 6 }}>
              <div style={{ fontSize: "0.625rem", color: "#B4B4C0", fontWeight: 700, margin: "6px 0 2px" }}>{g.label}</div>
              {rows.map((l) => (
                <Row
                  key={l.id}
                  label={l.shortName || l.name}
                  color={INFRA_CATEGORY_COLORS[l.category] ?? "#94A3B8"}
                  dashed={!l.confirmed}
                  checked={enabled.includes(l.id)}
                  disabled={!l.hasGeometry}
                  disabledReason={!l.hasGeometry ? "No map geometry on file yet" : undefined}
                  note={l.statusNote}
                  onChange={() => toggle(l.id)}
                />
              ))}
            </div>
          );
        })}

        {layers && layers.length > 0 && layers.every((l) => !l.hasGeometry) && (
          <p style={{ fontSize: "0.625rem", color: "#B87A00", background: "#FDF3DC", borderRadius: 8, padding: "7px 9px", marginTop: 8, lineHeight: 1.45 }}>
            These records exist but have no coordinates or route geometry stored, so nothing can be drawn yet.
          </p>
        )}

        <SectionLabel>Basemap</SectionLabel>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {(Object.keys(BASEMAPS) as BasemapId[]).map((b) => (
            <button key={b} onClick={() => onBasemap(b)} style={{
              borderRadius: 999, padding: "5px 11px", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer",
              border: basemap === b ? "1px solid #FFB400" : "1px solid #E4E4EA",
              background: basemap === b ? "#FFF4D6" : "#fff",
              color: basemap === b ? "#7A5200" : "#3A3A47",
            }}>{BASEMAPS[b].label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

const pillBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", border: "none",
  borderRadius: 999, padding: "0 14px", height: 46, cursor: "pointer",
  boxShadow: "0 4px 20px rgba(16,16,26,.18)", fontSize: "0.8125rem", fontWeight: 600, color: "#2A2A35",
  pointerEvents: "auto",
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: "0.625rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "#8A8A99", fontWeight: 700, margin: "12px 0 6px" }}>{children}</div>;
}

function Row({ label, color, checked, onChange, dashed, disabled, disabledReason, note, dot }: {
  label: string; color: string; checked: boolean; onChange: () => void;
  dashed?: boolean; disabled?: boolean; disabledReason?: string; note?: string;
  /** point layers: a round swatch instead of a line */
  dot?: boolean;
}) {
  return (
    <label
      title={disabled ? disabledReason : note}
      style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.45 : 1 }}
    >
      <input type="checkbox" checked={checked && !disabled} disabled={disabled} onChange={onChange} style={{ accentColor: "#FFB400", cursor: disabled ? "not-allowed" : "pointer" }} />
      {/* Swatch mirrors how the layer actually draws: a dot, or a solid / dashed line. */}
      {dot ? (
        <span style={{ width: 10, height: 10, borderRadius: 999, background: color, border: "1.5px solid #fff", boxShadow: "0 0 0 1px #E4E4EA", margin: "0 3px", flexShrink: 0 }} />
      ) : (
        <span style={{ width: 16, height: 0, borderTop: `3px ${dashed ? "dashed" : "solid"} ${color}`, opacity: dashed ? 0.6 : 1, flexShrink: 0 }} />
      )}
      <span style={{ flex: 1, fontSize: "0.75rem", color: "#2A2A35", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
      {dashed && <span title={note} style={{ fontSize: "0.5625rem", color: "#B87A00", fontWeight: 700, flexShrink: 0 }}>PENDING</span>}
      {(note || disabledReason) && <Info size={11} style={{ color: "#C4C4CE", flexShrink: 0 }} />}
    </label>
  );
}
