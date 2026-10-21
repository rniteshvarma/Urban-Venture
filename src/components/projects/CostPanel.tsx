"use client";

/**
 * "What it really costs": price + Telangana stamp duty, transfer duty,
 * registration and GST, and the loan EMI. Rates and their sources live in
 * src/lib/buyer/costs.ts; the loan rate is the buyer's to set.
 */
import React, { useState } from "react";
import { Calculator } from "lucide-react";
import { DUTY, GST, emi, purchaseCosts, type PurchaseKind } from "@/lib/buyer/costs";
import { formatLakh, groupIndian } from "@/lib/format";

export interface CostUnit {
  label: string;
  priceLakh: number;
  /** carpet area in sq.ft, when known (for the affordable-housing GST test) */
  carpetSqFt?: number | null;
}

export default function CostPanel({ units, kind, underConstruction }: { units: CostUnit[]; kind: PurchaseKind; underConstruction: boolean }) {
  const priced = units.filter((u) => u.priceLakh > 0);
  const [pick, setPick] = useState(0);
  const [downPct, setDownPct] = useState(20);
  const [rate, setRate] = useState(8.5);
  const [years, setYears] = useState(20);
  if (!priced.length) return null;
  const u = priced[Math.min(pick, priced.length - 1)];
  const c = purchaseCosts({ priceLakh: u.priceLakh, kind, underConstruction, carpetSqm: u.carpetSqFt ? u.carpetSqFt / 10.764 : null });
  const loan = Math.max(0, u.priceLakh * (1 - downPct / 100));
  const monthly = emi(loan, rate, years);
  const upfront = c.totalLakh - loan;
  const row = (label: string, v: number | null, note?: string) => (
    <div className="flex items-baseline justify-between gap-4 py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-text-secondary">{label}{note ? <span className="block text-[10px] text-text-secondary/80">{note}</span> : null}</span>
      <span className="font-mono font-semibold text-text-primary">{v == null ? "—" : formatLakh(v)}</span>
    </div>
  );
  const input = "w-20 rounded border border-slate-200 px-2 py-1 text-xs font-mono";
  return (
    <section className="card-premium space-y-4 !p-8">
      <h2 className="section-header text-xl flex items-center gap-2"><Calculator size={18} className="text-saffron-deep" /> What it really costs</h2>
      {priced.length > 1 && (
        <label className="text-xs text-text-secondary flex items-center gap-2">
          Unit
          <select value={pick} onChange={(e) => setPick(Number(e.target.value))} className="rounded border border-slate-200 px-2 py-1 text-xs">
            {priced.map((x, i) => <option key={i} value={i}>{x.label} — {formatLakh(x.priceLakh)}</option>)}
          </select>
        </label>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        <div>
          {row("Price", u.priceLakh)}
          {row(`Stamp duty (${DUTY.stampPct}%)`, c.stampDutyLakh)}
          {row(`Transfer duty (${DUTY.transferPct}%)`, c.transferDutyLakh)}
          {row(`Registration fee (${DUTY.registrationPct}%)`, c.registrationLakh)}
          {row(c.gstPct ? `GST (${c.gstPct}%)` : "GST", c.gstLakh, c.gstNote)}
          <div className="flex items-baseline justify-between gap-4 pt-2 mt-1 border-t-2 border-slate-200">
            <span className="font-bold text-text-primary">Total</span>
            <span className="font-mono font-bold text-text-primary text-sm">{formatLakh(c.totalLakh)}</span>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-3 items-center text-text-secondary">
            <label className="flex items-center gap-1">Down payment <input type="number" min={0} max={100} value={downPct} onChange={(e) => setDownPct(Math.min(100, Math.max(0, Number(e.target.value) || 0)))} className={input} />%</label>
            <label className="flex items-center gap-1">Rate <input type="number" step={0.05} min={0} value={rate} onChange={(e) => setRate(Math.max(0, Number(e.target.value) || 0))} className={input} />%</label>
            <label className="flex items-center gap-1">Years <input type="number" min={1} max={30} value={years} onChange={(e) => setYears(Math.min(30, Math.max(1, Number(e.target.value) || 1)))} className={input} /></label>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-100 p-4 space-y-1">
            <div className="text-text-secondary">Monthly EMI on a {formatLakh(loan)} loan</div>
            <div className="text-2xl font-bold font-mono text-text-primary">₹{groupIndian(monthly)}</div>
            <div className="text-text-secondary">Paid up front (down payment, duties{c.gstLakh ? ", GST" : ""}): <strong className="text-text-primary">{formatLakh(upfront)}</strong></div>
          </div>
          <p className="text-[10px] text-text-secondary leading-relaxed">
            The loan rate is an example — set your bank&apos;s. Duties are charged on the higher of the price and the government guidance value, and
            some developers add parking, club and maintenance charges.
          </p>
        </div>
      </div>
      <p className="text-[10px] text-text-secondary">Sources: {DUTY.source}; {GST.source}.</p>
    </section>
  );
}
