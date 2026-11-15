"use client";

/**
 * /emi-calculator — standalone home-loan calculator: EMI, total interest,
 * year-by-year repayment, the effect of a prepayment, and the cash needed up
 * front (down payment + Telangana duties + GST). Rates and sources live in
 * src/lib/buyer/costs.ts; the loan rate is the buyer's to set.
 */
import React, { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Info } from "lucide-react";
import { DUTY, amortise, purchaseCosts, type PurchaseKind } from "@/lib/buyer/costs";
import { formatLakh, groupIndian } from "@/lib/format";

const KINDS: { id: PurchaseKind; label: string; uc: boolean }[] = [
  { id: "apartment", label: "Flat, under construction", uc: true },
  { id: "apartment", label: "Ready flat", uc: false },
  { id: "villa", label: "Villa", uc: false },
  { id: "plot", label: "Plot", uc: false },
];

function Slider({ label, value, min, max, step, onChange, format }: { label: string; value: number; min: number; max: number; step: number; onChange: (n: number) => void; format: (n: number) => string }) {
  const id = label.toLowerCase().replace(/\W+/g, "-");
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-baseline gap-3">
        <label htmlFor={id} className="text-xs font-semibold text-text-secondary">{label}</label>
        <span className="font-mono font-bold text-text-primary text-sm">{format(value)}</span>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[#FFB400]" />
    </div>
  );
}

export default function EmiCalculatorPage() {
  const [price, setPrice] = useState(90); // lakh
  const [downPct, setDownPct] = useState(20);
  const [rate, setRate] = useState(8.5);
  const [years, setYears] = useState(20);
  const [kindIdx, setKindIdx] = useState(0);
  const [prepayLakh, setPrepayLakh] = useState(0);
  const [prepayYear, setPrepayYear] = useState(3);
  const [showYears, setShowYears] = useState(false);

  const kind = KINDS[kindIdx];
  const loan = Math.max(0, Math.round(price * (1 - downPct / 100) * 100) / 100);
  const plan = useMemo(() => amortise(loan, rate, years), [loan, rate, years]);
  const withPrepay = useMemo(() => (prepayLakh > 0 ? amortise(loan, rate, years, { lakh: prepayLakh, afterYear: prepayYear }) : null), [loan, rate, years, prepayLakh, prepayYear]);
  const costs = purchaseCosts({ priceLakh: price, kind: kind.id, underConstruction: kind.uc });
  const upfront = costs.totalLakh - loan;
  const rupees = (n: number) => `₹${groupIndian(Math.round(n))}`;
  const ym = (months: number) => `${Math.floor(months / 12)} yr${months % 12 ? ` ${months % 12} mo` : ""}`;

  return (
    <div className="max-w-6xl mx-auto px-4 pt-10 pb-16 space-y-8 w-full">
      <div className="text-center" style={{ background: "var(--color-ink)", borderRadius: "var(--radius-uv-lg)", padding: "clamp(2rem, 5vw, 3rem) 1.5rem" }}>
        <span className="text-[10px] font-mono uppercase tracking-wider px-3 py-1.5 rounded-full" style={{ background: "var(--color-ink-soft)", border: "1px solid var(--color-ink-line)", color: "var(--color-saffron)" }}>
          Home loan
        </span>
        <h1 className="mt-3 text-3xl sm:text-5xl tracking-tight" style={{ fontFamily: "var(--font-jakarta)", fontWeight: 800, color: "#fff" }}>EMI calculator</h1>
        <p className="mt-3 text-sm max-w-2xl mx-auto" style={{ color: "var(--color-text-invert-mid)" }}>
          Your monthly EMI, the interest you&apos;ll pay, what a prepayment saves, and the cash you need on the day — with Telangana stamp duty and registration.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-5 card-premium !p-6 space-y-5" aria-label="Loan details">
          <Slider label="Property price" value={price} min={10} max={500} step={5} onChange={setPrice} format={formatLakh} />
          <Slider label="Down payment" value={downPct} min={10} max={90} step={5} onChange={setDownPct} format={(n) => `${n}% · ${formatLakh(price * n / 100)}`} />
          <Slider label="Interest rate (a year)" value={rate} min={6} max={14} step={0.05} onChange={setRate} format={(n) => `${n.toFixed(2)}%`} />
          <Slider label="Loan tenure" value={years} min={5} max={30} step={1} onChange={setYears} format={(n) => `${n} years`} />
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-text-secondary">What you&apos;re buying (for duties and GST)</span>
            <div className="flex flex-wrap gap-2">
              {KINDS.map((k, i) => (
                <button key={k.label} type="button" onClick={() => setKindIdx(i)} aria-pressed={kindIdx === i} className="uv-chip"
                  style={{ cursor: "pointer", border: "1px solid var(--color-line)", background: kindIdx === i ? "var(--color-saffron)" : "var(--color-surface)", color: kindIdx === i ? "var(--color-ink)" : "var(--color-text-mid)" }}>
                  {k.label}
                </button>
              ))}
            </div>
          </div>
          <p className="text-[11px] text-text-secondary flex gap-1.5"><Info size={12} className="shrink-0 mt-0.5" /> The rate is an example — use your bank&apos;s. Lenders usually fund up to 75–90% of a home&apos;s value, depending on the loan size.</p>
        </section>

        <div className="lg:col-span-7 space-y-6">
          <section className="card-premium !p-6" aria-label="Your EMI">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center sm:text-left">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Monthly EMI</div>
                <div className="font-display text-3xl font-black text-text-primary mt-1">{rupees(plan.emi)}</div>
                <div className="text-[11px] text-text-secondary">on a {formatLakh(loan)} loan</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Total interest</div>
                <div className="font-display text-2xl font-bold text-text-primary mt-1">{formatLakh(plan.totalInterest / 100_000)}</div>
                <div className="text-[11px] text-text-secondary">over {years} years</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">You pay the bank</div>
                <div className="font-display text-2xl font-bold text-text-primary mt-1">{formatLakh((loan * 100_000 + plan.totalInterest) / 100_000)}</div>
                <div className="text-[11px] text-text-secondary">loan + interest</div>
              </div>
            </div>
            <div className="mt-5 h-3 rounded-full overflow-hidden flex" role="img" aria-label={`Principal ${Math.round((loan * 1e5) / (loan * 1e5 + plan.totalInterest) * 100)}%, interest the rest`}>
              <div style={{ width: `${(loan * 1e5) / (loan * 1e5 + plan.totalInterest || 1) * 100}%`, background: "var(--color-ink)" }} />
              <div style={{ flex: 1, background: "var(--color-saffron)" }} />
            </div>
            <div className="mt-2 flex gap-4 text-[11px] text-text-secondary">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: "var(--color-ink)" }} /> Principal</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: "var(--color-saffron)" }} /> Interest</span>
            </div>
          </section>

          <section className="card-premium !p-6 space-y-3" aria-label="Cash needed up front">
            <h2 className="text-sm font-bold text-text-primary">Cash you need on the day</h2>
            <div className="text-sm divide-y divide-slate-100">
              {[
                ["Down payment", price - loan],
                [`Stamp duty (${DUTY.stampPct}%)`, costs.stampDutyLakh],
                [`Transfer duty (${DUTY.transferPct}%)`, costs.transferDutyLakh],
                [`Registration fee (${DUTY.registrationPct}%)`, costs.registrationLakh],
                [costs.gstPct ? `GST (${costs.gstPct}%)` : "GST", costs.gstLakh],
              ].map(([label, v]) => (
                <div key={label as string} className="flex justify-between py-1.5">
                  <span className="text-text-secondary">{label}</span>
                  <span className="font-mono font-semibold">{v == null ? "—" : formatLakh(v as number)}</span>
                </div>
              ))}
              <div className="flex justify-between py-2 font-bold">
                <span>Total up front</span>
                <span className="font-mono">{formatLakh(upfront)}</span>
              </div>
            </div>
            <p className="text-[11px] text-text-secondary">{costs.gstNote} Duties are charged on the higher of the price and the government guidance value. Source: {DUTY.source}.</p>
          </section>

          <section className="card-premium !p-6 space-y-4" aria-label="Prepayment">
            <h2 className="text-sm font-bold text-text-primary">What a prepayment saves</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Slider label="Lump sum" value={prepayLakh} min={0} max={Math.max(5, Math.floor(loan))} step={1} onChange={setPrepayLakh} format={(n) => (n ? formatLakh(n) : "None")} />
              <Slider label="Paid after year" value={prepayYear} min={1} max={Math.max(1, years - 1)} step={1} onChange={setPrepayYear} format={(n) => `${n}`} />
            </div>
            {withPrepay ? (
              <p className="text-sm text-text-primary">
                Paying {formatLakh(prepayLakh)} after year {prepayYear} and keeping the same EMI clears the loan in <strong>{ym(withPrepay.months)}</strong> instead of {ym(plan.months)}, and saves
                {" "}<strong>{formatLakh((plan.totalInterest - withPrepay.totalInterest) / 100_000)}</strong> in interest.
              </p>
            ) : (
              <p className="text-sm text-text-secondary">Move the lump-sum slider to see the effect. Most banks don&apos;t charge for prepaying a floating-rate home loan; check your loan agreement.</p>
            )}
          </section>

          <section className="card-premium !p-6 space-y-3" aria-label="Year by year">
            <button type="button" onClick={() => setShowYears((v) => !v)} className="text-sm font-bold text-text-primary underline" aria-expanded={showYears}>
              {showYears ? "Hide" : "Show"} year-by-year repayment
            </button>
            {showYears && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead><tr className="text-text-secondary"><th className="py-1.5 pr-3">Year</th><th className="py-1.5 pr-3 text-right">Principal</th><th className="py-1.5 pr-3 text-right">Interest</th><th className="py-1.5 text-right">Still owed</th></tr></thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {plan.rows.map((r) => (
                      <tr key={r.year}><td className="py-1.5 pr-3">{r.year}</td><td className="py-1.5 pr-3 text-right">{rupees(r.principal)}</td><td className="py-1.5 pr-3 text-right">{rupees(r.interest)}</td><td className="py-1.5 text-right">{rupees(r.balance)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <Link href="/buying-help#loan" className="card-premium !p-5 flex items-center justify-between gap-4 hover:border-saffron transition-colors" style={{ textDecoration: "none" }}>
            <span>
              <span className="block text-sm font-bold text-text-primary">Want help with the loan?</span>
              <span className="block text-xs text-text-secondary mt-0.5">Our team compares lenders for the property you pick and follows up on the paperwork. Free for buyers.</span>
            </span>
            <ArrowRight size={18} className="shrink-0 text-saffron-deep" />
          </Link>
        </div>
      </div>
    </div>
  );
}
