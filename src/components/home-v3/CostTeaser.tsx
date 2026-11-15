"use client";

import Link from "next/link";
import React, { useState } from "react";
import { ArrowRight } from "lucide-react";
import { DUTY, emi, purchaseCosts, type PurchaseKind } from "@/lib/buyer/costs";
import { formatLakh, groupIndian } from "@/lib/format";

const KINDS: { id: string; label: string; kind: PurchaseKind; uc: boolean }[] = [
  { id: "ready", label: "Ready flat", kind: "apartment", uc: false },
  { id: "uc", label: "Under construction", kind: "apartment", uc: true },
  { id: "plot", label: "Plot", kind: "plot", uc: false },
];

/** "A ₹80 L flat really costs…" — the duties and GST most buyers forget, plus the EMI. */
export default function CostTeaser() {
  const [price, setPrice] = useState(80);
  const [k, setK] = useState("uc");
  const sel = KINDS.find((x) => x.id === k)!;
  const c = purchaseCosts({ priceLakh: price, kind: sel.kind, underConstruction: sel.uc });
  const loan = price * 0.8;
  const monthly = emi(loan, 8.5, 20);
  const extra = c.totalLakh - price;
  const row = (label: string, v: number) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px dashed rgba(255,255,255,.14)", fontSize: "0.875rem" }}>
      <span style={{ color: "rgba(255,255,255,.72)" }}>{label}</span>
      <span className="v3-mono">{formatLakh(v)}</span>
    </div>
  );

  return (
    <div style={{ display: "grid", gap: 28 }} className="grid-cols-1 md:grid-cols-[1fr_1.1fr] md:items-center">
      <div>
        <div className="v3-eyebrow" style={{ color: "var(--v3-accent)" }}>The real price</div>
        <h2 className="v3-h2" style={{ color: "#fff", marginTop: 8 }}>
          A {formatLakh(price).replace(" Lakh", " L")} home costs <span style={{ color: "var(--v3-accent)" }}>{formatLakh(c.totalLakh).replace(" Lakh", " L")}</span>
        </h2>
        <p style={{ color: "rgba(255,255,255,.72)", marginTop: 10, lineHeight: 1.6 }}>
          Telangana charges {DUTY.stampPct}% stamp duty, {DUTY.transferPct}% transfer duty and {DUTY.registrationPct}% registration on every purchase, and under-construction homes add GST.
          That&apos;s {formatLakh(extra).replace(" Lakh", " L")} on top of the price here — before parking, club and maintenance charges.
        </p>
        <Link href="/calculator" className="v3-btn v3-btn-primary" style={{ marginTop: 18 }}>
          Full calculator <ArrowRight size={17} aria-hidden />
        </Link>
      </div>
      <div style={{ background: "var(--v3-night-soft)", borderRadius: 18, padding: 20, border: "1px solid rgba(255,255,255,.08)", color: "#fff" }}>
        <div role="radiogroup" aria-label="Type of purchase" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {KINDS.map((x) => (
            <button key={x.id} type="button" role="radio" aria-checked={k === x.id} onClick={() => setK(x.id)} className="v3-chip"
              style={{ cursor: "pointer", border: "1px solid rgba(255,255,255,.18)", background: k === x.id ? "var(--v3-accent)" : "transparent", color: k === x.id ? "var(--v3-night)" : "#fff", padding: "7px 12px", fontSize: "0.8125rem" }}>
              {x.label}
            </button>
          ))}
        </div>
        <label style={{ display: "block", marginTop: 18 }}>
          <span style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem", color: "rgba(255,255,255,.72)" }}>
            Price <strong className="v3-mono" style={{ color: "#fff", fontSize: "1rem" }}>{formatLakh(price)}</strong>
          </span>
          <input type="range" min={20} max={300} step={5} value={price} onChange={(e) => setPrice(Number(e.target.value))} style={{ width: "100%", marginTop: 8, accentColor: "var(--v3-accent)" }} aria-label="Price in lakh" />
        </label>
        <div style={{ marginTop: 10 }}>
          {row(`Stamp duty (${DUTY.stampPct}%)`, c.stampDutyLakh)}
          {row(`Transfer duty (${DUTY.transferPct}%)`, c.transferDutyLakh)}
          {row(`Registration (${DUTY.registrationPct}%)`, c.registrationLakh)}
          {row(c.gstPct ? `GST (${c.gstPct}%)` : "GST (none on ready homes)", c.gstLakh ?? 0)}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 12 }}>
          <span style={{ fontWeight: 700 }}>You pay</span>
          <span className="v3-mono" style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--v3-accent)" }}>{formatLakh(c.totalLakh)}</span>
        </div>
        <div style={{ marginTop: 10, fontSize: "0.8125rem", color: "rgba(255,255,255,.72)" }}>
          EMI ≈ <strong style={{ color: "#fff" }}>₹{groupIndian(monthly)}/month</strong> on an 80% loan at 8.5% for 20 years (example rate)
        </div>
      </div>
    </div>
  );
}
