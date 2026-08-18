import React from "react";
import Link from "next/link";
import { MapPin, Phone } from "lucide-react";
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
}

interface ProjectCardProps {
  project: ProjectCardData;
  variant?: "grid" | "carousel" | "list";
  className?: string;
}

function fallbackImage(p: ProjectCardData): string {
  const type = (p.propertyType || "").toLowerCase();
  const corridor = (p.corridor || "").toLowerCase();
  if (type.includes("plot") || /(yadadri|shadnagar|kadthal)/.test(corridor))
    return "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80";
  if (type.includes("villa") || corridor.includes("kompally"))
    return "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=800&q=80";
  if (/(kokapet|gachibowli)/.test(corridor))
    return "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80";
  return "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80";
}

/** v2 project card. Grid & carousel share the vertical layout; list is a horizontal row. */
export default function ProjectCard({ project: p, variant = "grid", className = "" }: ProjectCardProps) {
  const img = p.imageUrls?.[0] || fallbackImage(p);
  const risk = RISK[p.riskLevel];
  const emi = formatEMI(lakhToRupees(p.minBudgetLakhs));

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
        {p.minHorizonYears}–{p.maxHorizonYears} yr hold
      </InfoChip>
    </div>
  );

  if (variant === "list") {
    return (
      <div className={`uv-card uv-card-hover ${className}`} style={{ display: "flex", overflow: "hidden" }}>
        <div style={{ position: "relative", width: 160, flexShrink: 0, background: "var(--color-ink-soft)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img} alt={p.name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          {p.riskLevel === "LOW" && (
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
            <SaveHeart id={p.id} theme="dark" />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.75rem", color: "var(--color-text-mid)" }}>
            <MapPin size={13} /> {p.corridor} · {p.city}
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "1.05rem", color: "var(--color-text-hi)" }}>
            {formatLakhRange(p.minBudgetLakhs, p.maxBudgetLakhs)}
          </div>
          {chips}
        </div>
      </div>
    );
  }

  const width = variant === "carousel" ? { minWidth: 288, width: 288, scrollSnapAlign: "start" as const } : {};

  return (
    <div className={`uv-card uv-card-hover ${className}`} style={{ display: "flex", flexDirection: "column", overflow: "hidden", height: "100%", ...width }}>
      <div style={{ position: "relative", width: "100%", paddingTop: "75%", background: "var(--color-ink-soft)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img} alt={p.name} loading="lazy" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", top: 10, right: 10 }}>
          <SaveHeart id={p.id} theme="light" />
        </div>
        {p.riskLevel === "LOW" && (
          <div style={{ position: "absolute", bottom: 10, left: 10 }}>
            <VerifiedBadge type="RERA" />
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
          <h3 style={{ fontFamily: "var(--font-jakarta)", fontWeight: 700, fontSize: "1.0625rem", color: "var(--color-text-hi)", lineHeight: 1.3 }}>
            {p.name}
          </h3>
          <div style={{ fontSize: "0.75rem", color: "var(--color-text-lo)" }}>by {p.developer}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.75rem", color: "var(--color-text-mid)" }}>
          <MapPin size={13} /> {p.corridor} · {p.city}
        </div>
        <div>
          <div style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "1.25rem", color: "var(--color-text-hi)" }}>
            {formatLakhRange(p.minBudgetLakhs, p.maxBudgetLakhs)}
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--color-text-lo)", marginTop: 2 }}>{emi}</div>
        </div>
        {chips}
      </div>

      <div style={{ display: "flex", gap: 8, padding: "1rem 1.1rem 1.15rem", marginTop: 12 }}>
        <Link href={`/projects/${p.id}`} className="uv-btn uv-btn-ghost" style={{ flex: 1, fontSize: "0.8125rem", padding: "9px 14px" }}>
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
