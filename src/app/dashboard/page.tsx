"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Phone, Sliders, Sparkles, Map, TrendingUp, Compass, ArrowRight, MessageCircle,
  Bookmark, Eye, FileText, Pin, Building2,
} from "lucide-react";
import SignOutButton from "@/components/client/auth/SignOutButton";
import { SkeletonCard, InfoChip, Wordmark } from "@/components/ui";
import { formatLakhRange, formatINRFull, formatPct, formatDate } from "@/lib/format";
import SellingMode from "@/components/seller/SellingMode";

type DashMode = "buying" | "selling";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}
function writeCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 180}`;
}

interface SellerStatus { hasProfile: boolean; unread: number }

interface DashData {
  state: "EXPLORER" | "ACTIVE_BUYER" | "OWNER";
  greeting: string;
  user: { firstName: string; name: string | null; email: string | null; profileScore: number; phoneVerified: boolean; lastDashboardVisitAt: string | null };
  resume: { lastReport: any | null; continueSearch: { budget: number; horizon: number; city: string } | null };
  nextAction: { key: string; icon: string; title: string; sub: string; cta: string; href: string };
  advisor: { generic: boolean; name: string; role: string; whatsapp: string };
  saved: { projects: any[]; corridors: any[]; reports: any[] };
  counts: { projects: number; corridors: number; reports: number };
}

const ACTION_ICON: Record<string, React.ReactNode> = {
  phone: <Phone size={22} />, sliders: <Sliders size={22} />, sparkles: <Sparkles size={22} />,
  map: <Map size={22} />, trend: <TrendingUp size={22} />, compass: <Compass size={22} />,
};

export default function DashboardPage() {
  const [data, setData] = useState<DashData | null>(null);
  const [tab, setTab] = useState<"projects" | "corridors" | "reports">("projects");
  const [seller, setSeller] = useState<SellerStatus>({ hasProfile: false, unread: 0 });
  const [mode, setMode] = useState<DashMode>("buying");

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => { setData(d); fetch("/api/dashboard/mark-seen", { method: "POST" }).catch(() => {}); })
      .catch((status) => {
        // Session cookie is valid but the user row is gone (e.g. after a DB
        // reset) or unauthenticated — bounce to login instead of hanging on
        // skeletons forever.
        if (status === 401 || status === 404) {
          window.location.href = "/login?next=/dashboard";
          return;
        }
        setData(null);
      });

    // Seller status — governs the mode toggle. Buying path is untouched.
    fetch("/api/seller/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const hasProfile = !!d?.profile;
        if (hasProfile) {
          if (readCookie("dash_mode") === "selling") setMode("selling");
          fetch("/api/seller/enquiries?status=NEW").then((r) => r.json()).then((e) => setSeller({ hasProfile, unread: e.enquiries?.length ?? 0 })).catch(() => setSeller({ hasProfile, unread: 0 }));
        }
      })
      .catch(() => {});
  }, []);

  const changeMode = (m: DashMode) => { setMode(m); writeCookie("dash_mode", m); };

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-paper)" }}>
      <header style={{ background: "var(--color-ink)", padding: "0 1.25rem", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ fontFamily: "var(--font-jakarta)", fontWeight: 800, color: "#fff", textDecoration: "none", fontSize: "1.05rem" }}>
          <Wordmark />
        </Link>
        <SignOutButton />
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" style={{ paddingTop: "1.5rem", paddingBottom: "3rem", display: "flex", flexDirection: "column", gap: 16 }}>
        {!data ? (
          <>
            <div className="uv-skeleton" style={{ height: 140, borderRadius: 20 }} />
            <div className="uv-skeleton" style={{ height: 110, borderRadius: 14 }} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))", gap: 16 }}>
              <SkeletonCard variant="project" /><SkeletonCard variant="project" /><SkeletonCard variant="project" />
            </div>
          </>
        ) : (
          <>
            <GreetingBlock data={data} mode={mode} setMode={changeMode} seller={seller} />
            {mode === "selling" && seller.hasProfile ? (
              <SellingMode userName={data.user.firstName} />
            ) : (
              <>
                <NextActionBlock a={data.nextAction} />
                <SavedBlock data={data} tab={tab} setTab={setTab} />
                {data.saved.corridors.length > 0 && <CorridorGrowthBlock corridors={data.saved.corridors} />}
                <AdvisorBlock advisor={data.advisor} name={data.user.firstName} />
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// ── Mode toggle ──
function ModeToggle({ mode, setMode, unread }: { mode: DashMode; setMode: (m: DashMode) => void; unread: number }) {
  return (
    <div style={{ display: "inline-flex", background: "var(--color-ink-soft)", border: "1px solid var(--color-ink-line)", borderRadius: 999, padding: 3 }}>
      {(["buying", "selling"] as DashMode[]).map((m) => {
        const active = mode === m;
        return (
          <button key={m} onClick={() => setMode(m)}
            style={{ position: "relative", border: "none", cursor: "pointer", padding: "6px 16px", borderRadius: 999, fontSize: "0.8125rem", fontWeight: 700, textTransform: "capitalize", background: active ? "var(--color-saffron)" : "transparent", color: active ? "var(--color-ink)" : "var(--color-text-invert-mid)" }}>
            {m}
            {m === "selling" && unread > 0 && <span style={{ position: "absolute", top: -3, right: -3, minWidth: 16, height: 16, padding: "0 4px", borderRadius: 999, background: "var(--color-alert)", color: "#fff", fontSize: 10, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{unread}</span>}
          </button>
        );
      })}
    </div>
  );
}

// ── Block A ──
function GreetingBlock({ data, mode, setMode, seller }: { data: DashData; mode: DashMode; setMode: (m: DashMode) => void; seller: SellerStatus }) {
  const { user, greeting, resume } = data;
  return (
    <section style={{ background: "var(--color-ink)", borderRadius: "var(--radius-uv-lg)", padding: "clamp(1.4rem, 3vw, 2rem)", color: "#fff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <h1 style={{ fontFamily: "var(--font-jakarta)", fontWeight: 800, fontSize: "clamp(1.4rem, 3vw, 1.9rem)", letterSpacing: "-0.02em" }}>
              {greeting}, {user.firstName}
            </h1>
            {seller.hasProfile && <ModeToggle mode={mode} setMode={setMode} unread={seller.unread} />}
          </div>
          <p style={{ color: "var(--color-text-invert-mid)", fontSize: "0.8125rem", marginTop: 4 }}>
            {user.lastDashboardVisitAt ? `Last visit ${formatDate(user.lastDashboardVisitAt)}` : "Welcome to your dashboard"}
            {!seller.hasProfile && (
              <>
                {" · "}
                <Link href="/dashboard/selling/new" style={{ color: "var(--color-saffron)", fontWeight: 600, textDecoration: "none" }}>List a property →</Link>
              </>
            )}
          </p>
        </div>
        <div style={{ minWidth: 160 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.6875rem", color: "var(--color-text-invert-mid)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            <span>Profile</span><span className="uv-mono" style={{ color: "var(--color-saffron)" }}>{user.profileScore}%</span>
          </div>
          <div style={{ height: 6, borderRadius: 999, background: "var(--color-ink-line)", marginTop: 6, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${user.profileScore}%`, background: "var(--color-saffron)" }} />
          </div>
        </div>
      </div>

      <div style={{ display: mode === "selling" ? "none" : "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, marginTop: 20 }}>
        {resume.lastReport ? (
          <ResumeCard icon="📄" title="Your last report" line={resume.lastReport.title}>
            <Link href="/research" className="uv-btn uv-btn-primary" style={{ fontSize: "0.75rem", padding: "7px 12px" }}>View again</Link>
            <Link href={`/research?budget=${resume.lastReport.budget}&horizon=${resume.lastReport.horizon}&city=${encodeURIComponent(resume.lastReport.city)}`} className="uv-btn" style={{ fontSize: "0.75rem", padding: "7px 12px", background: "var(--color-ink-soft)", color: "#fff", border: "1px solid var(--color-ink-line)" }}>Re-run</Link>
          </ResumeCard>
        ) : (
          <ResumeCard icon="🤖" title="Run your first AI report" line="Budget, horizon, city — three inputs.">
            <Link href="/research" className="uv-btn uv-btn-primary" style={{ fontSize: "0.75rem", padding: "7px 12px" }}>Start <ArrowRight size={14} /></Link>
          </ResumeCard>
        )}
        {resume.continueSearch && (
          <ResumeCard icon="🔁" title="Continue where you left" line={`₹${resume.continueSearch.budget}L · ${resume.continueSearch.horizon}yr · ${resume.continueSearch.city}`}>
            <Link href={`/research?budget=${resume.continueSearch.budget}&horizon=${resume.continueSearch.horizon}&city=${encodeURIComponent(resume.continueSearch.city)}`} className="uv-btn uv-btn-primary" style={{ fontSize: "0.75rem", padding: "7px 12px" }}>Resume search <ArrowRight size={14} /></Link>
          </ResumeCard>
        )}
      </div>
    </section>
  );
}

function ResumeCard({ icon, title, line, children }: { icon: string; title: string; line: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--color-ink-soft)", border: "1px solid var(--color-ink-line)", borderRadius: 14, padding: "1rem 1.1rem" }}>
      <div style={{ fontSize: "0.8125rem", color: "var(--color-text-invert-mid)" }}>{icon} {title}</div>
      <div style={{ fontWeight: 600, fontSize: "0.9375rem", marginTop: 4, color: "#fff" }}>{line}</div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>{children}</div>
    </div>
  );
}

// ── Block C ──
function NextActionBlock({ a }: { a: DashData["nextAction"] }) {
  return (
    <section style={{ background: "var(--color-navy-ink)", borderRadius: "var(--radius-uv-card)", padding: "1.25rem 1.5rem", color: "#fff", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 48, height: 48, borderRadius: 12, background: "rgba(255,255,255,0.1)", color: "var(--color-saffron)", flexShrink: 0 }}>
        {ACTION_ICON[a.icon] ?? <Compass size={22} />}
      </div>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(255,255,255,0.6)" }}>Next best action</div>
        <div style={{ fontFamily: "var(--font-jakarta)", fontWeight: 700, fontSize: "1.0625rem" }}>{a.title}</div>
        <div style={{ fontSize: "0.8125rem", color: "rgba(255,255,255,0.75)", marginTop: 2 }}>{a.sub}</div>
      </div>
      <Link href={a.href} className="uv-btn uv-btn-primary" style={{ fontSize: "0.8125rem" }}>{a.cta} <ArrowRight size={15} /></Link>
    </section>
  );
}

// ── Block E ──
function SavedBlock({ data, tab, setTab }: { data: DashData; tab: string; setTab: (t: any) => void }) {
  const { saved, counts } = data;
  const tabs = [
    { key: "projects", label: "Projects", count: counts.projects, icon: <Bookmark size={14} /> },
    { key: "corridors", label: "Corridors", count: counts.corridors, icon: <Eye size={14} /> },
    { key: "reports", label: "Reports", count: counts.reports, icon: <FileText size={14} /> },
  ];
  return (
    <section className="uv-card" style={{ padding: "1.25rem 1.35rem" }}>
      <div style={{ display: "flex", gap: 6, borderBottom: "1px solid var(--color-line)", marginBottom: 16, flexWrap: "wrap" }}>
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ position: "relative", background: "none", border: "none", cursor: "pointer", padding: "8px 12px", fontSize: "0.875rem", fontWeight: active ? 700 : 500, color: active ? "var(--color-text-hi)" : "var(--color-text-mid)", display: "inline-flex", alignItems: "center", gap: 6 }}>
              {t.icon} {t.label} <span className="uv-mono" style={{ fontSize: "0.75rem", color: "var(--color-text-lo)" }}>({t.count})</span>
              {active && <span style={{ position: "absolute", left: 8, right: 8, bottom: -1, height: 3, background: "var(--color-saffron)", borderRadius: 3 }} />}
            </button>
          );
        })}
      </div>

      {tab === "projects" && (saved.projects.length === 0 ? (
        <Empty icon={<Bookmark size={22} />} text="No saved projects yet." cta="Browse projects" href="/projects" />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
          {saved.projects.map((p) => <SavedProjectCard key={p.id} p={p} />)}
        </div>
      ))}

      {tab === "corridors" && (saved.corridors.length === 0 ? (
        <Empty icon={<Eye size={22} />} text="You're not watching any corridors yet." cta="Explore corridors" href="/market" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {saved.corridors.map((c) => <CorridorRow key={c.slug} c={c} />)}
        </div>
      ))}

      {tab === "reports" && (saved.reports.length === 0 ? (
        <Empty icon={<FileText size={22} />} text="No saved reports yet." cta="Run an AI report" href="/research" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {saved.reports.map((r) => <ReportRow key={r.id} r={r} />)}
        </div>
      ))}
    </section>
  );
}

function SavedProjectCard({ p }: { p: any }) {
  const img = p.imageUrls?.[0] || "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=600&q=80";
  return (
    <div className="uv-card" style={{ overflow: "hidden" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={img} alt={p.name} style={{ width: "100%", height: 120, objectFit: "cover" }} />
      <div style={{ padding: "0.9rem 1rem" }}>
        <h4 style={{ fontFamily: "var(--font-jakarta)", fontWeight: 700, fontSize: "0.9375rem", color: "var(--color-text-hi)" }}>{p.name}</h4>
        <div style={{ fontSize: "0.75rem", color: "var(--color-text-lo)", marginTop: 2 }}>{p.corridor}</div>
        <div className="uv-mono" style={{ fontWeight: 600, fontSize: "0.9375rem", color: "var(--color-text-hi)", marginTop: 8 }}>{formatLakhRange(p.minBudgetLakhs, p.maxBudgetLakhs)}</div>
        <div style={{ marginTop: 8 }}><InfoChip variant="navy">{p.propertyType}</InfoChip></div>
        {p.note && <p style={{ marginTop: 8, fontSize: "0.75rem", fontStyle: "italic", color: "var(--color-text-mid)", borderLeft: "2px solid var(--color-saffron)", paddingLeft: 8 }}>{p.note}</p>}
      </div>
    </div>
  );
}

function CorridorRow({ c }: { c: any }) {
  return (
    <Link href={`/market/${c.slug}`} className="uv-card uv-card-hover" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", textDecoration: "none", flexWrap: "wrap" }}>
      <div style={{ flex: 1, minWidth: 160 }}>
        <div style={{ fontWeight: 600, color: "var(--color-text-hi)", fontSize: "0.9375rem" }}>{c.name}</div>
        {c.scoreNow != null && <div style={{ fontSize: "0.75rem", color: "var(--color-text-lo)" }}>⭐ {c.scoreNow}/100</div>}
      </div>
      {c.priceNow != null && <div className="uv-mono" style={{ fontSize: "0.875rem", color: "var(--color-text-hi)" }}>{formatINRFull(c.priceNow)}/sq.yd</div>}
      {c.priceDeltaPct != null && (
        <span className="uv-mono" style={{ fontSize: "0.8125rem", fontWeight: 600, color: c.priceDeltaPct >= 0 ? "var(--color-growth)" : "var(--color-alert)" }}>
          {formatPct(c.priceDeltaPct, { sign: true })} <span style={{ color: "var(--color-text-lo)", fontWeight: 400 }}>since watched</span>
        </span>
      )}
    </Link>
  );
}

function ReportRow({ r }: { r: any }) {
  return (
    <div className="uv-card" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", flexWrap: "wrap" }}>
      <FileText size={16} style={{ color: "var(--color-saffron-deep)" }} />
      <div style={{ flex: 1, minWidth: 160, fontSize: "0.875rem", fontWeight: 500, color: "var(--color-text-hi)" }}>{r.title}</div>
      {r.isPinned && <Pin size={14} style={{ color: "var(--color-saffron-deep)" }} />}
      <Link href={`/research?budget=${r.budget}&horizon=${r.horizon}&city=${encodeURIComponent(r.city)}`} className="uv-btn uv-btn-ghost" style={{ fontSize: "0.75rem", padding: "6px 12px" }}>Re-run</Link>
    </div>
  );
}

// ── Block F ──
function CorridorGrowthBlock({ corridors }: { corridors: any[] }) {
  return (
    <section className="uv-card" style={{ padding: "1.25rem 1.35rem" }}>
      <h3 style={{ fontFamily: "var(--font-jakarta)", fontWeight: 800, fontSize: "1.125rem", color: "var(--color-text-hi)", marginBottom: 14 }}>My corridors</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {corridors.map((c) => (
          <div key={c.slug} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", paddingBottom: 12, borderBottom: "1px solid var(--color-line)" }}>
            <div>
              <div style={{ fontWeight: 700, color: "var(--color-text-hi)" }}>{c.name}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-lo)" }}>Watching since {formatDate(c.watchedAt)}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              {c.priceNow != null && <div className="uv-mono" style={{ fontSize: "0.9375rem", color: "var(--color-text-hi)" }}>{formatINRFull(c.priceNow)}/sq.yd</div>}
              {c.priceDeltaPct != null && <div className="uv-mono" style={{ fontSize: "0.8125rem", fontWeight: 600, color: c.priceDeltaPct >= 0 ? "var(--color-growth)" : "var(--color-alert)" }}>{formatPct(c.priceDeltaPct, { sign: true })}</div>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Block D ──
function AdvisorBlock({ advisor, name }: { advisor: DashData["advisor"]; name: string }) {
  const waMsg = encodeURIComponent(`Hi, I'm ${name}. I'd like help with my Hyderabad property investment.`);
  const waNum = advisor.whatsapp.replace(/\D/g, "");
  return (
    <section className="uv-card" style={{ padding: "1.25rem 1.35rem", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
      <div style={{ width: 46, height: 46, borderRadius: 999, background: "var(--color-navy-wash)", color: "var(--color-navy-ink)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Building2 size={22} />
      </div>
      <div style={{ flex: 1, minWidth: 180 }}>
        <div style={{ fontWeight: 700, color: "var(--color-text-hi)" }}>{advisor.name}</div>
        <div style={{ fontSize: "0.8125rem", color: "var(--color-text-mid)" }}>{advisor.role}</div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <a href={`tel:${advisor.whatsapp}`} className="uv-btn uv-btn-ghost" style={{ fontSize: "0.8125rem" }}><Phone size={15} /> Call</a>
        <a href={`https://wa.me/${waNum}?text=${waMsg}`} target="_blank" rel="noopener noreferrer" className="uv-btn uv-btn-primary" style={{ fontSize: "0.8125rem" }}><MessageCircle size={15} /> WhatsApp</a>
      </div>
    </section>
  );
}

function Empty({ icon, text, cta, href }: { icon: React.ReactNode; text: string; cta: string; href: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "2.5rem 1rem" }}>
      <div style={{ width: 48, height: 48, borderRadius: 999, background: "var(--color-saffron-wash)", color: "var(--color-saffron-deep)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>{icon}</div>
      <p style={{ color: "var(--color-text-mid)", fontSize: "0.9375rem" }}>{text}</p>
      <Link href={href} className="uv-btn uv-btn-ghost" style={{ marginTop: 14, fontSize: "0.8125rem" }}>{cta} <ArrowRight size={14} /></Link>
    </div>
  );
}
