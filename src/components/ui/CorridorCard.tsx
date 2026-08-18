import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import HeatPill from "./HeatPill";
import TrendDelta from "./TrendDelta";
import InfoChip from "./InfoChip";
import { type HeatRating } from "./enums";
import { formatINRFull } from "@/lib/format";

/** Shape consumed from GET /api/market/corridors (a subset of its fields). */
export interface CorridorCardData {
  corridor: string;          // slug
  name: string;
  shortName?: string | null;
  direction?: string | null;
  zone?: string | null;
  district?: string | null;
  heatRating: HeatRating;
  overallScore?: number;
  plotPriceMinSqYd?: number | null;
  plotPriceMaxSqYd?: number | null;
  appreciationSince2020?: number | null;
  keyDrivers?: string[];
  bestFor?: string[];
  imageUrl?: string | null;
}

interface CorridorCardProps {
  corridor: CorridorCardData;
  className?: string;
}

/** Humanize an enum-ish token: NRI_INVESTOR → "NRI Investors". Leaves plain phrases alone. */
function humanize(s: string): string {
  if (!/[_A-Z]/.test(s) || s.includes(" ")) return s; // already a readable phrase
  return s
    .toLowerCase()
    .split("_")
    .map((w) => (w === "nri" ? "NRI" : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

/** Deterministic fallback photo when a corridor has no image (API doesn't supply one). */
function fallbackImage(c: CorridorCardData): string {
  const key = `${c.name} ${c.zone ?? ""} ${c.direction ?? ""}`.toLowerCase();
  if (/(kokapet|gachibowli|financial)/.test(key))
    return "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=900&q=80";
  if (/(airport|shamshabad|adibatla)/.test(key))
    return "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=900&q=80";
  // default: open plotted land (matches the land-first positioning)
  return "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=900&q=80";
}

/** The signature corridor heat card. Presentational + server-safe. */
export default function CorridorCard({ corridor: c, className = "" }: CorridorCardProps) {
  const img = c.imageUrl || fallbackImage(c);
  const min = c.plotPriceMinSqYd ?? null;
  const max = c.plotPriceMaxSqYd ?? null;
  const priceLabel =
    min != null && max != null
      ? `${formatINRFull(min)} – ${formatINRFull(max)} / sq.yd`
      : min != null
      ? `${formatINRFull(min)} / sq.yd`
      : "Price on request";
  const locationLine = [c.direction, c.district].filter(Boolean).join(" · ");
  const drivers = (c.keyDrivers ?? []).slice(0, 2);

  return (
    <Link
      href={`/market/${c.corridor}`}
      className={`uv-card uv-card-hover ${className}`}
      style={{ display: "flex", flexDirection: "column", overflow: "hidden", textDecoration: "none", color: "inherit", height: "100%" }}
    >
      {/* Image with scrim + heat/score overlays */}
      <div style={{ position: "relative", width: "100%", paddingTop: "56.25%", background: "var(--color-ink-soft)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img}
          alt={c.name}
          loading="lazy"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg, rgba(13,13,18,0.28) 0%, rgba(13,13,18,0) 38%, rgba(13,13,18,0.12) 100%)",
          }}
        />
        <div style={{ position: "absolute", top: 10, left: 10 }}>
          <HeatPill rating={c.heatRating} />
        </div>
        {c.overallScore != null && (
          <div
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              background: "rgba(13,13,18,0.72)",
              color: "#fff",
              padding: "4px 9px",
              borderRadius: 999,
              fontFamily: "var(--font-mono)",
              fontSize: "0.75rem",
              fontWeight: 600,
            }}
          >
            ⭐ {c.overallScore}/100
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: "1rem 1.15rem 0", display: "flex", flexDirection: "column", flex: 1 }}>
        <h3
          style={{
            fontFamily: "var(--font-jakarta)",
            fontWeight: 700,
            fontSize: "1.125rem",
            lineHeight: 1.3,
            color: "var(--color-text-hi)",
          }}
        >
          {c.name}
        </h3>
        {locationLine && (
          <div style={{ fontSize: "0.75rem", color: "var(--color-text-lo)", marginTop: 2 }}>{locationLine}</div>
        )}

        <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "0.9375rem", color: "var(--color-text-hi)" }}>
            {priceLabel}
          </span>
          {c.appreciationSince2020 != null && <TrendDelta value={c.appreciationSince2020} since="2020" size="sm" />}
        </div>

        {(c.zone || c.district) && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
            {c.zone && <InfoChip variant="navy">{c.zone}</InfoChip>}
            {c.district && <InfoChip variant="navy">{c.district}</InfoChip>}
          </div>
        )}

        {drivers.length > 0 && (
          <ul style={{ listStyle: "none", margin: "12px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
            {drivers.map((d, i) => (
              <li key={i} style={{ fontSize: "0.8125rem", color: "var(--color-text-mid)", lineHeight: 1.4, display: "flex", gap: 6 }}>
                <span style={{ color: "var(--color-saffron-deep)" }}>▸</span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: 14,
          padding: "12px 1.15rem",
          borderTop: "1px solid var(--color-line)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <span style={{ fontSize: "0.75rem", color: "var(--color-text-lo)" }}>
          {c.bestFor?.[0] ? `Best for ${humanize(c.bestFor[0])}` : "Investment corridor"}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-saffron-deep)" }}>
          Deep dive <ArrowRight size={14} />
        </span>
      </div>
    </Link>
  );
}
