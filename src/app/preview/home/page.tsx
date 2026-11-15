import Link from "next/link";
import { ArrowRight, BadgeCheck, Bell, Building2, CalendarCheck, GitCompare, HardHat, Landmark, MapPinned, Route, Search, ShieldCheck, TrainFront, Trees } from "lucide-react";
import { loadHome } from "@/lib/home/v3-data";
import { DUTY } from "@/lib/buyer/costs";
import { groupIndian } from "@/lib/format";
import V3Header from "@/components/home-v3/V3Header";
import HeroSearch from "@/components/home-v3/HeroSearch";
import PicksRail from "@/components/home-v3/PicksRail";
import CostTeaser from "@/components/home-v3/CostTeaser";
import Skyline from "@/components/home-v3/Skyline";
import { Wordmark } from "@/components/ui";

export const dynamic = "force-dynamic";

const n = (x: number) => x.toLocaleString("en-IN");

const HEAT: Record<string, { label: string; cls: string }> = {
  FIRE: { label: "Hottest", cls: "v3-chip-red" },
  VERY_HOT: { label: "Very hot", cls: "v3-chip-red" },
  HOT: { label: "Hot", cls: "v3-chip-orange" },
  WARM: { label: "Warm", cls: "v3-chip-orange" },
  EMERGING: { label: "Emerging", cls: "v3-chip-green" },
  EARLY: { label: "Early", cls: "v3-chip-line" },
};
const INFRA_STATUS: Record<string, { label: string; cls: string }> = {
  ANNOUNCED: { label: "Announced", cls: "v3-chip-line" },
  APPROVED: { label: "Approved", cls: "v3-chip-orange" },
  UNDER_CONSTRUCTION: { label: "Being built", cls: "v3-chip-green" },
  PARTIALLY_COMPLETE: { label: "Partly open", cls: "v3-chip-green" },
  COMPLETED: { label: "Open", cls: "v3-chip-green" },
};
const INFRA_ICON: Record<string, typeof Route> = { METRO_RAIL: TrainFront, ROAD_HIGHWAY: Route, AIRPORT_AVIATION: Landmark };

const range = (a: number | null, b: number | null) => (a && b ? `₹${groupIndian(a)} – ${groupIndian(b)}` : "—");

function SectionHead({ eyebrow, title, sub, action }: { eyebrow: string; title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 22, flexWrap: "wrap" }}>
      <div style={{ maxWidth: 680 }}>
        <div className="v3-eyebrow">{eyebrow}</div>
        <h2 className="v3-h2" style={{ marginTop: 6 }}>{title}</h2>
        {sub && <p className="v3-sub" style={{ marginTop: 8 }}>{sub}</p>}
      </div>
      {action}
    </div>
  );
}

const linkMore = (href: string, label: string) => (
  <Link href={href} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: "0.9375rem", color: "var(--v3-accent-text)" }}>
    {label} <ArrowRight size={16} aria-hidden />
  </Link>
);

export default async function HomeV3() {
  const d = await loadHome();
  const c = d.counts;
  const areaOptions = d.corridors.map((x) => ({ slug: x.slug, name: x.name }));
  const metro = d.infra.find((i) => /metro/i.test(i.name) && i.status === "APPROVED");

  return (
    <div className="v3">
      <V3Header />
      <main>
        {/* ── Hero: search first ── */}
        <section className="v3-dark" style={{ position: "relative", overflow: "hidden", paddingTop: 36, paddingBottom: 76 }}>
          <div aria-hidden style={{ position: "absolute", inset: 0, background: "radial-gradient(55% 75% at 88% 20%, rgba(255,180,0,.20) 0%, rgba(255,180,0,0) 60%), radial-gradient(40% 50% at 0% 100%, rgba(255,180,0,.08) 0%, rgba(255,180,0,0) 70%)" }} />
          <div className="v3-wrap" style={{ position: "relative" }}>
            <div className="lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-12 lg:items-center">
              <div style={{ minWidth: 0 }}>
                <span className="v3-chip" style={{ fontSize: "0.8125rem", padding: "6px 12px", background: "rgba(255,180,0,.12)", color: "var(--v3-accent)", border: "1px solid rgba(255,180,0,.3)" }}>
                  <ShieldCheck size={15} aria-hidden /> {n(c.total)} Hyderabad listings, each with its source
                </span>
                <h1 style={{ fontSize: "clamp(2.1rem, 4.6vw, 3.25rem)", fontWeight: 800, lineHeight: 1.05, marginTop: 16 }}>
                  Hyderabad property, <span style={{ color: "var(--v3-accent)" }}>checked</span> before you pay.
                </h1>
                <p className="v3-sub" style={{ fontSize: "clamp(1rem, 1.6vw, 1.125rem)", marginTop: 14, maxWidth: 560 }}>
                  Flats with their TG-RERA numbers, every builder&apos;s delivery record, land near the new Regional Ring Road — and the date we last checked each price.
                </p>
                <div style={{ marginTop: 22 }}>
                  <HeroSearch localities={d.localities} areas={areaOptions} />
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 14 }}>
                  <span style={{ fontSize: "0.8125rem", color: "var(--v3-on-night-mid)", fontWeight: 600 }}>Popular:</span>
                  {d.localities.slice(0, 7).map((l) => (
                    <Link key={l.name} href={`/projects?locality=${encodeURIComponent(l.name)}`} className="v3-chip v3-chip-night" style={{ fontSize: "0.8125rem", padding: "7px 12px" }}>
                      {l.name} <span style={{ color: "var(--v3-on-night-mid)", fontWeight: 500 }}>{l.count}</span>
                    </Link>
                  ))}
                </div>
              </div>
              <div className="hidden lg:block" style={{ position: "relative" }}>
                <Skyline style={{ width: "100%", height: "auto", display: "block", filter: "drop-shadow(0 24px 48px rgba(0,0,0,.45))" }} />
                <div className="v3-card" style={{ position: "absolute", left: -22, top: 34, padding: "10px 14px", display: "flex", gap: 10, alignItems: "center" }}>
                  <BadgeCheck size={22} color="var(--v3-green)" aria-hidden />
                  <div><div style={{ fontWeight: 800 }}>{n(c.rera)} RERA projects</div><div style={{ fontSize: "0.75rem", color: "var(--v3-lo)" }}>registration number on every one</div></div>
                </div>
                {metro && (
                  <div className="v3-card" style={{ position: "absolute", right: -14, top: 150, padding: "10px 14px", display: "flex", gap: 10, alignItems: "center", maxWidth: 250 }}>
                    <TrainFront size={22} color="var(--v3-accent-text)" aria-hidden />
                    <div><div style={{ fontWeight: 800, fontSize: "0.875rem" }}>{metro.shortName || "Metro Phase II"}</div><div style={{ fontSize: "0.75rem", color: "var(--v3-lo)" }}>Approved · {metro.sourceAuthority}</div></div>
                  </div>
                )}
                <div className="v3-card" style={{ position: "absolute", left: 30, bottom: -16, padding: "10px 14px", display: "flex", gap: 10, alignItems: "center" }}>
                  <Trees size={22} color="var(--v3-green)" aria-hidden />
                  <div><div style={{ fontWeight: 800 }}>{n(c.land)} land listings</div><div style={{ fontSize: "0.75rem", color: "var(--v3-lo)" }}>within 20 km of the RRR</div></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Proof strip ── */}
        <section className="v3-wrap" style={{ marginTop: -40, position: "relative" }}>
          <div className="v3-card" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", padding: "8px 4px" }}>
            {[
              { v: n(c.rera), l: "RERA-registered projects", href: "/projects?type=Apartment" },
              { v: n(c.builders), l: "builders' delivery records", href: "/developers" },
              { v: n(c.land), l: "verified land listings", href: "/projects?type=Land" },
              { v: n(c.infra), l: "govt projects tracked", href: "/explore" },
              { v: n(c.corridors), l: "growth areas priced", href: "/market" },
            ].map((s) => (
              <Link key={s.l} href={s.href} style={{ padding: "14px 16px", borderRight: "1px solid var(--v3-line)" }}>
                <div className="v3-display" style={{ fontSize: "1.75rem", fontWeight: 800 }}>{s.v}</div>
                <div style={{ fontSize: "0.8125rem", color: "var(--v3-mid)" }}>{s.l}</div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Budget first ── */}
        <section className="v3-wrap v3-section">
          <SectionHead eyebrow="Start with your budget" title="What can I buy for…" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
            {d.budgets.map((b, i) => (
              <Link key={b.label} href={b.href} className="v3-card v3-lift" style={{ padding: "16px 16px 14px", display: "flex", flexDirection: "column", gap: 2, background: i >= 3 ? "linear-gradient(160deg, #eef7f1, #fff)" : "linear-gradient(160deg, var(--v3-accent-wash), #fff)" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--v3-lo)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{b.sub}</span>
                <span className="v3-display" style={{ fontWeight: 800, fontSize: "1.125rem" }}>{b.label}</span>
                <span style={{ marginTop: 8, fontSize: "0.8125rem", color: "var(--v3-accent-text)", fontWeight: 700 }}>{n(b.count)} listings →</span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Picks ── */}
        <section className="v3-wrap v3-section">
          <SectionHead eyebrow="Hand-picked from the data" title="Homes and plots worth a look" sub="Rated on legal status, the builder's record, location, delivery, planning and price. Grades are ours; the facts behind them link to their sources." />
          <PicksRail
            tabs={[
              { id: "top", label: "Top rated", href: "/projects", cards: d.picks.topRated },
              { id: "ready", label: "Ready to move", href: "/projects?type=Apartment", cards: d.picks.ready },
              { id: "1cr", label: "Under ₹1 Cr", href: "/projects?type=Apartment&budget=60-120L", cards: d.picks.under1Cr },
              { id: "plots", label: "Open plots", href: "/projects?type=Plots", cards: d.picks.plots },
              { id: "land", label: "Farm land", href: "/projects?type=Land", cards: d.picks.land },
            ]}
          />
        </section>

        {/* ── Area prices ── */}
        <section className="v3-wrap v3-section">
          <SectionHead
            eyebrow="Price check"
            title="What property costs, area by area"
            sub="Ranges from developer price lists and listings we track. Tap an area for its full report: prices, approvals, projects and infrastructure."
            action={linkMore("/market", "All areas")}
          />
          <div className="v3-card hidden md:block" style={{ overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9375rem" }}>
              <thead>
                <tr style={{ background: "var(--v3-sand)", textAlign: "left", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--v3-lo)" }}>
                  <th style={{ padding: "12px 18px" }}>Area</th>
                  <th style={{ padding: "12px 18px" }}>Flats, ₹ / sq.ft</th>
                  <th style={{ padding: "12px 18px" }}>Plots, ₹ / sq.yd</th>
                  <th style={{ padding: "12px 18px" }}>Momentum</th>
                  <th style={{ padding: "12px 18px" }} />
                </tr>
              </thead>
              <tbody>
                {d.corridors.slice(0, 8).map((x) => {
                  const h = HEAT[x.heatRating] ?? HEAT.EARLY;
                  return (
                    <tr key={x.slug} style={{ borderTop: "1px solid var(--v3-line)" }}>
                      <td style={{ padding: "13px 18px" }}><div style={{ fontWeight: 700 }}>{x.name}</div><div style={{ fontSize: "0.75rem", color: "var(--v3-lo)" }}>{x.district}</div></td>
                      <td className="v3-mono" style={{ padding: "13px 18px" }}>{range(x.aptPriceMinSqFt, x.aptPriceMaxSqFt)}</td>
                      <td className="v3-mono" style={{ padding: "13px 18px" }}>{range(x.plotPriceMinSqYd, x.plotPriceMaxSqYd)}</td>
                      <td style={{ padding: "13px 18px" }}><span className={`v3-chip ${h.cls}`}>{h.label}{x.overallScore != null ? ` · ${x.overallScore}` : ""}</span></td>
                      <td style={{ padding: "13px 18px", textAlign: "right" }}><Link href={`/market/${x.slug}`} style={{ fontWeight: 700, color: "var(--v3-accent-text)" }}>Report →</Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="md:hidden v3-scroller">
            {d.corridors.slice(0, 8).map((x) => {
              const h = HEAT[x.heatRating] ?? HEAT.EARLY;
              return (
                <Link key={x.slug} href={`/market/${x.slug}`} className="v3-card" style={{ width: 250, padding: 16 }}>
                  <span className={`v3-chip ${h.cls}`}>{h.label}</span>
                  <div style={{ fontWeight: 800, marginTop: 8 }}>{x.name}</div>
                  {x.aptPriceMinSqFt && x.aptPriceMaxSqFt ? <div style={{ fontSize: "0.8125rem", color: "var(--v3-mid)", marginTop: 8 }}>Flats <span className="v3-mono" style={{ color: "var(--v3-ink)" }}>{range(x.aptPriceMinSqFt, x.aptPriceMaxSqFt)}</span> /sq.ft</div> : null}
                  {x.plotPriceMinSqYd && x.plotPriceMaxSqYd ? <div style={{ fontSize: "0.8125rem", color: "var(--v3-mid)" }}>Plots <span className="v3-mono" style={{ color: "var(--v3-ink)" }}>{range(x.plotPriceMinSqYd, x.plotPriceMaxSqYd)}</span> /sq.yd</div> : null}
                </Link>
              );
            })}
          </div>
        </section>

        {/* ── Infrastructure ── */}
        <section className="v3-wrap v3-section">
          <SectionHead
            eyebrow="Prices follow the roads"
            title="Where the new metro and roads are going"
            sub="Government projects we track, with the authority behind each and where it stands today. Status changes are checked against official sources."
            action={linkMore("/explore", "See them on the map")}
          />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 12 }}>
            {d.infra.map((i) => {
              const s = INFRA_STATUS[i.status] ?? INFRA_STATUS.ANNOUNCED;
              const Icon = INFRA_ICON[i.category] ?? Landmark;
              return (
                <div key={i.id} className="v3-card" style={{ padding: 16, display: "flex", gap: 12 }}>
                  <span style={{ width: 40, height: 40, borderRadius: 12, background: "var(--v3-accent-wash)", display: "grid", placeItems: "center", flexShrink: 0 }}><Icon size={20} color="var(--v3-accent-text)" aria-hidden /></span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, lineHeight: 1.3 }}>{i.name}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginTop: 8 }}>
                      <span className={`v3-chip ${s.cls}`}>{s.label}</span>
                      {i.sourceAuthority && <span style={{ fontSize: "0.75rem", color: "var(--v3-lo)" }}>{i.sourceAuthority}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Builders ── */}
        <section className="v3-wrap v3-section">
          <SectionHead
            eyebrow="Check the builder, not the brochure"
            title="Does your builder deliver?"
            sub="Projects finished, still being built, delays against the TG-RERA completion date, and orders from the regulator — for every developer in our listings."
          />
          <div className="v3-card" style={{ padding: 16 }}>
            <form action="/developers" style={{ display: "flex", gap: 10 }}>
              <div style={{ position: "relative", flex: 1 }}>
                <Search size={17} aria-hidden style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--v3-lo)" }} />
                <input name="q" className="v3-input" style={{ paddingLeft: 38 }} placeholder="Type a builder's name" aria-label="Builder name" />
              </div>
              <button className="v3-btn v3-btn-dark" type="submit">Check</button>
            </form>
            <div style={{ overflowX: "auto", marginTop: 14 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem", minWidth: 560 }}>
                <thead>
                  <tr style={{ textAlign: "left", fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--v3-lo)" }}>
                    <th style={{ padding: "8px 10px" }}>Builder</th>
                    <th style={{ padding: "8px 10px" }}>Projects</th>
                    <th style={{ padding: "8px 10px" }}>Completed</th>
                    <th style={{ padding: "8px 10px" }}>Being built</th>
                    <th style={{ padding: "8px 10px" }}>Delays</th>
                    <th style={{ padding: "8px 10px" }}>RERA orders</th>
                  </tr>
                </thead>
                <tbody>
                  {d.builders.map((b) => (
                    <tr key={b.slug} style={{ borderTop: "1px solid var(--v3-line)" }}>
                      <td style={{ padding: "10px" }}><Link href={`/developers/${b.slug}`} style={{ fontWeight: 700 }}>{b.name}</Link>{b.established ? <span style={{ color: "var(--v3-lo)", fontSize: "0.75rem" }}> · since {b.established}</span> : null}</td>
                      <td className="v3-mono" style={{ padding: "10px" }}>{b.projects}</td>
                      <td className="v3-mono" style={{ padding: "10px" }}>{b.completed}</td>
                      <td className="v3-mono" style={{ padding: "10px" }}>{b.underConstruction}</td>
                      <td style={{ padding: "10px" }}>{b.delays ? <span className="v3-chip v3-chip-red">{b.delays}</span> : <span className="v3-chip v3-chip-green">None found</span>}</td>
                      <td style={{ padding: "10px" }}>{b.orders ? <span className="v3-chip v3-chip-amber">{b.orders}</span> : <span style={{ color: "var(--v3-lo)" }}>0</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 10 }}>{linkMore("/developers", `All ${n(c.builders)} builders`)}</div>
          </div>
        </section>

        {/* ── The real cost ── */}
        <section className="v3-section">
          <div className="v3-dark" style={{ padding: "48px 0" }}>
            <div className="v3-wrap"><CostTeaser /></div>
          </div>
        </section>

        {/* ── Not sure where? ── */}
        <section className="v3-wrap v3-section">
          <div style={{ display: "grid", gap: 16 }} className="grid-cols-1 md:grid-cols-[1.4fr_1fr]">
            <div className="v3-card" style={{ padding: "28px 24px", background: "linear-gradient(135deg, var(--v3-accent-wash) 0%, #fff 70%)" }}>
              <div className="v3-eyebrow">Free, in under a minute</div>
              <h2 className="v3-h2" style={{ marginTop: 6 }}>Not sure which area? Get a shortlist.</h2>
              <p className="v3-sub" style={{ marginTop: 8, maxWidth: 520 }}>Tell us your budget and how long you plan to hold. We match you to areas by their prices, infrastructure timing and builder records — and show the projects that fit.</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 }}>
                <Link href="/research" className="v3-btn v3-btn-primary">Get my shortlist <ArrowRight size={17} aria-hidden /></Link>
                <Link href="/market/compare" className="v3-btn v3-btn-ghost">Compare two areas</Link>
              </div>
            </div>
            <div className="v3-card" style={{ padding: "24px" }}>
              <div className="v3-eyebrow" style={{ color: "var(--v3-green)" }}>Buying from abroad?</div>
              <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0", display: "grid", gap: 12, fontSize: "0.9375rem" }}>
                <li style={{ display: "flex", gap: 10 }}><CalendarCheck size={19} color="var(--v3-green)" aria-hidden style={{ flexShrink: 0 }} /> Book a site visit for family in Hyderabad</li>
                <li style={{ display: "flex", gap: 10 }}><BadgeCheck size={19} color="var(--v3-green)" aria-hidden style={{ flexShrink: 0 }} /> Read the TG-RERA record before you send money</li>
                <li style={{ display: "flex", gap: 10 }}><HardHat size={19} color="var(--v3-green)" aria-hidden style={{ flexShrink: 0 }} /> See the builder&apos;s delays and regulator orders</li>
                <li style={{ display: "flex", gap: 10 }}><MapPinned size={19} color="var(--v3-green)" aria-hidden style={{ flexShrink: 0 }} /> Check the land on the map, next to planned roads</li>
              </ul>
              <Link href="/market/legal" style={{ display: "inline-flex", marginTop: 16, fontWeight: 700, color: "var(--v3-green)" }}>Buyer&apos;s legal checklist →</Link>
            </div>
          </div>
        </section>

        {/* ── On your phone (the app showcase, moved here from the hero) ── */}
        <section className="v3-wrap v3-section">
          <div className="v3-card" style={{ overflow: "hidden", display: "grid", alignItems: "center", background: "linear-gradient(120deg, var(--v3-night) 0%, var(--v3-night-soft) 100%)", color: "#fff", border: "1px solid var(--v3-night-line)" }} data-app>
            <div className="md:grid md:grid-cols-[1.2fr_1fr] md:items-center">
              <div style={{ padding: "32px 24px" }}>
                <div className="v3-eyebrow" style={{ color: "var(--v3-accent)" }}>Your shortlist, on your phone</div>
                <h2 className="v3-h2" style={{ marginTop: 6 }}>Hear about it first when a price drops.</h2>
                <ul style={{ listStyle: "none", padding: 0, margin: "18px 0 0", display: "grid", gap: 14 }}>
                  {[
                    { I: Bell, t: "Saved searches", s: "A daily email when a new listing matches." },
                    { I: Building2, t: "Price-change alerts", s: "On every home you've saved." },
                    { I: GitCompare, t: "Compare side by side", s: "Up to four homes: price, rating, builder record." },
                    { I: CalendarCheck, t: "Book site visits", s: "Pick a day and slot; we confirm." },
                  ].map(({ I, t, s }) => (
                    <li key={t} style={{ display: "flex", gap: 12 }}>
                      <span style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,180,0,.16)", display: "grid", placeItems: "center", flexShrink: 0 }}><I size={18} color="var(--v3-accent)" aria-hidden /></span>
                      <div><div style={{ fontWeight: 700 }}>{t}</div><div style={{ fontSize: "0.875rem", color: "rgba(255,255,255,.7)" }}>{s}</div></div>
                    </li>
                  ))}
                </ul>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 22 }}>
                  <Link href="/signup" className="v3-btn v3-btn-primary">Create a free account</Link>
                  <Link href="/login" className="v3-btn v3-btn-outline-light">Log in</Link>
                </div>
              </div>
              <div style={{ position: "relative", display: "flex", justifyContent: "center", alignItems: "flex-end", minHeight: 300, paddingTop: 12 }}>
                <div aria-hidden style={{ position: "absolute", width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,180,0,.35), rgba(255,180,0,0) 70%)", bottom: 20 }} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/hero-app-mockup.png" alt="Property Tiger on a phone: a listing with its score, price and checks" style={{ position: "relative", width: 230, height: "auto", marginBottom: -70 }} />
              </div>
            </div>
          </div>
        </section>

        {/* ── News ── */}
        {d.news.length > 0 && (
          <section className="v3-wrap v3-section">
            <SectionHead eyebrow="Market signals" title="This week in Hyderabad real estate" action={linkMore("/news", "All news")} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
              {d.news.map((a) => (
                <a key={a.id} href={a.canonicalUrl} target="_blank" rel="noopener noreferrer" className="v3-card v3-lift" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--v3-lo)", fontWeight: 600 }}>{a.sourceName} · {a.publishedAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" })}</span>
                  <span style={{ fontWeight: 700, lineHeight: 1.35 }}>{a.headline}</span>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* ── FAQ ── */}
        <section className="v3-wrap v3-section" style={{ paddingBottom: 72 }}>
          <div style={{ display: "grid", gap: 24 }} className="grid-cols-1 md:grid-cols-[1fr_1.6fr]">
            <div>
              <div className="v3-eyebrow">Straight answers</div>
              <h2 className="v3-h2" style={{ marginTop: 6 }}>Questions buyers ask us</h2>
            </div>
            <div className="v3-faq">
              {[
                { q: "Where do your prices come from?", a: `From developers' price lists published on property sites, TG-RERA records and verified land listings — ${n(c.total)} listings in all. Each listing names its source and shows the date we last checked it.` },
                { q: "Why does a TG-RERA number matter?", a: "Projects on more than 500 sq.m of land, or with more than eight flats, must register with TG-RERA before selling. The registration records the approved plan and the promised completion date, and lets buyers complain to the regulator if the builder slips." },
                { q: "Are the land listings RERA projects?", a: "No. They are individual sales, so RERA doesn't cover them. Check the title on Bhu Bharati, take an encumbrance certificate and confirm the land-use (NALA) conversion before paying anything." },
                { q: "What will I pay on top of the price?", a: `In Telangana, ${DUTY.stampPct}% stamp duty, ${DUTY.transferPct}% transfer duty and ${DUTY.registrationPct}% registration — 7.5% in all — plus 5% GST on an under-construction home (1% for affordable housing). Ready homes with an occupancy certificate carry no GST.` },
                { q: "What is the Regional Ring Road?", a: "A new ring road planned well beyond the Outer Ring Road. Its northern part is approved and its southern part announced; land near its interchanges is where many buyers are looking. Our land listings are all within 20 km of it." },
              ].map((f, i) => (
                <details key={f.q} open={i === 0}>
                  <summary><span>{f.q}</span><span aria-hidden style={{ fontSize: "1.375rem", lineHeight: 1, color: "var(--v3-accent)", transition: "transform 150ms" }}>+</span></summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="v3-dark" style={{ color: "var(--v3-on-night-mid)", padding: "48px 0 32px" }}>
        <div className="v3-wrap" style={{ display: "grid", gap: 28, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
          <div style={{ gridColumn: "span 2", minWidth: 0 }}>
            <Wordmark style={{ color: "#fff", fontWeight: 800, fontSize: "1.375rem" }} />
            <p style={{ marginTop: 12, fontSize: "0.875rem", lineHeight: 1.6, maxWidth: 360 }}>Independent research on Hyderabad homes, plots and land: measured prices, builders&apos; TG-RERA records and tracked government projects.</p>
          </div>
          {[
            { h: "Buy", l: [["Flats", "/projects?type=Apartment"], ["Villas", "/projects?type=Villa"], ["Open plots", "/projects?type=Plots"], ["Farm land", "/projects?type=Land"]] },
            { h: "Research", l: [["Area prices", "/market"], ["Builders", "/developers"], ["Map", "/explore"], ["News", "/news"]] },
            { h: "Tools", l: [["Total cost & EMI", "/calculator"], ["Free shortlist", "/research"], ["Legal checklist", "/market/legal"]] },
          ].map((col) => (
            <div key={col.h}>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: "0.8125rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>{col.h}</div>
              <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0", display: "grid", gap: 8, fontSize: "0.875rem" }}>
                {col.l.map(([t, h]) => <li key={h}><Link href={h}>{t}</Link></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="v3-wrap" style={{ marginTop: 32, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,.12)", fontSize: "0.75rem", display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between" }}>
          <span>Figures come from listings, public records and published reports. Growth figures are scenarios, not predictions. Do your own legal checks before paying.</span>
          <span style={{ display: "flex", gap: 14 }}><Link href="/legal/privacy">Privacy</Link><Link href="/legal/terms">Terms</Link><span>© {new Date().getFullYear()} Property Tiger</span></span>
        </div>
      </footer>
    </div>
  );
}
