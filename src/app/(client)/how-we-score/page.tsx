/**
 * /how-we-score — the Property Tiger Score's lenses, weights and rules, in
 * plain words. Generated from src/lib/score/lenses.ts so the page can't drift
 * from the code.
 */
import Link from "next/link";
import { pageMeta } from "@/lib/site";
import { LENSES, MIN_LENSES } from "@/lib/score/lenses";
import { HOW_WE_EARN } from "@/lib/proof";

export const metadata = pageMeta(
  "/how-we-score",
  "How the Property Tiger Score works | Property Tiger",
  "One 0–10 score for every Hyderabad listing, from eight lenses: regulations, builder and delivery, value for money, transit, living, infrastructure, growth, and safety. Same rules for every listing.",
);

const WHAT: Record<string, string> = {
  regulations: "TG-RERA registration, litigation or a criminal case declared on the RERA registration, and revoked registrations. Land listings aren't RERA projects, so they score low here until a lawyer checks the title.",
  builder: "How long the builder has been in business, how many of its projects are past or have extended their TG-RERA completion dates, TG-RERA orders that name it, and how close this project is to possession.",
  value: "The listing's price per sq.ft (flats, villas), sq.yd (plots) or acre (land) against the median of at least three similar listings in the same area.",
  transit: "Distance to metro and MMTS stations, ORR exits, bus stations and the airport, from OpenStreetMap.",
  living: "Hospitals, schools, colleges and shops nearby, and parks and lakes, from OpenStreetMap.",
  infra: "The area's score from government projects we track with official sources — the RRR, Metro Phase II, radial roads and more.",
  growth: "The area's base-case price scenario over five years (built from published city figures and our measured prices — a scenario, not a prediction) and jobs nearby.",
  safety: "Lake full-tank-level buffers (check the plot is outside them), high-tension power lines, landfills, quarries, sewage plants, and how far the nearest hospital is.",
};

export default function HowWeScorePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-10 w-full">
      <header className="space-y-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-saffron-deep" style={{ fontFamily: "var(--font-mono)" }}>Property Tiger Score</span>
        <h1 className="text-3xl md:text-4xl font-extrabold text-text-primary" style={{ fontFamily: "var(--font-jakarta)" }}>How the score works</h1>
        <p className="text-base text-text-secondary">
          Every listing gets one number from 0 to 10, built from eight lenses. Each lens shows its evidence and source on the listing page,
          so you can see exactly why a home scored what it did.
        </p>
      </header>

      <section aria-labelledby="lenses-h" className="space-y-3">
        <h2 id="lenses-h" className="text-xl font-bold text-text-primary">The eight lenses</h2>
        <div className="card-premium !p-0 overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead><tr className="bg-slate-50 text-[11px] uppercase tracking-wider text-text-secondary"><th className="px-4 py-3">Lens</th><th className="px-4 py-3 text-right">Weight</th><th className="px-4 py-3">What it looks at</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {LENSES.map((l) => (
                <tr key={l.key}><td className="px-4 py-3 font-semibold text-text-primary whitespace-nowrap">{l.label}</td><td className="px-4 py-3 text-right font-mono">{l.weight}%</td><td className="px-4 py-3 text-text-secondary">{WHAT[l.key]}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="rules-h" className="space-y-3">
        <h2 id="rules-h" className="text-xl font-bold text-text-primary">Rules that keep it honest</h2>
        <ul className="list-disc pl-5 space-y-2 text-sm text-text-primary">
          <li><strong>Same rules for every listing.</strong> {HOW_WE_EARN.noPaidPlacements}</li>
          <li><strong>No guessing.</strong> A lens without enough data says so and is left out of the average. It never gets a made-up middle score.</li>
          <li><strong>Enough evidence first.</strong> A listing needs at least {MIN_LENSES} of the 8 lenses before it gets an overall score.</li>
          <li><strong>Hard caps.</strong> No TG-RERA registration: at most 5.0. A revoked registration or a declared criminal case: at most 4.0. Land listings, whose title we haven&apos;t verified: at most 6.0.</li>
          <li><strong>Refreshed daily</strong> as prices, builder records, map data and infrastructure change.</li>
        </ul>
      </section>

      <section aria-labelledby="bands-h" className="space-y-3">
        <h2 id="bands-h" className="text-xl font-bold text-text-primary">What the numbers mean</h2>
        <p className="text-sm text-text-secondary">8.0 and above: Excellent · 7.0–7.9: Very good · 6.0–6.9: Good · 5.0–5.9: Fair · below 5.0: Weak.</p>
        <p className="text-sm text-text-secondary">
          The score compares listings using the records we hold. It isn&apos;t a valuation, legal advice or a promise about future prices. Check the documents —
          or <Link href="/buying-help" className="underline font-semibold">let our team help</Link>.
        </p>
      </section>
    </div>
  );
}
