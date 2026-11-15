"use client";

import Link from "next/link";
import React, { useState } from "react";
import { BadgeCheck, Building2, Home, LandPlot, Trees, Clock } from "lucide-react";
import { formatLakhRange } from "@/lib/format";
import type { HomeCard } from "@/lib/home/v3-data";

const short = (min: number, max: number) => formatLakhRange(min, max).replace(/ Lakh\b/g, " L");
const ICON: Record<string, typeof Home> = { Apartment: Building2, Villa: Home, Plots: LandPlot, Land: Trees };
const GRADE: Record<string, { bg: string; fg: string }> = {
  A: { bg: "var(--v3-green)", fg: "#fff" },
  B: { bg: "var(--v3-accent)", fg: "var(--v3-ink)" },
  C: { bg: "var(--v3-amber-wash)", fg: "#8a5a00" },
  D: { bg: "var(--v3-red-wash)", fg: "var(--v3-red)" },
};

/** No clean photo: a calm, fact-led tile instead of a stock image. */
function Placeholder({ c }: { c: HomeCard }) {
  const Icon = ICON[c.propertyType] ?? Building2;
  const land = c.listingKind === "LAND_LISTING";
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: 14, color: land ? "#1f3b2c" : "#4a3300",
      background: land
        ? "radial-gradient(120% 90% at 100% 0%, #d8eedc 0%, #eef7ef 45%, #f7fbf5 100%)"
        : "radial-gradient(120% 90% at 100% 0%, #ffe39a 0%, #fff3cf 45%, #fffaf0 100%)" }}>
      <Icon size={84} strokeWidth={1.1} style={{ position: "absolute", right: 12, top: 10, opacity: 0.22 }} />
      <div style={{ fontSize: "0.6875rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.7 }}>{land ? "Land · " : ""}{c.locality}</div>
      <div className="v3-display" style={{ fontWeight: 800, fontSize: "1.375rem", lineHeight: 1.1 }}>{short(c.minLakh, c.maxLakh)}</div>
    </div>
  );
}

export default function ListingTile({ c, width = 290 }: { c: HomeCard; width?: number | string }) {
  const [broken, setBroken] = useState(false);
  const img = broken ? null : c.image;
  const land = c.listingKind === "LAND_LISTING";
  const g = c.grade ? GRADE[c.grade] : null;
  return (
    <Link href={`/projects/${c.id}`} className="v3-card v3-lift" style={{ width, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ position: "relative", paddingTop: "62%", background: "var(--v3-sand)" }}>
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt="" loading="lazy" onError={() => setBroken(true)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <Placeholder c={c} />
        )}
        <div style={{ position: "absolute", top: 10, left: 10, display: "flex", gap: 6 }}>
          {land ? (
            <span className="v3-chip v3-chip-amber" style={{ boxShadow: "0 1px 4px rgba(0,0,0,.12)" }}>Land listing · not RERA</span>
          ) : c.rera ? (
            <span className="v3-chip" style={{ background: "#fff", color: "var(--v3-green)", boxShadow: "0 1px 4px rgba(0,0,0,.12)" }}><BadgeCheck size={13} aria-hidden /> RERA</span>
          ) : null}
        </div>
        {g && (
          <span title="Property Tiger rating: legal, builder, location, delivery, planning and price" style={{ position: "absolute", top: 10, right: 10, background: g.bg, color: g.fg, borderRadius: 999, padding: "4px 10px", fontSize: "0.75rem", fontWeight: 800, boxShadow: "0 1px 4px rgba(0,0,0,.15)" }}>
            {c.grade} · {c.score}
          </span>
        )}
      </div>
      <div style={{ padding: "14px 14px 12px", display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
        <div className="v3-display" style={{ fontWeight: 800, fontSize: "1.0625rem", lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={c.name}>{c.name}</div>
        <div style={{ fontSize: "0.8125rem", color: "var(--v3-lo)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {land ? c.locality : `${c.developer} · ${c.locality}`}
        </div>
        <div className="v3-display" style={{ fontWeight: 800, fontSize: "1.25rem", marginTop: 6 }}>{short(c.minLakh, c.maxLakh)}</div>
        <div style={{ fontSize: "0.8125rem", color: "var(--v3-mid)", display: "flex", flexWrap: "wrap", gap: "2px 10px" }}>
          {c.configs && <span>{c.configs}</span>}
          {!c.configs && <span>{land ? "Farm land" : c.propertyType === "Plots" ? "Open plots" : c.propertyType}</span>}
          {c.possession && !land && <span>· {c.possession}</span>}
        </div>
        {c.checked && (
          <div style={{ marginTop: "auto", paddingTop: 10, fontSize: "0.6875rem", color: "var(--v3-lo)", display: "flex", alignItems: "center", gap: 5 }}>
            <Clock size={12} aria-hidden /> {c.checked}
          </div>
        )}
      </div>
    </Link>
  );
}
