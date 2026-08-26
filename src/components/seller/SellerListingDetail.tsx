"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, TrendingUp, Eye, Mail, Clock, Target, Pencil } from "lucide-react";
import { formatLakh, formatINRFull, formatDate } from "@/lib/format";

interface Comp { points: number; max: number; confidence: "HIGH" | "LOW"; note?: string }
interface Breakdown { location: Comp; price: Comp; quality: Comp; trust: Comp; freshness: Comp; total: number }
interface Improvement { key: string; points: number; label: string; action: string; href?: string }

export default function SellerListingDetail({ id }: { id: string }) {
  const [listing, setListing] = useState<any>(null);
  const [score, setScore] = useState<{ breakdown: Breakdown; improvements: Improvement[]; grade: string | null; potential: number } | null>(null);
  const [perf, setPerf] = useState<any>(null);
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/seller/listings/${id}`).then((r) => r.json()).then((d) => setListing(d.listing)).catch(() => {});
    fetch(`/api/seller/listings/${id}/score`).then((r) => r.json()).then(setScore).catch(() => {});
    fetch(`/api/seller/listings/${id}/performance`).then((r) => r.json()).then(setPerf).catch(() => {});
    fetch(`/api/seller/enquiries`).then((r) => r.json()).then((d) => setEnquiries((d.enquiries ?? []).filter((e: any) => e.projectId === id))).catch(() => {});
    fetch(`/api/seller/matches`).then((r) => r.json()).then((d) => setMatches((d.matches ?? []).filter((m: any) => m.forListing?.id === id))).catch(() => {});
  }, [id]);

  if (!listing) return <div className="uv-skeleton" style={{ height: 300, borderRadius: 16 }} />;

  const comps: [string, Comp][] = score ? [["Location", score.breakdown.location], ["Price", score.breakdown.price], ["Quality", score.breakdown.quality], ["Trust", score.breakdown.trust], ["Freshness", score.breakdown.freshness]] : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <Link href="/dashboard" className="uv-btn uv-btn-ghost" style={{ fontSize: "0.8125rem" }}><ArrowLeft size={14} /> Back to dashboard</Link>
        <Link href={`/dashboard/selling/${id}/edit`} className="uv-btn uv-btn-primary" style={{ fontSize: "0.8125rem" }}><Pencil size={14} /> Edit listing</Link>
      </div>

      <div>
        <h1 style={{ fontFamily: "var(--font-jakarta)", fontWeight: 800, fontSize: "1.5rem", color: "var(--color-text-hi)" }}>{listing.name || "Untitled listing"}</h1>
        <p style={{ color: "var(--color-text-mid)", fontSize: "0.875rem" }}>{listing.corridor} · {formatLakh(listing.maxBudgetLakhs || listing.minBudgetLakhs)}</p>
      </div>

      {/* Counters */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))", gap: 12 }}>
        <Stat icon={<Eye size={16} />} label="Views" value={listing.viewCount} />
        <Stat icon={<Mail size={16} />} label="Enquiries" value={listing.enquiryCount} />
        <Stat icon={<Target size={16} />} label="Matched buyers" value={matches.length} />
        <Stat icon={<TrendingUp size={16} />} label="Listing score" value={score ? `${score.breakdown.total}/100` : "—"} />
      </div>

      {/* Score breakdown + improvements */}
      {score && (
        <div className="uv-card" style={{ padding: "1.25rem 1.35rem" }}>
          <h3 style={{ fontFamily: "var(--font-jakarta)", fontWeight: 800, fontSize: "1.05rem", color: "var(--color-text-hi)" }}>Listing score {score.breakdown.total}/100{score.grade && <span style={{ marginLeft: 8, fontSize: "0.8125rem", color: "var(--color-saffron-deep)" }}>Grade {score.grade}</span>}</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
            {comps.map(([name, c]) => (
              <div key={name}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem", color: "var(--color-text-mid)" }}>
                  <span>{name}{c.confidence === "LOW" && <span style={{ color: "var(--color-caution)", marginLeft: 6, fontSize: "0.6875rem" }}>provisional</span>}</span>
                  <span className="uv-mono">{c.points}/{c.max}</span>
                </div>
                <div style={{ height: 6, borderRadius: 999, background: "var(--color-line)", marginTop: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(c.points / c.max) * 100}%`, background: c.confidence === "LOW" ? "var(--color-caution)" : "var(--color-growth)" }} />
                </div>
                {c.confidence === "LOW" && c.note && <p style={{ fontSize: "0.6875rem", color: "var(--color-text-lo)", marginTop: 2 }}>{c.note}</p>}
              </div>
            ))}
          </div>

          {score.improvements.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--color-text-hi)" }}>Improve this listing <span className="uv-mono" style={{ color: "var(--color-text-mid)" }}>{score.breakdown.total} → potential {score.potential}</span></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
                {score.improvements.map((im) => (
                  <div key={im.key} style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--color-surface-dim)", borderRadius: 8, padding: "8px 12px" }}>
                    <span className="uv-mono" style={{ fontWeight: 700, color: "var(--color-growth)", minWidth: 34 }}>+{im.points}</span>
                    <span style={{ flex: 1, fontSize: "0.8125rem", color: "var(--color-text-hi)" }}>{im.label}</span>
                    <Link href={`/dashboard/selling/${id}/edit${im.href ?? ""}`} className="uv-btn uv-btn-ghost" style={{ fontSize: "0.75rem", padding: "5px 10px" }}>{im.action}</Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Performance vs locality */}
      {perf && (
        <div className="uv-card" style={{ padding: "1.25rem 1.35rem" }}>
          <h3 style={{ fontFamily: "var(--font-jakarta)", fontWeight: 800, fontSize: "1.05rem", color: "var(--color-text-hi)", marginBottom: 12 }}>Performance</h3>
          {perf.snapshots?.length > 0 ? (
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 100 }}>
              {perf.snapshots.map((s: any, i: number) => {
                const max = Math.max(...perf.snapshots.map((x: any) => x.viewCount), 1);
                return <div key={i} title={`${formatDate(s.capturedAt)}: ${s.viewCount} views`} style={{ flex: 1, height: `${(s.viewCount / max) * 100}%`, minHeight: 4, background: "var(--color-saffron)", borderRadius: "4px 4px 0 0" }} />;
              })}
            </div>
          ) : (
            <p style={{ fontSize: "0.8125rem", color: "var(--color-text-mid)" }}>Weekly performance snapshots will appear here once your listing has been live for a week.</p>
          )}
          <div style={{ display: "flex", gap: 20, marginTop: 12, fontSize: "0.8125rem", color: "var(--color-text-mid)", flexWrap: "wrap" }}>
            <span>Locality active listings: <b className="uv-mono" style={{ color: "var(--color-text-hi)" }}>{perf.locality?.activeListings ?? 0}</b></span>
            <span>Locality enquiry volume: <b className="uv-mono" style={{ color: "var(--color-text-hi)" }}>{perf.locality?.totalEnquiries ?? 0}</b></span>
          </div>
        </div>
      )}

      {/* Enquiries */}
      <div className="uv-card" style={{ padding: "1.25rem 1.35rem" }}>
        <h3 style={{ fontFamily: "var(--font-jakarta)", fontWeight: 800, fontSize: "1.05rem", color: "var(--color-text-hi)", marginBottom: 12 }}>Enquiries on this listing</h3>
        {enquiries.length === 0 ? <p style={{ fontSize: "0.8125rem", color: "var(--color-text-mid)" }}>No enquiries yet.</p> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {enquiries.map((e) => (
              <div key={e.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: "0.8125rem", paddingBottom: 8, borderBottom: "1px solid var(--color-line)", flexWrap: "wrap" }}>
                <span style={{ color: "var(--color-text-hi)", fontWeight: 600 }}>{e.buyerName} {e.budgetLakh != null && <span style={{ color: "var(--color-text-mid)", fontWeight: 400 }}>· ~{formatLakh(e.budgetLakh)}</span>}</span>
                <span style={{ color: "var(--color-text-lo)" }}>{formatDate(e.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activity timeline */}
      {listing.activityLog?.length > 0 && (
        <div className="uv-card" style={{ padding: "1.25rem 1.35rem" }}>
          <h3 style={{ fontFamily: "var(--font-jakarta)", fontWeight: 800, fontSize: "1.05rem", color: "var(--color-text-hi)", marginBottom: 12 }}>Activity</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {listing.activityLog.map((a: any) => (
              <div key={a.id} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: "0.8125rem", color: "var(--color-text-mid)" }}>
                <Clock size={12} style={{ color: "var(--color-text-lo)" }} />
                <span style={{ fontWeight: 600, color: "var(--color-text-hi)" }}>{a.eventType.replace(/_/g, " ")}</span>
                {a.detail && <span style={{ color: "var(--color-text-mid)" }}>— {a.detail}</span>}
                <span style={{ marginLeft: "auto", color: "var(--color-text-lo)" }}>{formatDate(a.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="uv-card" style={{ padding: "12px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--color-text-lo)", fontSize: "0.75rem" }}>{icon} {label}</div>
      <div className="uv-mono" style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--color-text-hi)", marginTop: 4 }}>{value}</div>
    </div>
  );
}
