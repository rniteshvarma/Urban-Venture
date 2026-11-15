/**
 * Homepage sections in the site's own design language:
 *  - section titles are plain SectionHeader (Jakarta 800) + a one-line subtitle, no eyebrow
 *  - small labels and stat captions are mono, uppercase, tracked
 *  - dark bands open with the mono pill used on the Market and Builder heroes
 *  - cards are uv-card (14px radius, hairline border), numbers in uv-mono
 *  - grids use fixed column counts so every row is full on desktop
 * Server components: rendered into the page HTML, no JavaScript shipped.
 * Every figure comes from HomeSectionsData (src/lib/home/sections.ts) or from
 * facts the business has confirmed (src/lib/proof.ts).
 */
import React from "react";
import Link from "next/link";
import {
  ArrowRight, BadgeCheck, Building2, HardHat, Handshake, Home, Landmark, MessageCircle,
  Paintbrush, Route, Scale, ShieldCheck, Star, TrainFront, Users,
} from "lucide-react";
import { SectionHeader } from "@/components/ui";
import NewsCard from "@/components/news/NewsCard";
import { LENSES } from "@/lib/score/lenses";
import { JOURNEY } from "@/lib/buyer/journey";
import { HOW_WE_EARN, publicProof } from "@/lib/proof";
import { whatsappLink } from "@/lib/contact-links";
import { groupIndian } from "@/lib/format";
import { scoreTone } from "@/components/score/TigerScore";
import type { HomeSectionsData } from "@/lib/home/sections";

const WRAP = "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full";
const SECTION: React.CSSProperties = { paddingTop: "4.5rem" };
const n = (x: number) => x.toLocaleString("en-IN");
const range = (a: number | null, b: number | null) => (a && b ? `₹${groupIndian(a)} – ${groupIndian(b)}` : "—");

// Hyderabad photos, Unsplash License (free for commercial use).
const PHOTO_LAKE = "https://images.unsplash.com/photo-1601619933635-023753974a65?auto=format&fit=crop&w=1600&q=72"; // Hyderabad lakeside at night
const PHOTO_SKYLINE = "https://images.unsplash.com/photo-1757225341693-b7b7ee698046?auto=format&fit=crop&w=1400&q=72"; // skyline over a lake, by Guru Ankam

const more = (href: string, label: string) => (
  <Link href={href} className="uv-btn uv-btn-ghost" style={{ padding: "9px 16px", fontSize: "0.8125rem" }}>{label} <ArrowRight size={15} /></Link>
);

const H3: React.CSSProperties = { fontFamily: "var(--font-jakarta)", fontWeight: 700, color: "var(--color-text-hi)" };
/** Mono uppercase caption — the site's label style for stats and table heads. */
const LABEL: React.CSSProperties = { fontFamily: "var(--font-mono), monospace", fontSize: "0.625rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-lo)" };
const iconBox = (size = 42): React.CSSProperties => ({
  flex: "0 0 auto", width: size, height: size, borderRadius: 12, display: "grid", placeItems: "center",
  background: "var(--color-saffron-wash)", color: "var(--color-saffron-deep)",
});

/** The pill that opens dark bands (as on the Market and Builder heroes). */
function DarkPill({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 999, background: "var(--color-ink-soft)", border: "1px solid var(--color-ink-line)", color: "var(--color-saffron)", fontFamily: "var(--font-mono), monospace", fontSize: "0.625rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>
      {children}
    </span>
  );
}

/* ─────────────── Budget tiles ─────────────── */

export function BudgetTiles({ d }: { d: HomeSectionsData }) {
  return (
    <section className={WRAP} style={SECTION}>
      <SectionHeader title="What can I buy for…" subtitle="Live counts of the listings each budget opens, from the same data as the projects page." />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6" style={{ gap: 14 }}>
        {d.budgets.map((b) => (
          <Link key={b.label} href={b.href} className="uv-card uv-card-hover" style={{ padding: "1.1rem 1.1rem 1rem", display: "flex", flexDirection: "column", gap: 10, textDecoration: "none", minHeight: 132 }}>
            <span className="uv-chip uv-chip-saffron" style={{ alignSelf: "flex-start" }}>{b.sub}</span>
            <span style={{ ...H3, fontWeight: 800, fontSize: "1.0625rem", lineHeight: 1.25 }}>{b.label}</span>
            <span style={{ marginTop: "auto", fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-saffron-deep)", display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span className="uv-mono">{n(b.count)}</span> listings <ArrowRight size={13} aria-hidden />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ─────────────── Tiger Score band ─────────────── */

function TigerBand({ d }: { d: HomeSectionsData }) {
  const max = Math.max(...LENSES.map((l) => l.weight));
  return (
    <section style={{ background: "var(--color-ink)", marginTop: "4.5rem", padding: "3.5rem 0" }}>
      <div className={`${WRAP} lg:grid lg:grid-cols-[1fr_1.25fr] lg:gap-14 lg:items-center`}>
        <div>
          <DarkPill>Property Tiger Score</DarkPill>
          <h2 className="uv-h2" style={{ color: "#fff", marginTop: 14 }}>One number out of 10, built from eight lenses.</h2>
          <p style={{ marginTop: 12, color: "var(--color-text-invert-mid)", lineHeight: 1.65, maxWidth: 520 }}>
            Same rules for every listing. A lens with no data is left out, never guessed — so{" "}
            <span className="uv-mono" style={{ color: "#fff" }}>{n(d.counts.scored)}</span> of{" "}
            <span className="uv-mono" style={{ color: "#fff" }}>{n(d.counts.total)}</span> listings have enough facts to be scored today.
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 24, flexWrap: "wrap" }}>
            <Link href="/how-we-score" className="uv-btn uv-btn-primary">How we score <ArrowRight size={16} /></Link>
            <Link href="/projects" className="uv-btn" style={{ padding: "12px 22px", color: "#fff", border: "1px solid var(--color-ink-line)", background: "var(--color-ink-soft)" }}>See scored listings</Link>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 mt-8 lg:mt-0" style={{ gap: 10 }}>
          {LENSES.map((l) => (
            <div key={l.key} style={{ border: "1px solid var(--color-ink-line)", background: "var(--color-ink-soft)", borderRadius: "var(--radius-uv-card)", padding: "14px 14px 12px", display: "flex", flexDirection: "column", minHeight: 104 }}>
              <div style={{ fontWeight: 700, fontSize: "0.9375rem", color: "#fff", lineHeight: 1.3 }}>{l.label}</div>
              <div style={{ marginTop: "auto" }}>
                <div style={{ height: 5, borderRadius: 999, background: "rgba(255,255,255,.12)" }}>
                  <div style={{ width: `${(l.weight / max) * 100}%`, height: "100%", borderRadius: 999, background: "var(--color-saffron)" }} />
                </div>
                <div style={{ ...LABEL, color: "var(--color-text-invert-mid)", marginTop: 7 }}>{l.weight}% of score</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────── Localities ─────────────── */

function Localities({ d }: { d: HomeSectionsData }) {
  if (!d.localities.length) return null;
  return (
    <section className={WRAP} style={SECTION}>
      <SectionHeader title="Where Hyderabad is building" subtitle="Localities with the most projects we track. Tap one to see every listing there." action={more("/explore", "Open the map")} />
      <div className="uv-rail grid sm:grid-cols-2 lg:grid-cols-5" style={{ gap: 16 }}>
        {d.localities.map((l) => (
          <Link key={l.name} href={`/projects?locality=${encodeURIComponent(l.name)}`} className="uv-card uv-card-hover" style={{ overflow: "hidden", textDecoration: "none", display: "flex", flexDirection: "column" }}>
            <div style={{ position: "relative", aspectRatio: "4 / 3", background: "var(--color-saffron-wash)" }}>
              {l.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={l.image} alt={l.project ? `${l.project}, ${l.name}` : l.name} loading="lazy" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <Building2 size={56} strokeWidth={1.2} color="var(--color-saffron-deep)" style={{ position: "absolute", right: 14, top: 14, opacity: 0.35 }} aria-hidden />
              )}
              <div aria-hidden style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(13,13,18,.75) 0%, rgba(13,13,18,0) 55%)" }} />
              <div style={{ position: "absolute", left: 14, right: 14, bottom: 12, color: "#fff" }}>
                <div style={{ fontFamily: "var(--font-jakarta)", fontWeight: 800, fontSize: "1.0625rem", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.name}</div>
                <div style={{ ...LABEL, color: "rgba(255,255,255,.8)", marginTop: 3 }}>{n(l.count)} project{l.count === 1 ? "" : "s"}</div>
              </div>
            </div>
            <div style={{ padding: "9px 14px", fontSize: "0.75rem", color: "var(--color-text-lo)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", borderTop: "1px solid var(--color-line)" }}>
              {l.project ? <>Pictured: <span style={{ color: "var(--color-text-mid)" }}>{l.project}</span></> : "No photo yet"}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ─────────────── Area prices ─────────────── */

const HEAT: Record<string, { label: string; cls: string }> = {
  FIRE: { label: "Hottest", cls: "uv-chip-alert" },
  VERY_HOT: { label: "Very hot", cls: "uv-chip-saffron" },
  HOT: { label: "Hot", cls: "uv-chip-saffron" },
  WARM: { label: "Warm", cls: "uv-chip-caution" },
  EMERGING: { label: "Emerging", cls: "uv-chip-growth" },
  EARLY: { label: "Early", cls: "uv-chip-ghost" },
};

function AreaPrices({ d }: { d: HomeSectionsData }) {
  if (!d.corridors.length) return null;
  const th: React.CSSProperties = { ...LABEL, padding: "13px 20px", textAlign: "left", color: "var(--color-text-mid)" };
  const td: React.CSSProperties = { padding: "14px 20px", verticalAlign: "middle" };
  return (
    <section className={WRAP} style={SECTION}>
      <SectionHeader title="What property costs, area by area" subtitle="Ranges from developer price lists and listings we track. Tap an area for prices, approvals, projects and infrastructure." action={more("/market", "All areas")} />
      <div className="uv-card hidden md:block" style={{ overflow: "hidden", padding: 0 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9375rem", tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "40%" }} />
            <col style={{ width: "19%" }} />
            <col style={{ width: "19%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "10%" }} />
          </colgroup>
          <thead>
            <tr style={{ background: "var(--color-paper)", borderBottom: "1px solid var(--color-line)" }}>
              <th style={th}>Area</th>
              <th style={{ ...th, textAlign: "right" }}>Flats · ₹/sq.ft</th>
              <th style={{ ...th, textAlign: "right" }}>Plots · ₹/sq.yd</th>
              <th style={{ ...th, paddingLeft: 28 }}>Momentum</th>
              <th style={th}><span className="sr-only">Report</span></th>
            </tr>
          </thead>
          <tbody>
            {d.corridors.map((x) => {
              const h = HEAT[x.heatRating] ?? HEAT.EARLY;
              return (
                <tr key={x.slug} style={{ borderTop: "1px solid var(--color-line)" }}>
                  <td style={td}><div style={{ fontWeight: 700, color: "var(--color-text-hi)" }}>{x.name}</div><div style={{ fontSize: "0.75rem", color: "var(--color-text-lo)", marginTop: 2 }}>{x.district}</div></td>
                  <td className="uv-mono" style={{ ...td, textAlign: "right" }}>{range(x.aptPriceMinSqFt, x.aptPriceMaxSqFt)}</td>
                  <td className="uv-mono" style={{ ...td, textAlign: "right" }}>{range(x.plotPriceMinSqYd, x.plotPriceMaxSqYd)}</td>
                  <td style={{ ...td, paddingLeft: 28 }}><span className={`uv-chip ${h.cls}`}>{h.label}</span></td>
                  <td style={{ ...td, textAlign: "right" }}><Link href={`/market/${x.slug}`} style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--color-saffron-deep)", whiteSpace: "nowrap" }}>Report →</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="md:hidden uv-rail" style={{ gap: 12 }}>
        {d.corridors.map((x) => {
          const h = HEAT[x.heatRating] ?? HEAT.EARLY;
          return (
            <Link key={x.slug} href={`/market/${x.slug}`} className="uv-card" style={{ padding: 16, textDecoration: "none" }}>
              <span className={`uv-chip ${h.cls}`}>{h.label}</span>
              <div style={{ ...H3, marginTop: 8 }}>{x.name}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
                <div><div style={LABEL}>Flats ₹/sq.ft</div><div className="uv-mono" style={{ fontSize: "0.8125rem", color: "var(--color-text-hi)", marginTop: 2 }}>{range(x.aptPriceMinSqFt, x.aptPriceMaxSqFt)}</div></div>
                <div><div style={LABEL}>Plots ₹/sq.yd</div><div className="uv-mono" style={{ fontSize: "0.8125rem", color: "var(--color-text-hi)", marginTop: 2 }}>{range(x.plotPriceMinSqYd, x.plotPriceMaxSqYd)}</div></div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/* ─────────────── Services + the 8 steps ─────────────── */

// The services the business offers (confirmed by the owner, Nov 2026).
const SERVICES = [
  { Icon: Users, title: "Accompanied site visits", text: "We plan the visits and go with you, with a checklist of what to look at." },
  { Icon: Handshake, title: "Negotiation and booking", text: "We negotiate price and terms with the builder before you pay anything." },
  { Icon: Landmark, title: "Home loan help", text: "We compare lenders for the home you pick and chase the paperwork." },
  { Icon: Scale, title: "Legal and snag checks", text: "A lawyer reads the title and agreement; an inspector checks the home before handover." },
  { Icon: Paintbrush, title: "Interior designers", text: "Designers we work with, if you want the home done up after the keys." },
];

function Services({ wa }: { wa: string | null }) {
  return (
    <section className={WRAP} style={SECTION}>
      <SectionHeader title="From the first shortlist to the keys" subtitle={HOW_WE_EARN.long} action={more("/buying-help", "How buying help works")} />
      <div className="grid lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.5fr)]" style={{ gap: 20 }}>
        {/* The eight steps, under a Hyderabad photo */}
        <div className="uv-card" style={{ overflow: "hidden", padding: 0, background: "var(--color-ink)", borderColor: "var(--color-ink)", display: "flex", flexDirection: "column" }}>
          <div style={{ position: "relative", flex: "1 1 auto", minHeight: 190 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={PHOTO_SKYLINE} alt="Hyderabad's skyline at night, reflected in a lake" loading="lazy" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 72%" }} />
            <div aria-hidden style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(13,13,18,0) 55%, var(--color-ink) 100%)" }} />
            <span style={{ position: "absolute", right: 10, top: 8, fontSize: "0.625rem", color: "rgba(255,255,255,.65)" }}>Photo: Guru Ankam / Unsplash</span>
          </div>
          <div style={{ padding: "4px 24px 24px" }}>
            <DarkPill>Eight steps · one team</DarkPill>
            <ol style={{ listStyle: "none", padding: 0, margin: "14px 0 0", display: "grid", gap: 8 }}>
              {JOURNEY.map((s) => (
                <li key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.9375rem", color: "#fff" }}>
                  <span className="uv-mono" style={{ width: 24, height: 24, borderRadius: 999, background: "var(--color-saffron)", color: "var(--color-ink)", display: "grid", placeItems: "center", fontSize: "0.75rem", fontWeight: 700, flex: "0 0 auto" }}>{s.n}</span>
                  <span style={{ fontWeight: 600 }}>{s.title}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
        {/* What we do: five services, the sixth cell is the call to action */}
        <div className="grid sm:grid-cols-2" style={{ gap: 14 }}>
          {SERVICES.map(({ Icon, ...s }) => (
            <div key={s.title} className="uv-card" style={{ padding: 18, display: "flex", gap: 14 }}>
              <span style={iconBox(40)}><Icon size={19} aria-hidden /></span>
              <div>
                <h3 style={{ ...H3, fontSize: "1rem" }}>{s.title}</h3>
                <p style={{ fontSize: "0.875rem", color: "var(--color-text-mid)", marginTop: 4, lineHeight: 1.55 }}>{s.text}</p>
              </div>
            </div>
          ))}
          <div className="uv-card" style={{ padding: 18, display: "flex", flexDirection: "column", justifyContent: "center", gap: 12, background: "var(--color-saffron-wash)", borderColor: "#F3DFA8" }}>
            <div>
              <h3 style={{ ...H3, fontSize: "1rem" }}>Free for buyers</h3>
              <p style={{ fontSize: "0.875rem", color: "var(--color-text-mid)", marginTop: 4, lineHeight: 1.55 }}>Tell us what you&apos;re looking for and we&apos;ll take it from there.</p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Link href="/buying-help" className="uv-btn uv-btn-primary" style={{ padding: "10px 18px", fontSize: "0.875rem" }}>Get free buying help <ArrowRight size={15} /></Link>
              {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="uv-btn uv-btn-ghost" style={{ padding: "10px 16px", fontSize: "0.875rem" }}><MessageCircle size={15} /> WhatsApp</a>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────── Builders ─────────────── */

function Builders({ d }: { d: HomeSectionsData }) {
  if (!d.builders.length) return null;
  return (
    <section className={WRAP} style={SECTION}>
      <SectionHeader title="How Hyderabad's builders deliver" subtitle="From TG-RERA certificates and orders: projects, completions and delays, for every builder we track." action={more("/developers", `All ${n(d.counts.builders)} builders`)} />
      <div className="uv-rail grid sm:grid-cols-2 lg:grid-cols-3" style={{ gap: 16 }}>
        {d.builders.map((b) => {
          const tone = b.avgScore != null ? scoreTone(b.avgScore) : null;
          return (
            <Link key={b.slug} href={`/developers/${b.slug}`} className="uv-card uv-card-hover" style={{ padding: 18, textDecoration: "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 44, height: 44, borderRadius: 12, background: "var(--color-ink)", color: "var(--color-saffron)", display: "grid", placeItems: "center", fontFamily: "var(--font-jakarta)", fontWeight: 800, flex: "0 0 auto" }}>{b.name[0]}</span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ ...H3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.name}</div>
                  <div style={{ ...LABEL, marginTop: 3 }}>{b.established ? `Since ${b.established}` : "TG-RERA record"}</div>
                </div>
                {tone && (
                  <span title="Average Property Tiger Score of this builder's listings" style={{ background: tone.bg, color: tone.fg, borderRadius: 999, padding: "3px 9px", fontWeight: 800, fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                    {b.avgScore!.toFixed(1)} avg
                  </span>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 14, textAlign: "center" }}>
                {[
                  { v: b.projects, l: "Projects" },
                  { v: b.completed, l: "Completed" },
                  { v: b.delays, l: "Delays", warn: b.delays > 0 },
                ].map((s) => (
                  <div key={s.l} style={{ background: "var(--color-paper)", border: "1px solid var(--color-line)", borderRadius: 10, padding: "9px 4px" }}>
                    <div className="uv-mono" style={{ fontWeight: 600, fontSize: "1.125rem", color: s.warn ? "var(--color-alert)" : "var(--color-text-hi)" }}>{s.v}</div>
                    <div style={{ ...LABEL, marginTop: 2 }}>{s.l}</div>
                  </div>
                ))}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/* ─────────────── Government projects ─────────────── */

const INFRA_STATUS: Record<string, { label: string; cls: string }> = {
  ANNOUNCED: { label: "Announced", cls: "uv-chip-ghost" },
  APPROVED: { label: "Approved", cls: "uv-chip-saffron" },
  LAND_ACQUISITION: { label: "Land being acquired", cls: "uv-chip-saffron" },
  UNDER_CONSTRUCTION: { label: "Being built", cls: "uv-chip-growth" },
  PARTIALLY_COMPLETE: { label: "Partly open", cls: "uv-chip-growth" },
  COMPLETE: { label: "Open", cls: "uv-chip-growth" },
  DELAYED: { label: "Delayed", cls: "uv-chip-caution" },
};
const INFRA_ICON: Record<string, typeof Route> = { METRO_RAIL: TrainFront, ROAD_HIGHWAY: Route, AIRPORT_AVIATION: Landmark };

function Infra({ d }: { d: HomeSectionsData }) {
  if (!d.infra.length) return null;
  return (
    <section className={WRAP} style={SECTION}>
      <SectionHeader title="Government projects changing the map" subtitle="Metro, roads and more, each from the authority that announced it." action={more("/explore", `All ${n(d.counts.infra)} projects`)} />
      <div className="uv-rail grid sm:grid-cols-2 lg:grid-cols-3" style={{ gap: 16 }}>
        {d.infra.map((i) => {
          const Icon = INFRA_ICON[i.category] ?? HardHat;
          const st = INFRA_STATUS[i.status] ?? { label: i.status, cls: "uv-chip-ghost" };
          return (
            <div key={i.id} className="uv-card" style={{ padding: 18, display: "flex", gap: 14 }}>
              <span style={iconBox()}><Icon size={20} aria-hidden /></span>
              <div style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
                <h3 style={{ ...H3, fontSize: "1rem", lineHeight: 1.3 }}>{i.shortName || i.name}</h3>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                  <span className={`uv-chip ${st.cls}`}>{st.label}</span>
                  {i.estimatedCompletion && <span className="uv-chip uv-chip-ghost">Target {i.estimatedCompletion}</span>}
                </div>
                {i.sourceAuthority && (
                  i.sourceUrl
                    ? <a href={i.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.75rem", color: "var(--color-text-lo)", marginTop: 10, textDecoration: "underline", textUnderlineOffset: 3 }}>Source: {i.sourceAuthority}</a>
                    : <div style={{ fontSize: "0.75rem", color: "var(--color-text-lo)", marginTop: 10 }}>Source: {i.sourceAuthority}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ─────────────── News ─────────────── */

function News({ d }: { d: HomeSectionsData }) {
  if (!d.news.length) return null;
  const chips = new Map(d.newsChips.map((c) => [c.slug, c]));
  return (
    <section className={WRAP} style={SECTION}>
      <SectionHeader title="Hyderabad property news" subtitle="The latest stories from Hyderabad's papers, with the source and a link to the original." action={more("/news", "All news")} />
      <div className="uv-rail grid md:grid-cols-3" style={{ gap: 18 }}>
        {d.news.map((a) => (
          <NewsCard key={a.id} article={a} corridors={a.corridorSlugs.map((s) => chips.get(s)).filter((c): c is NonNullable<typeof c> => !!c)} />
        ))}
      </div>
    </section>
  );
}

/* ─────────────── Why trust us + FAQ ─────────────── */

function TrustAndFaq() {
  const proof = publicProof();
  const FAQ = [
    { q: "Do I pay Property Tiger anything?", a: HOW_WE_EARN.long },
    { q: "Can a builder pay for a better score or a higher spot?", a: `${HOW_WE_EARN.noPaidPlacements} Listings are ordered by Tiger Score, highest first.` },
    { q: "How is the Tiger Score worked out?", a: `Each listing is rated 0–10 across eight lenses: ${LENSES.map((l) => l.label.toLowerCase()).join(", ")}. A lens with no data is left out, never guessed, and a listing needs at least five measured lenses to get a score. Listings without TG-RERA registration are capped at 5.` },
    { q: "Which areas do you cover?", a: "Hyderabad only: the city, its growth corridors and land within reach of the Regional Ring Road." },
    { q: "Where do the prices come from?", a: "Developer price lists and the listings we track, each with the date we last checked it. Area ranges link to their full report." },
  ];
  const points: { Icon: typeof BadgeCheck; text: React.ReactNode }[] = [
    { Icon: BadgeCheck, text: HOW_WE_EARN.noPaidPlacements },
    { Icon: Home, text: "Every listing shows its TG-RERA number where it has one, and the date we last checked its price." },
    ...(proof.reraAgentNumber ? [{ Icon: ShieldCheck, text: <>TG-RERA registered agent · <strong className="uv-mono">{proof.reraAgentNumber}</strong></> }] : []),
    ...(proof.google ? [{ Icon: Star, text: <>{proof.google.rating} on Google from {n(proof.google.reviews)} reviews{proof.google.url && <> · <a href={proof.google.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>read them</a></>}</> }] : []),
  ];
  return (
    <section className={WRAP} style={SECTION}>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]" style={{ gap: 40 }}>
        <div>
          <SectionHeader title="Facts first, and we say how we're paid" />
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
            {points.map(({ Icon, text }, i) => (
              <li key={i} className="uv-card" style={{ display: "flex", gap: 12, padding: "14px 16px", color: "var(--color-text-hi)", lineHeight: 1.55, fontSize: "0.9375rem" }}>
                <Icon size={20} color="var(--color-growth)" aria-hidden style={{ flex: "0 0 auto", marginTop: 1 }} /><span>{text}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <SectionHeader title="Questions buyers ask" />
          <div style={{ display: "grid", gap: 10 }}>
            {FAQ.map((f) => (
              <details key={f.q} className="uv-card uv-faq">
                <summary>{f.q}</summary>
                <p style={{ padding: "0 20px 18px", margin: 0, color: "var(--color-text-mid)", lineHeight: 1.65 }}>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────── Closing call to action ─────────────── */

function ClosingCta() {
  return (
    <section className={WRAP} style={{ ...SECTION, paddingBottom: "5rem" }}>
      <div style={{ position: "relative", overflow: "hidden", borderRadius: "var(--radius-uv-card)", background: "var(--color-ink)", color: "#fff" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={PHOTO_LAKE} alt="" aria-hidden loading="lazy" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 60%", opacity: 0.7 }} />
        <div aria-hidden style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(13,13,18,.92) 0%, rgba(13,13,18,.6) 55%, rgba(13,13,18,.2) 100%)" }} />
        <div style={{ position: "relative", padding: "clamp(28px, 5vw, 48px)", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 22 }}>
          <div style={{ maxWidth: 620 }}>
            <DarkPill>Free for buyers</DarkPill>
            <h2 className="uv-h2" style={{ color: "#fff", marginTop: 14 }}>Not sure where to start?</h2>
            <p style={{ marginTop: 8, color: "var(--color-text-invert-mid)", lineHeight: 1.6 }}>Tell us your budget and the areas you like. We&apos;ll come back with a shortlist.</p>
          </div>
          <Link href="/buying-help" className="uv-btn uv-btn-primary" style={{ padding: "14px 26px" }}>Talk to our team <ArrowRight size={16} /></Link>
        </div>
      </div>
    </section>
  );
}

/** Everything below the featured projects, in reading order. */
export function MoreSections({ d }: { d: HomeSectionsData }) {
  const wa = whatsappLink("Hi Property Tiger, I'm looking for property in Hyderabad.");
  return (
    <>
      <TigerBand d={d} />
      <Localities d={d} />
      <AreaPrices d={d} />
      <Services wa={wa} />
      <Builders d={d} />
      <Infra d={d} />
      <News d={d} />
      <TrustAndFaq />
      <ClosingCta />
    </>
  );
}
