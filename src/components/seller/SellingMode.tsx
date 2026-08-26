"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Plus, Eye, Heart, Mail, Target, ArrowUpRight, Pencil, Pause, Play, RefreshCw, CheckCircle2, ExternalLink, AlertTriangle, ChevronRight,
} from "lucide-react";
import { formatLakh, formatINRFull, formatDate } from "@/lib/format";

// ── Status pill metadata (client copy; server has its own in lib/listings/seller) ──
const STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  DRAFT: { label: "Draft", bg: "var(--color-line)", fg: "var(--color-text-mid)" },
  PENDING_REVIEW: { label: "Pending review", bg: "#FBEFD0", fg: "#8A5A00" },
  CHANGES_REQUESTED: { label: "Changes requested", bg: "#FBE0DC", fg: "#B4291D" },
  APPROVED: { label: "Live", bg: "#D9F2E3", fg: "#0B7A43" },
  PAUSED: { label: "Paused", bg: "var(--color-line)", fg: "var(--color-text-mid)" },
  EXPIRED: { label: "Expired", bg: "var(--color-line)", fg: "var(--color-text-mid)" },
  SOLD: { label: "Sold", bg: "var(--color-navy-wash)", fg: "var(--color-navy-ink)" },
  REJECTED: { label: "Rejected", bg: "#FBE0DC", fg: "#B4291D" },
};

interface Breakdown {
  location: Comp; price: Comp; quality: Comp; trust: Comp; freshness: Comp; total: number;
}
interface Comp { points: number; max: number; confidence: "HIGH" | "LOW"; note?: string }

interface Listing {
  id: string; name: string; corridor: string; city: string; propertyType: string;
  minBudgetLakhs: number; maxBudgetLakhs: number; totalAreaSqYd: number | null;
  totalPlots: number | null; availablePlots: number | null; imageUrls: string[];
  listingStatus: string; listingScore: number | null; scoreBreakdown: Breakdown | null;
  sellerFeedback: string | null; expiresAt: string | null;
  viewCount: number; saveCount: number; enquiryCount: number;
  _count?: { enquiries: number; media: number };
}

type Tab = "properties" | "responses" | "requests";

export default function SellingMode({ userName }: { userName: string }) {
  const [tab, setTab] = useState<Tab>("properties");
  const [counts, setCounts] = useState<{ properties: number; responses: number; requests: number }>({ properties: 0, responses: 0, requests: 0 });

  const refreshCounts = useCallback(async () => {
    try {
      const [l, e, m] = await Promise.all([
        fetch("/api/seller/listings").then((r) => r.json()),
        fetch("/api/seller/enquiries").then((r) => r.json()),
        fetch("/api/seller/matches").then((r) => r.json()),
      ]);
      setCounts({ properties: l.listings?.length ?? 0, responses: e.enquiries?.length ?? 0, requests: m.matches?.length ?? 0 });
    } catch { /* ignore */ }
  }, []);
  useEffect(() => { refreshCounts(); }, [refreshCounts]);

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "properties", label: "Properties", count: counts.properties },
    { key: "responses", label: "Responses", count: counts.responses },
    { key: "requests", label: "Requests", count: counts.requests },
  ];

  return (
    <section className="uv-card" style={{ padding: "1.25rem 1.35rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {tabs.map((t) => {
            const active = tab === t.key;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{ position: "relative", background: active ? "var(--color-ink)" : "transparent", color: active ? "#fff" : "var(--color-text-mid)", border: active ? "none" : "1px solid var(--color-line)", cursor: "pointer", padding: "8px 14px", borderRadius: 999, fontSize: "0.8125rem", fontWeight: 600 }}>
                {t.label} <span className="uv-mono" style={{ opacity: 0.7 }}>({t.count})</span>
              </button>
            );
          })}
        </div>
        <Link href="/dashboard/selling/new" className="uv-btn uv-btn-primary" style={{ fontSize: "0.8125rem" }}>
          <Plus size={15} /> Post a property
        </Link>
      </div>

      {tab === "properties" && <PropertiesTab onChange={refreshCounts} />}
      {tab === "responses" && <ResponsesTab onChange={refreshCounts} />}
      {tab === "requests" && <RequestsTab userName={userName} />}
    </section>
  );
}

// ══ PROPERTIES ══════════════════════════════════════════════════════
function PropertiesTab({ onChange }: { onChange: () => void }) {
  const [data, setData] = useState<{ listings: Listing[]; counts: Record<string, number>; avgScore: number | null } | null>(null);

  const load = useCallback(() => { fetch("/api/seller/listings").then((r) => r.json()).then(setData).catch(() => setData({ listings: [], counts: {}, avgScore: null })); }, []);
  useEffect(() => { load(); }, [load]);

  const act = async (id: string, action: string) => {
    await fetch(`/api/seller/listings/${id}/${action}`, { method: "POST" }).catch(() => {});
    load(); onChange();
  };

  if (!data) return <div className="uv-skeleton" style={{ height: 200, borderRadius: 14 }} />;
  if (data.listings.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
        <div style={{ width: 56, height: 56, borderRadius: 999, background: "var(--color-saffron-wash)", color: "var(--color-saffron-deep)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}><Plus size={26} /></div>
        <p style={{ color: "var(--color-text-hi)", fontWeight: 600, fontSize: "1rem" }}>You haven&apos;t posted a property yet</p>
        <p style={{ color: "var(--color-text-mid)", fontSize: "0.875rem", marginTop: 4 }}>List a plot or property and reach matched, qualified buyers.</p>
        <Link href="/dashboard/selling/new" className="uv-btn uv-btn-primary" style={{ marginTop: 16, fontSize: "0.8125rem" }}><Plus size={15} /> Post a property</Link>
      </div>
    );
  }

  const live = data.counts.APPROVED ?? 0;
  const pending = data.counts.PENDING_REVIEW ?? 0;
  const drafts = data.counts.DRAFT ?? 0;

  return (
    <>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: "0.8125rem", color: "var(--color-text-mid)", marginBottom: 14 }}>
        <span><b style={{ color: "var(--color-growth)" }}>{live}</b> live</span>
        <span><b style={{ color: "var(--color-text-hi)" }}>{pending}</b> pending review</span>
        <span><b style={{ color: "var(--color-text-hi)" }}>{drafts}</b> drafts</span>
        {data.avgScore != null && <span style={{ marginLeft: "auto" }}>Avg listing score <b className="uv-mono" style={{ color: "var(--color-text-hi)" }}>{data.avgScore}/100</b></span>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {data.listings.map((l) => <ListingCard key={l.id} l={l} onAct={act} />)}
      </div>
    </>
  );
}

function worstComponent(b: Breakdown | null): { key: string; note: string } | null {
  if (!b) return null;
  const comps: [string, Comp][] = [["Location", b.location], ["Price", b.price], ["Quality", b.quality], ["Trust", b.trust], ["Freshness", b.freshness]];
  let worst: [string, Comp] | null = null;
  for (const c of comps) { const gap = c[1].max - c[1].points; if (!worst || gap > worst[1].max - worst[1].points) worst = c; }
  if (!worst || worst[1].max - worst[1].points <= 0) return null;
  return { key: worst[0], note: worst[1].note ?? `${worst[0]} has room to improve.` };
}

function ListingCard({ l, onAct }: { l: Listing; onAct: (id: string, action: string) => void }) {
  const st = STATUS[l.listingStatus] ?? STATUS.DRAFT;
  const img = l.imageUrls?.[0];
  const price = l.maxBudgetLakhs || l.minBudgetLakhs;
  const rate = l.totalAreaSqYd && l.totalAreaSqYd > 0 && price > 0 ? Math.round((price * 100000) / l.totalAreaSqYd) : null;
  const isDraft = l.listingStatus === "DRAFT";
  const b = l.scoreBreakdown;
  const worst = worstComponent(b);

  return (
    <div className="uv-card" style={{ padding: 0, overflow: "hidden", border: l.listingStatus === "CHANGES_REQUESTED" ? "1px solid var(--color-alert)" : undefined }}>
      <div style={{ display: "flex", gap: 14, padding: 14, flexWrap: "wrap" }}>
        <div style={{ width: 120, height: 88, borderRadius: 10, overflow: "hidden", flexShrink: 0, background: "var(--color-surface-dim)" }}>
          {img ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={img} alt={l.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--color-text-lo)", fontSize: 11 }}>No photo</div>}
        </div>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <h4 style={{ fontFamily: "var(--font-jakarta)", fontWeight: 700, fontSize: "0.9375rem", color: "var(--color-text-hi)" }}>{l.name || "Untitled listing"}</h4>
            <span style={{ background: st.bg, color: st.fg, fontSize: "0.6875rem", fontWeight: 700, padding: "2px 8px", borderRadius: 999, textTransform: "uppercase", letterSpacing: "0.03em" }}>{st.label}</span>
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--color-text-lo)", marginTop: 2 }} className="uv-mono">
            {l.id.slice(0, 12).toUpperCase()}{l.expiresAt && l.listingStatus === "APPROVED" ? ` · Valid till ${formatDate(l.expiresAt)}` : ""}
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "baseline", marginTop: 8, flexWrap: "wrap" }}>
            <span className="uv-mono" style={{ fontWeight: 700, fontSize: "1rem", color: "var(--color-text-hi)" }}>{price > 0 ? formatLakh(price) : "Price not set"}</span>
            {rate && <span className="uv-mono" style={{ fontSize: "0.8125rem", color: "var(--color-text-mid)" }}>({formatINRFull(rate)}/sq.yd)</span>}
            {l.availablePlots != null && l.totalPlots != null && <span style={{ fontSize: "0.8125rem", color: "var(--color-text-mid)" }}>{l.availablePlots} of {l.totalPlots} plots available</span>}
          </div>
        </div>
      </div>

      {/* CHANGES_REQUESTED inline feedback */}
      {l.listingStatus === "CHANGES_REQUESTED" && l.sellerFeedback && (
        <div style={{ margin: "0 14px 12px", background: "#FBE0DC", border: "1px solid var(--color-alert)", borderRadius: 10, padding: "10px 12px", fontSize: "0.8125rem", color: "#8A2015" }}>
          <b>Our reviewer asked for a change:</b> {l.sellerFeedback}{" "}
          <Link href={`/dashboard/selling/${l.id}/edit`} style={{ color: "#B4291D", fontWeight: 700, textDecoration: "underline" }}>Fix it →</Link>
        </div>
      )}

      {/* Draft completion / score card */}
      {isDraft ? (
        <div style={{ margin: "0 14px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "var(--color-surface-dim)", borderRadius: 10, padding: "10px 12px" }}>
          <span style={{ fontSize: "0.8125rem", color: "var(--color-text-mid)" }}>Draft — finish it to submit for review.</span>
          <Link href={`/dashboard/selling/${l.id}/edit`} className="uv-btn uv-btn-primary" style={{ fontSize: "0.75rem", padding: "6px 12px" }}>Continue <ChevronRight size={14} /></Link>
        </div>
      ) : l.listingScore != null && b ? (
        <div style={{ margin: "0 14px 12px", background: "var(--color-surface-dim)", borderRadius: 10, padding: "10px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--color-text-hi)" }}>Listing score <span className="uv-mono">{l.listingScore}/100</span></span>
            <Link href={`/dashboard/selling/${l.id}`} style={{ fontSize: "0.75rem", color: "var(--color-saffron-deep)", fontWeight: 600 }}>See detail</Link>
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--color-text-mid)", marginTop: 4 }} className="uv-mono">
            Location {b.location.points} · Price {b.price.points} · Quality {b.quality.points} · Trust {b.trust.points} · Fresh {b.freshness.points}
          </div>
          {worst && (
            <div style={{ display: "flex", gap: 6, alignItems: "flex-start", marginTop: 8, fontSize: "0.75rem", color: "#8A5A00" }}>
              <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} /> <span>{worst.note}</span>
            </div>
          )}
        </div>
      ) : null}

      {/* Counters */}
      {!isDraft && (
        <div style={{ display: "flex", gap: 16, padding: "0 14px 12px", fontSize: "0.75rem", color: "var(--color-text-mid)", flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}><Eye size={13} /> {l.viewCount} views</span>
          <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}><Heart size={13} /> {l.saveCount} saved</span>
          <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}><Mail size={13} /> {l.enquiryCount} enquiries</span>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, padding: "10px 14px", borderTop: "1px solid var(--color-line)", flexWrap: "wrap" }}>
        <Link href={`/dashboard/selling/${l.id}/edit`} className="uv-btn uv-btn-ghost" style={{ fontSize: "0.75rem", padding: "6px 10px" }}><Pencil size={13} /> Edit</Link>
        {l.listingStatus === "APPROVED" && <button onClick={() => onAct(l.id, "pause")} className="uv-btn uv-btn-ghost" style={{ fontSize: "0.75rem", padding: "6px 10px" }}><Pause size={13} /> Pause</button>}
        {l.listingStatus === "PAUSED" && <button onClick={() => onAct(l.id, "pause")} className="uv-btn uv-btn-ghost" style={{ fontSize: "0.75rem", padding: "6px 10px" }}><Play size={13} /> Resume</button>}
        {["APPROVED", "PAUSED", "EXPIRED"].includes(l.listingStatus) && <button onClick={() => onAct(l.id, "refresh")} className="uv-btn uv-btn-ghost" style={{ fontSize: "0.75rem", padding: "6px 10px" }}><RefreshCw size={13} /> Refresh</button>}
        {!["SOLD", "DRAFT", "REJECTED"].includes(l.listingStatus) && <button onClick={() => onAct(l.id, "mark-sold")} className="uv-btn uv-btn-ghost" style={{ fontSize: "0.75rem", padding: "6px 10px" }}><CheckCircle2 size={13} /> Mark sold</button>}
        {l.listingStatus === "APPROVED" && <Link href={`/projects/${l.id}`} target="_blank" className="uv-btn uv-btn-ghost" style={{ fontSize: "0.75rem", padding: "6px 10px", marginLeft: "auto" }}>View public page <ExternalLink size={13} /></Link>}
      </div>
    </div>
  );
}

// ══ RESPONSES ═══════════════════════════════════════════════════════
interface Enquiry {
  id: string; buyerName: string; message: string | null; budgetLakh: number | null; city: string | null;
  status: string; contactReleased: boolean; createdAt: string; projectName: string | null;
  buyerPhone?: string; buyerEmail?: string | null;
}

function ResponsesTab({ onChange }: { onChange: () => void }) {
  const [enquiries, setEnquiries] = useState<Enquiry[] | null>(null);
  const [filter, setFilter] = useState<string>("");

  const load = useCallback(() => {
    const q = filter ? `?status=${filter}` : "";
    fetch(`/api/seller/enquiries${q}`).then((r) => r.json()).then((d) => setEnquiries(d.enquiries ?? [])).catch(() => setEnquiries([]));
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  const mark = async (id: string, action: string) => { await fetch(`/api/seller/enquiries/${id}/${action}`, { method: "POST" }).catch(() => {}); load(); onChange(); };

  if (!enquiries) return <div className="uv-skeleton" style={{ height: 160, borderRadius: 14 }} />;

  const filters = [["", "All"], ["NEW", "New"], ["RESPONDED", "Responded"], ["CLOSED", "Closed"]];
  return (
    <>
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {filters.map(([k, label]) => (
          <button key={k} onClick={() => setFilter(k)} style={{ background: filter === k ? "var(--color-ink)" : "transparent", color: filter === k ? "#fff" : "var(--color-text-mid)", border: filter === k ? "none" : "1px solid var(--color-line)", cursor: "pointer", padding: "5px 12px", borderRadius: 999, fontSize: "0.75rem", fontWeight: 600 }}>{label}</button>
        ))}
      </div>
      {enquiries.length === 0 ? (
        <p style={{ textAlign: "center", color: "var(--color-text-mid)", padding: "2.5rem 1rem", fontSize: "0.9375rem" }}>No enquiries yet. They&apos;ll appear here as buyers respond to your listings.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {enquiries.map((e) => (
            <div key={e.id} className="uv-card" style={{ padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {e.status === "NEW" && <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--color-growth)" }} />}
                <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: e.contactReleased ? "var(--color-growth)" : "var(--color-text-lo)", textTransform: "uppercase" }}>{e.contactReleased ? "Shared" : e.status}</span>
                <span style={{ fontWeight: 600, color: "var(--color-text-hi)", fontSize: "0.875rem" }}>{e.buyerName}</span>
                <span style={{ fontSize: "0.75rem", color: "var(--color-text-lo)", marginLeft: "auto" }}>{formatDate(e.createdAt)}</span>
              </div>
              <div style={{ fontSize: "0.8125rem", color: "var(--color-text-mid)", marginTop: 4 }}>
                {e.budgetLakh != null && <>Budget ~{formatLakh(e.budgetLakh)} · </>}{e.city ?? "Hyderabad"}{e.projectName ? ` · ${e.projectName}` : ""}
              </div>
              {e.message && <p style={{ fontSize: "0.8125rem", color: "var(--color-text-hi)", marginTop: 6, fontStyle: "italic" }}>&ldquo;{e.message}&rdquo;</p>}
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
                {e.contactReleased && e.buyerPhone ? (
                  <>
                    <a href={`tel:${e.buyerPhone}`} className="uv-btn uv-btn-ghost" style={{ fontSize: "0.75rem", padding: "6px 10px" }}>📞 Call</a>
                    <a href={`https://wa.me/${e.buyerPhone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="uv-btn uv-btn-primary" style={{ fontSize: "0.75rem", padding: "6px 10px" }}>💬 WhatsApp</a>
                    <button onClick={() => mark(e.id, "viewed")} className="uv-btn uv-btn-ghost" style={{ fontSize: "0.75rem", padding: "6px 10px" }}>Mark responded</button>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: "0.75rem", color: "var(--color-text-mid)" }}>Our advisor is qualifying this buyer.</span>
                    {e.status === "NEW" && <button onClick={() => mark(e.id, "viewed")} className="uv-btn uv-btn-ghost" style={{ fontSize: "0.75rem", padding: "6px 10px" }}>Mark as viewed</button>}
                    <button onClick={() => mark(e.id, "request-connect")} className="uv-btn uv-btn-primary" style={{ fontSize: "0.75rem", padding: "6px 10px" }}>Ask our team to connect</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ══ REQUESTS (matched buyers) ═══════════════════════════════════════
interface Match {
  id: string; matchScore: number; forListing: { id: string; name: string; corridor: string };
  budgetLakh: number; horizonYears: number; persona: string | null; searchingSince: string;
  interestedCorridors: string[]; reasons: string[];
}

function RequestsTab({ userName }: { userName: string }) {
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [sent, setSent] = useState<Record<string, boolean>>({});
  useEffect(() => { fetch("/api/seller/matches").then((r) => r.json()).then((d) => setMatches(d.matches ?? [])).catch(() => setMatches([])); }, []);

  const connect = async (id: string) => { await fetch(`/api/seller/matches/${id}/request-connect`, { method: "POST" }).catch(() => {}); setSent((s) => ({ ...s, [id]: true })); };

  if (!matches) return <div className="uv-skeleton" style={{ height: 160, borderRadius: 14 }} />;
  if (matches.length === 0) return <p style={{ textAlign: "center", color: "var(--color-text-mid)", padding: "2.5rem 1rem", fontSize: "0.9375rem" }}>No matched buyers yet. Once your listings are live, buyers searching for a property like yours appear here.</p>;

  return (
    <>
      <p style={{ fontSize: "0.8125rem", color: "var(--color-text-mid)", marginBottom: 12 }}>Buyers looking for a property like yours — matched on budget, horizon, persona and corridor search history.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {matches.map((m) => (
          <div key={m.id} className="uv-card" style={{ padding: "12px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ background: "var(--color-growth)", color: "#fff", fontSize: "0.6875rem", fontWeight: 700, padding: "2px 8px", borderRadius: 999 }} className="uv-mono">{m.matchScore}% match</span>
              <span style={{ fontSize: "0.8125rem", color: "var(--color-text-mid)" }}>For: <b style={{ color: "var(--color-text-hi)" }}>{m.forListing.name}</b></span>
            </div>
            <div style={{ fontSize: "0.8125rem", color: "var(--color-text-mid)", marginTop: 6 }}>
              Budget ~{formatLakh(m.budgetLakh)} · {m.horizonYears}yr horizon · Searching since {formatDate(m.searchingSince)}
            </div>
            {m.interestedCorridors.length > 0 && <div style={{ fontSize: "0.75rem", color: "var(--color-text-lo)", marginTop: 4 }}>Interested in: {m.interestedCorridors.join(", ")}{m.persona ? ` · ${m.persona.replace(/_/g, " ")}` : ""}</div>}
            {m.reasons.length > 0 && <div style={{ fontSize: "0.75rem", color: "var(--color-text-mid)", marginTop: 6 }}><b>Why this matches:</b> {m.reasons.slice(0, 2).join(" · ")}</div>}
            <div style={{ marginTop: 10 }}>
              {sent[m.id] ? <span style={{ fontSize: "0.8125rem", color: "var(--color-growth)", fontWeight: 600 }}><CheckCircle2 size={14} style={{ verticalAlign: "-2px" }} /> Our team will reach out</span>
                : <button onClick={() => connect(m.id)} className="uv-btn uv-btn-primary" style={{ fontSize: "0.75rem", padding: "6px 12px" }}><Target size={13} /> Ask our team to connect</button>}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
