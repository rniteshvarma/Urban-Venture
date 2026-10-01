"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MapPin, Phone, Building2 } from "lucide-react";
import SaveHeart from "./SaveHeart";
import VerifiedBadge from "./VerifiedBadge";
import InfoChip from "./InfoChip";
import { RISK, type RiskLevel } from "./enums";
import { formatLakhRange, formatEMI, lakhToRupees } from "@/lib/format";

/** Shape consumed from GET /api/projects. */
export interface ProjectCardData {
  id: string;
  name: string;
  developer: string;
  corridor: string;
  city: string;
  minBudgetLakhs: number;
  maxBudgetLakhs: number;
  minHorizonYears: number;
  maxHorizonYears: number;
  riskLevel: RiskLevel;
  propertyType: string;
  infraHighlights: string[];
  imageUrls: string[];
  status: "ACTIVE" | "SOLD_OUT" | "UPCOMING" | "ARCHIVED";
  /** researched inventory extras (optional — older rows lack them) */
  locality?: string | null;
  reraNumber?: string | null;
  possessionText?: string | null;
  inventoryGrade?: "A" | "B" | "C" | "D" | null;
  inventoryScore?: number | null;
}

interface ProjectCardProps {
  project: ProjectCardData;
  variant?: "grid" | "carousel" | "list";
  className?: string;
}

/** Shown when a project has no clean image (or the hotlinked one fails) — never a stock photo. */
function ImagePlaceholder({ p }: { p: ProjectCardData }) {
  return (
    <div
      style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
        background: "linear-gradient(135deg, var(--color-ink) 0%, var(--color-ink-soft) 100%)", color: "rgba(255,255,255,0.85)", textAlign: "center", padding: 16,
      }}
    >
      <Building2 size={30} style={{ color: "var(--color-saffron)" }} />
      <div style={{ fontFamily: "var(--font-jakarta)", fontWeight: 700, fontSize: "0.95rem", lineHeight: 1.25 }}>{p.name}</div>
      <div style={{ fontSize: "0.6875rem", color: "rgba(255,255,255,0.55)" }}>{p.propertyType} · images on request</div>
    </div>
  );
}

/** v2 project card. Grid & carousel share the vertical layout; list is a horizontal row. */
const GRADE_TONE: Record<string, { bg: string; fg: string }> = {
  A: { bg: "var(--color-growth)", fg: "#fff" },
  B: { bg: "var(--color-saffron)", fg: "var(--color-ink)" },
  C: { bg: "var(--color-caution-wash)", fg: "#9A6A1E" },
  D: { bg: "var(--color-alert-wash)", fg: "var(--color-alert)" },
};

/** Property Tiger rating pill for researched inventory. */
function GradePill({ grade, score }: { grade: string; score?: number | null }) {
  const t = GRADE_TONE[grade] ?? GRADE_TONE.C;
  return (
    <span
      title="Property Tiger rating — legal, developer, location, delivery, planning and price"
      style={{ background: t.bg, color: t.fg, padding: "3px 9px", borderRadius: 999, fontSize: "0.6875rem", fontWeight: 800, letterSpacing: "0.03em", boxShadow: "0 1px 4px rgba(0,0,0,0.25)" }}
    >
      {grade}{score != null ? ` · ${score}` : ""}
    </span>
  );
}

export default function ProjectCard({ project: p, variant = "grid", className = "" }: ProjectCardProps) {
  const [broken, setBroken] = useState(false);
  const img = broken ? null : p.imageUrls?.[0] || null;
  const risk = RISK[p.riskLevel];
  const emi = formatEMI(lakhToRupees(p.minBudgetLakhs));
  const place = p.locality ? `${p.locality}, ${p.city}` : `${p.corridor} · ${p.city}`;
  const hasRera = !!p.reraNumber;

  const chips = (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      <InfoChip variant="navy">{p.propertyType}</InfoChip>
      <span
        className="uv-chip"
        style={{ background: risk.bg, color: risk.fg }}
      >
        {risk.label}
      </span>
      <InfoChip variant="ghost">
        {p.possessionText ?? `${p.minHorizonYears}–${p.maxHorizonYears} yr hold`}
      </InfoChip>
    </div>
  );

  if (variant === "list") {
    return (
      <div className={`uv-card uv-card-hover ${className}`} style={{ display: "flex", overflow: "hidden" }}>
        <div style={{ position: "relative", width: 160, flexShrink: 0, background: "var(--color-ink-soft)" }}>
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt={p.name} loading="lazy" onError={() => setBroken(true)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <ImagePlaceholder p={p} />
          )}
          {hasRera && (
            <div style={{ position: "absolute", bottom: 8, left: 8 }}>
              <VerifiedBadge type="RERA" />
            </div>
          )}
        </div>
        <div style={{ padding: "0.9rem 1.1rem", flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <div>
              <h3 style={{ fontFamily: "var(--font-jakarta)", fontWeight: 700, fontSize: "1rem", color: "var(--color-text-hi)" }}>{p.name}</h3>
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-lo)" }}>by {p.developer}</div>
            </div>
            <SaveHeart projectId={p.id} theme="dark" />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.75rem", color: "var(--color-text-mid)" }}>
            <MapPin size={13} /> {place}
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "1.05rem", color: "var(--color-text-hi)" }}>
            {formatLakhRange(p.minBudgetLakhs, p.maxBudgetLakhs)}
          </div>
          {chips}
        </div>
      </div>
    );
  }

  const width = variant === "carousel" ? { minWidth: 288, width: 288, flexShrink: 0, scrollSnapAlign: "start" as const } : {};

  return (
    <div className={`uv-card uv-card-hover ${className}`} style={{ display: "flex", flexDirection: "column", overflow: "hidden", height: "100%", ...width }}>
      <div style={{ position: "relative", width: "100%", paddingTop: "68%", background: "var(--color-ink-soft)", flexShrink: 0 }}>
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={p.name} loading="lazy" onError={() => setBroken(true)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <ImagePlaceholder p={p} />
        )}
        <div style={{ position: "absolute", top: 10, right: 10 }}>
          <SaveHeart projectId={p.id} theme="light" />
        </div>
        {hasRera && (
          <div style={{ position: "absolute", bottom: 10, left: 10 }}>
            <VerifiedBadge type="RERA" />
          </div>
        )}
        {p.inventoryGrade && (
          <div style={{ position: "absolute", bottom: 10, right: 10 }}>
            <GradePill grade={p.inventoryGrade} score={p.inventoryScore} />
          </div>
        )}
        {p.status !== "ACTIVE" && (
          <div
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              background: "rgba(13,13,18,0.72)",
              color: "#fff",
              padding: "3px 9px",
              borderRadius: 999,
              fontSize: "0.625rem",
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            {p.status.replace("_", " ")}
          </div>
        )}
      </div>

      <div style={{ padding: "1rem 1.1rem 0", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <div>
          <h3 
            style={{ 
              fontFamily: "var(--font-jakarta)", 
              fontWeight: 700, 
              fontSize: "1.0625rem", 
              color: "var(--color-text-hi)", 
              lineHeight: 1.3,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis"
            }}
            title={p.name}
          >
            {p.name}
          </h3>
          <div style={{ fontSize: "0.75rem", color: "var(--color-text-lo)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            by {p.developer}
          </div>
        </div>
        <div 
          style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: 5, 
            fontSize: "0.75rem", 
            color: "var(--color-text-mid)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis"
          }}
          title={`${place} — ${p.corridor}`}
        >
          <MapPin size={13} style={{ flexShrink: 0 }} /> 
          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {place}
          </span>
        </div>
        <div>
          <div style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "1.25rem", color: "var(--color-text-hi)" }}>
            {formatLakhRange(p.minBudgetLakhs, p.maxBudgetLakhs)}
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--color-text-lo)", marginTop: 2, minHeight: "1.1rem" }}>
            {emi}
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, minHeight: 52, alignItems: "flex-start" }}>
          <InfoChip variant="navy">{p.propertyType}</InfoChip>
          <span
            className="uv-chip"
            style={{ background: risk.bg, color: risk.fg }}
          >
            {risk.label}
          </span>
          <InfoChip variant="ghost">
            {p.possessionText ?? `${p.minHorizonYears}–${p.maxHorizonYears} yr hold`}
          </InfoChip>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, padding: "1rem 1.1rem 1.15rem", marginTop: "auto" }}>
        <Link href={`/projects/${p.id}`} className="uv-btn uv-btn-ghost" style={{ flex: 1, fontSize: "0.8125rem", padding: "9px 14px", textAlign: "center" }}>
          View Details
        </Link>
        <Link
          href={`/projects/${p.id}#enquire`}
          className="uv-btn uv-btn-primary"
          style={{ fontSize: "0.8125rem", padding: "9px 14px" }}
          aria-label={`Enquire about ${p.name}`}
        >
          <Phone size={14} /> Enquire
        </Link>
      </div>
    </div>
  );
}
