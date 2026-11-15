/**
 * /buying-help — Property Tiger's end-to-end buying help in eight steps,
 * how we're paid, proof, and a request form. Every service listed comes from
 * src/lib/buyer/journey.ts (confirmed by the business).
 */
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { pageMeta } from "@/lib/site";
import { JOURNEY } from "@/lib/buyer/journey";
import { HOW_WE_EARN } from "@/lib/proof";
import ProofStrip from "@/components/trust/ProofStrip";
import RequestForm from "./RequestForm";

export const revalidate = 3600;

export const metadata = pageMeta(
  "/buying-help",
  "Buying help in Hyderabad, start to finish — free for buyers | Property Tiger",
  "From shortlist to keys: accompanied site visits, negotiation, home loan, legal and snag checks, and interiors. Free for buyers — the builder pays us only when a sale closes.",
);

export default function BuyingHelpPage() {
  return (
    <div className="flex flex-col">
      <section style={{ background: "var(--color-ink)" }} className="px-4 sm:px-6 py-14">
        <div className="max-w-6xl mx-auto space-y-4">
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--color-saffron)", fontFamily: "var(--font-mono)" }}>Buying help</span>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white max-w-3xl" style={{ fontFamily: "var(--font-jakarta)", letterSpacing: "-0.02em" }}>
            From the first thought to the keys, with someone on your side.
          </h1>
          <p className="text-base max-w-2xl" style={{ color: "var(--color-text-invert-mid)" }}>{HOW_WE_EARN.long}</p>
          <div className="flex flex-wrap gap-3 pt-2">
            <a href="#request" className="uv-btn uv-btn-primary">Get help buying <ArrowRight size={16} /></a>
            <Link href="/how-we-score" className="uv-btn uv-btn-dark" style={{ background: "var(--color-ink-soft)", border: "1px solid var(--color-ink-line)" }}>How we score homes</Link>
          </div>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12 w-full space-y-14">
        <section aria-labelledby="steps-h" className="space-y-6">
          <h2 id="steps-h" className="text-2xl font-bold text-text-primary" style={{ fontFamily: "var(--font-jakarta)" }}>Eight steps, end to end</h2>
          <ol className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {JOURNEY.map((s) => (
              <li key={s.id} id={s.id} className="card-premium !p-6 space-y-2 scroll-mt-24">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0" style={{ background: "var(--color-saffron)", color: "var(--color-ink)" }}>{s.n}</span>
                  <h3 className="text-lg font-bold text-text-primary">{s.title}</h3>
                </div>
                <p className="text-sm text-text-primary"><strong>We do:</strong> {s.we}</p>
                <p className="text-sm text-text-secondary"><strong>You get:</strong> {s.you}</p>
                {s.link && <Link href={s.link.href} className="text-xs font-semibold underline text-saffron-deep">{s.link.label} →</Link>}
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="pay-h" className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card-premium !p-6 space-y-2">
            <h2 id="pay-h" className="text-lg font-bold text-text-primary">Who pays us</h2>
            <p className="text-sm text-text-primary">{HOW_WE_EARN.long}</p>
          </div>
          <div className="card-premium !p-6 space-y-2">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2"><ShieldCheck size={18} className="text-growth" /> No paid placements</h2>
            <p className="text-sm text-text-primary">{HOW_WE_EARN.noPaidPlacements} <Link href="/how-we-score" className="underline">How the score works</Link></p>
          </div>
        </section>

        <section aria-labelledby="proof-h" className="space-y-4">
          <h2 id="proof-h" className="text-lg font-bold text-text-primary">What we stand on</h2>
          <ProofStrip />
        </section>

        <section id="request" aria-labelledby="req-h" className="card-premium !p-6 md:!p-8 max-w-3xl mx-auto w-full scroll-mt-24 space-y-4">
          <h2 id="req-h" className="text-2xl font-bold text-text-primary" style={{ fontFamily: "var(--font-jakarta)" }}>Get help buying</h2>
          <p className="text-sm text-text-secondary">Pick the steps you want help with. Our team will call you. Free for buyers.</p>
          <RequestForm />
        </section>
      </main>
    </div>
  );
}
