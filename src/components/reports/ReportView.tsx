// The weekly report, rendered from the frozen snapshot. Server component (no
// client JS): mobile-first single column, every section hides when empty.

import Link from "next/link";
import { formatLakh, formatINRFull } from "@/lib/format";
import type { ReportContent, AreaView, MatchedPropertyView } from "@/lib/reports/types";
import { Wordmark } from "@/components/ui";

interface Props {
  content: ReportContent & { _headline?: { headline: string } };
  headline: string;
  issueNumber: number;
  period: { start: Date; end: Date };
  firstName: string;
  unsubToken: string | null;
  /** WhatsApp-only customer (no login): every "change it" link points back to WhatsApp. */
  whatsappOnly?: boolean;
}

/** A tap-to-chat link to our WhatsApp number with a prefilled keyword, when the number is configured. */
function waLink(keyword: string): string | null {
  const n = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(keyword)}` : null;
}

const fmtDate = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const fmtRange = (a: Date, b: Date) => `${a.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}–${b.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;

/** Footer links: comfortable tap targets on phones. */
const footLink = { color: "#5A5A66", display: "inline-block", padding: "8px" } as const;

export function ReportView({ content, headline, issueNumber, period, firstName, unsubToken, whatsappOnly = false }: Props) {
  const wa = (keyword: string, label: string, style: React.CSSProperties) => {
    const href = waLink(keyword);
    return href ? (
      <a href={href} style={style}>
        {label}
      </a>
    ) : (
      <span style={{ ...style, cursor: "default" }}>
        {label} — reply <strong>{keyword}</strong> on WhatsApp
      </span>
    );
  };
  const c = content;
  const hasMatched = c.matched.length > 0;
  const noPropertyLine = !hasMatched; // Part 4.2 honesty line when nothing matched

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-paper, #FAF9F6)", color: "var(--color-ink, #0D0D12)" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 16px 56px" }}>
        {/* Header */}
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "18px 0", borderBottom: "1px solid var(--color-line, #E9E7E1)", flexWrap: "wrap" }}>
          <Wordmark style={{ fontFamily: "var(--font-jakarta)", fontWeight: 800, fontSize: "1.05rem" }} />
          <span className="uv-mono" style={{ fontSize: "0.75rem", color: "#8A8A99" }}>Issue #{issueNumber} · {fmtRange(period.start, period.end)}</span>
        </header>

        {/* Headline + meta */}
        <section style={{ padding: "24px 0 8px" }}>
          <h1 style={{ fontFamily: "var(--font-jakarta)", fontWeight: 800, fontSize: "clamp(1.4rem, 5vw, 1.9rem)", lineHeight: 1.15, letterSpacing: "-0.02em" }}>
            {headline || c._headline?.headline || "Your weekly report"}
          </h1>
          <p style={{ fontSize: "0.8125rem", color: "#5A5A66", marginTop: 12 }}>
            For: {c.meta.budgetMinLakh != null || c.meta.budgetMaxLakh != null ? `₹${c.meta.budgetMinLakh ?? 0}–${c.meta.budgetMaxLakh ?? "?"} L` : "any budget"}
            {c.meta.propertyTypes.length ? ` · ${c.meta.propertyTypes.map(tidyType).join(", ")}` : ""}
            {c.meta.areaNames.length ? ` · ${c.meta.areaNames.join(", ")}` : ""}
            {" "}
            {whatsappOnly
              ? wa("RESTART", "Change what you're looking for", { color: "var(--color-saffron-deep, #B87A00)", fontWeight: 600 })
              : <Link href="/dashboard/settings/reports" style={{ color: "var(--color-saffron-deep, #B87A00)", fontWeight: 600, whiteSpace: "nowrap" }}>Edit preferences</Link>}
          </p>
        </section>

        {/* THIS WEEK */}
        {c.thisWeek.length > 0 && (
          <Section title="This week">
            <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {c.thisWeek.map((t) => (
                <li key={t.rank} style={{ display: "flex", gap: 10, fontSize: "0.9375rem" }}>
                  <span className="uv-mono" style={{ color: "var(--color-saffron-deep, #B87A00)", fontWeight: 700, flexShrink: 0 }}>{t.rank}</span>
                  <span>{t.text}</span>
                </li>
              ))}
            </ol>
          </Section>
        )}

        {/* MATCHED */}
        {hasMatched && (
          <Section title={`Matched properties (${c.matched.length})`}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {c.matched.map((p) => <PropertyCard key={p.id} p={p} />)}
            </div>
          </Section>
        )}

        {noPropertyLine && (
          <Section title="Properties">
            <p style={{ fontSize: "0.9375rem", color: "#5A5A66", lineHeight: 1.5 }}>
              No new properties matched your filters this week. Here&apos;s what moved in your areas.
            </p>
          </Section>
        )}

        {/* NEAR MISSES */}
        {c.nearMisses.length > 0 && (
          <Section title={`Also worth a look (${c.nearMisses.length})`}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {c.nearMisses.map((p) => <PropertyCard key={p.id} p={p} nearMiss />)}
            </div>
          </Section>
        )}

        {/* AREAS */}
        {c.areas.length > 0 && (
          <Section title="Your areas this week">
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {c.areas.map((a) => <AreaRow key={a.slug} a={a} />)}
            </div>
          </Section>
        )}

        {/* INFRASTRUCTURE */}
        {c.infrastructure.length > 0 && (
          <Section title="Infrastructure">
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {c.infrastructure.map((inf) => (
                <div key={inf.id}>
                  <div style={{ fontWeight: 700, fontSize: "0.9375rem" }}>{inf.icon} {inf.title}</div>
                  {inf.meta && <div style={{ fontSize: "0.75rem", color: "#8A8A99", marginTop: 2 }}>{inf.meta}</div>}
                  {inf.affects.length > 0 && <div style={{ fontSize: "0.8125rem", color: "#5A5A66", marginTop: 4 }}>Affects: {inf.affects.join(", ")}</div>}
                  {inf.read && <div style={{ fontSize: "0.8125rem", color: "#3A3A47", marginTop: 4, fontStyle: "italic" }}>Our read: {inf.read}</div>}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* APPROVALS */}
        {c.approvals.length > 0 && (
          <Section title="Approvals in your areas">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {c.approvals.map((ap) => (
                <div key={ap.id} style={{ fontSize: "0.875rem" }}>
                  <span style={{ color: "var(--color-growth, #0F9D58)" }}>✓</span> {ap.label}
                  {ap.corridorName ? ` · ${ap.corridorName}` : ""}{ap.areaAcres ? ` · ${ap.areaAcres} acres` : ""}
                  {ap.date ? <span style={{ color: "#8A8A99" }}> · {fmtDate(new Date(ap.date))}</span> : null}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* MARKET PULSE */}
        {c.marketPulse && (
          <Section title="Market pulse">
            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: "0.875rem" }}>
              {c.marketPulse.totalRegistrations != null && (
                <Row label={`${c.marketPulse.period} registrations`} value={<span className="uv-mono">{c.marketPulse.totalRegistrations.toLocaleString("en-IN")}{c.marketPulse.yoyGrowthPct != null ? ` · ${c.marketPulse.yoyGrowthPct > 0 ? "▲+" : ""}${c.marketPulse.yoyGrowthPct}% YoY` : ""}</span>} />
              )}
              {c.marketPulse.avgAskingPriceSqFt != null && <Row label="Avg asking price" value={<span className="uv-mono">{formatINRFull(c.marketPulse.avgAskingPriceSqFt)}/sq.ft</span>} />}
              {c.marketPulse.source && <div style={{ fontSize: "0.6875rem", color: "#A0A0AE" }}>Source: {c.marketPulse.source}</div>}
            </div>
          </Section>
        )}

        {/* NEXT STEPS */}
        <Section title="Next steps">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link href="/explore" className="uv-btn uv-btn-primary" style={{ fontSize: "0.8125rem" }}>Explore the map</Link>
            <Link href="/projects" className="uv-btn uv-btn-ghost" style={{ fontSize: "0.8125rem" }}>Browse projects</Link>
            {whatsappOnly ? (
              waLink("AGENT") ? (
                <a href={waLink("AGENT")!} className="uv-btn uv-btn-ghost" style={{ fontSize: "0.8125rem" }}>Talk to an advisor</a>
              ) : (
                <span style={{ fontSize: "0.8125rem", color: "#5A5A66", alignSelf: "center" }}>Reply <strong>AGENT</strong> on WhatsApp to talk to an advisor</span>
              )
            ) : (
              <Link href="/dashboard" className="uv-btn uv-btn-ghost" style={{ fontSize: "0.8125rem" }}>Talk to an advisor</Link>
            )}
          </div>
        </Section>

        {/* Footer */}
        <footer style={{ marginTop: 32, paddingTop: 16, borderTop: "1px solid var(--color-line, #E9E7E1)", fontSize: "0.75rem", color: "#8A8A99", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginLeft: -8 }}>
            {whatsappOnly ? (
              <span style={footLink}>Reply <strong>PAUSE</strong> or <strong>STOP</strong> on WhatsApp anytime</span>
            ) : (
              <>
                <Link href="/dashboard/settings/reports#frequency" style={footLink}>Change frequency</Link>
                <Link href="/dashboard/settings/reports#frequency" style={footLink}>Pause</Link>
              </>
            )}
            {unsubToken ? <Link href={`/api/reports/unsubscribe/${unsubToken}`} style={footLink}>Unsubscribe</Link> : <Link href="/dashboard/settings/reports#frequency" style={footLink}>Unsubscribe</Link>}
          </div>
          <span>Estimates from public data. Not investment advice.</span>
        </footer>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ padding: "20px 0", borderTop: "1px solid var(--color-line, #E9E7E1)", marginTop: 8 }}>
      <h2 style={{ fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#8A8A99", fontWeight: 700, marginBottom: 12 }}>{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ color: "#5A5A66" }}>{label}</span>
      <span style={{ color: "var(--color-ink, #0D0D12)", fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function PropertyCard({ p, nearMiss }: { p: MatchedPropertyView; nearMiss?: boolean }) {
  return (
    <div style={{ border: "1px solid var(--color-line, #E9E7E1)", borderRadius: 14, overflow: "hidden", background: "#fff", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", gap: 12, padding: 12 }}>
        <div style={{ width: 84, height: 72, borderRadius: 10, overflow: "hidden", flexShrink: 0, background: "#F0F0F4" }}>
          {p.thumb ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={p.thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : <div style={{ display: "grid", placeItems: "center", height: "100%", fontSize: 10, color: "#B4B4C0" }}>No photo</div>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: "0.9375rem" }}>{p.title}</span>
            {p.grade && <span style={{ fontSize: "0.625rem", fontWeight: 800, color: "#7A5200", background: "#FFF4D6", borderRadius: 999, padding: "1px 7px" }}>Grade {p.grade}</span>}
          </div>
          <div className="uv-mono" style={{ fontWeight: 700, fontSize: "0.9375rem", marginTop: 4 }}>
            {formatLakh(p.priceLakh)}{p.rateValue ? <span style={{ fontWeight: 400, color: "#8A8A99" }}> ({formatINRFull(p.rateValue)}/{p.rateUnit})</span> : null}
          </div>
          {nearMiss && p.relaxedLabel && <div style={{ fontSize: "0.75rem", color: "#B87A00", marginTop: 4 }}>{p.relaxedLabel}</div>}
          {!nearMiss && p.belowModelPct != null && p.belowModelPct <= -3 && <div style={{ fontSize: "0.75rem", color: "var(--color-growth, #0F9D58)", marginTop: 4 }}>▼ {Math.abs(p.belowModelPct)}% below model range for this area</div>}
          {p.approvalLabel && <div style={{ fontSize: "0.75rem", color: "#5A5A66", marginTop: 2 }}>{p.approvalLabel}</div>}
        </div>
      </div>
      {p.whyMatched.length > 0 && (
        <div style={{ fontSize: "0.75rem", color: "#5A5A66", padding: "0 12px 10px" }}>
          Why this matched: {p.whyMatched.join(" · ")}
        </div>
      )}
      <Link href={p.url} style={{ display: "block", textAlign: "center", padding: "9px", borderTop: "1px solid var(--color-line, #E9E7E1)", fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-saffron-deep, #B87A00)" }}>
        View property →
      </Link>
    </div>
  );
}

function AreaRow({ a }: { a: AreaView }) {
  const up = (n: number | null) => (n == null ? "#8A8A99" : n > 0 ? "var(--color-growth, #0F9D58)" : n < 0 ? "var(--color-alert, #D93B30)" : "#8A8A99");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <div style={{ minWidth: 120, flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: "0.9375rem" }}>{a.name}</div>
        <div style={{ fontSize: "0.75rem", color: "#8A8A99" }}>{a.newListings} new listing{a.newListings === 1 ? "" : "s"}</div>
      </div>
      <Sparkline values={a.spark} />
      <div style={{ textAlign: "right", minWidth: 96 }}>
        <div className="uv-mono" style={{ fontSize: "0.8125rem" }}>
          ⭐{a.score ?? "—"} {a.scoreDelta != null && a.scoreDelta !== 0 ? <span style={{ color: up(a.scoreDelta) }}>{a.scoreDelta > 0 ? "▲+" : "▼"}{Math.abs(a.scoreDelta)}</span> : <span style={{ color: "#8A8A99" }}>—</span>}
        </div>
        {a.priceMidSqYd != null && (
          <div className="uv-mono" style={{ fontSize: "0.75rem", color: "#5A5A66" }}>
            {formatINRFull(a.priceMidSqYd)} {a.pricePct != null && a.pricePct !== 0 ? <span style={{ color: up(a.pricePct) }}>{a.pricePct > 0 ? "▲+" : "▼"}{Math.abs(a.pricePct)}%</span> : ""}
          </div>
        )}
      </div>
    </div>
  );
}

/** Inline SVG sparkline, 120×32, no library. */
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return <div style={{ width: 120, height: 32, flexShrink: 0 }} />;
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * 116 + 2;
    const y = 30 - ((v - min) / range) * 28;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const rising = values[values.length - 1] >= values[0];
  return (
    <svg width={120} height={32} style={{ flexShrink: 0 }} aria-hidden>
      <polyline points={pts} fill="none" stroke={rising ? "#0F9D58" : "#D93B30"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function tidyType(t: string): string {
  return t.split("_").map((w) => w[0] + w.slice(1).toLowerCase()).join(" ");
}
