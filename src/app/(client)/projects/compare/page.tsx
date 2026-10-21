"use client";

/**
 * /projects/compare?ids=a,b,c — up to four projects side by side, with the
 * full cost of each one's cheapest unit (Telangana duties + GST) and an
 * example EMI. Ids come from the URL, else from the buyer's compare list.
 */
import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, X } from "lucide-react";
import { useCompare } from "@/lib/buyer/compare-store";
import { emi, kindOf, purchaseCosts } from "@/lib/buyer/costs";
import { formatLakh, groupIndian } from "@/lib/format";

interface Unit { label: string; unitCategory: string; areaSqYd: number | null; builtUpSqFt: number | null; carpetAreaSqFt: number | null; priceLakh: number | null; ratePerSqFt: number | null; ratePerSqYd: number | null }
interface P {
  id: string; name: string; developer: string; developerSlug?: string | null; corridor: string; propertyType: string; minBudgetLakhs: number; maxBudgetLakhs: number;
  possessionText: string | null; reraNumber: string | null; totalUnits: number | null; totalLandAcres: number | null; amenities: string[]; imageUrls: string[];
  inventoryGrade: string | null; inventoryScore: number | null; accessibility: { score: number } | null; unitTypes?: Unit[];
  specifications: { locality?: string; listingKind?: string; constructionStatus?: string } | null;
}

const LOAN_RATE = 8.5, DOWN = 20, YEARS = 20;
const median = (xs: number[]) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : null);

function CompareInner() {
  const sp = useSearchParams();
  const store = useCompare();
  const fromUrl = (sp.get("ids") ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 4);
  const ids = fromUrl.length ? fromUrl : store.ids;
  const key = ids.join(",");
  const [projects, setProjects] = useState<P[] | null>(null);
  useEffect(() => {
    let live = true;
    if (!key) return;
    Promise.all(key.split(",").map((id) => fetch(`/api/projects/${id}`).then((r) => (r.ok ? r.json() : null)).catch(() => null)))
      .then((rows) => live && setProjects(rows.filter(Boolean)))
      .catch(() => live && setProjects([]));
    return () => {
      live = false;
    };
  }, [key]);

  if (!key) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-3">
        <h1 className="font-display text-2xl font-bold">Nothing to compare yet</h1>
        <p className="text-sm text-text-secondary">Tap “Compare” on up to four projects, then come back here.</p>
        <Link href="/projects" className="btn-primary inline-block text-sm">Browse projects</Link>
      </div>
    );
  }
  if (!projects) return <div className="py-32 flex justify-center"><Loader2 className="animate-spin text-saffron-deep" /></div>;

  const rows: { label: string; cell: (p: P) => React.ReactNode }[] = [
    { label: "Type", cell: (p) => (p.specifications?.listingKind === "LAND_LISTING" ? `${p.propertyType} · land listing (not RERA)` : p.propertyType) },
    { label: "Location", cell: (p) => p.specifications?.locality ?? p.corridor },
    { label: "Developer", cell: (p) => (p.developerSlug ? <Link href={`/developers/${p.developerSlug}`} className="underline">{p.developer}</Link> : p.developer) },
    { label: "Price", cell: (p) => (p.minBudgetLakhs > 0 ? `${formatLakh(p.minBudgetLakhs)}${p.maxBudgetLakhs > p.minBudgetLakhs ? ` – ${formatLakh(p.maxBudgetLakhs)}` : ""}` : "—") },
    {
      label: "Rate",
      cell: (p) => {
        const u = p.unitTypes ?? [];
        const sqft = median(u.map((x) => x.ratePerSqFt).filter((x): x is number => !!x));
        const sqyd = median(u.map((x) => x.ratePerSqYd).filter((x): x is number => !!x));
        return sqft ? `₹${groupIndian(sqft)}/sq.ft` : sqyd ? `₹${groupIndian(sqyd)}/sq.yd` : "—";
      },
    },
    { label: "Possession", cell: (p) => p.possessionText ?? "—" },
    { label: "TG-RERA", cell: (p) => p.reraNumber ?? "Not registered" },
    { label: "Tiger Rating", cell: (p) => (p.inventoryGrade ? `${p.inventoryGrade} · ${p.inventoryScore}/100` : "—") },
    { label: "Accessibility", cell: (p) => (p.accessibility ? `${p.accessibility.score}/100` : "—") },
    { label: "Land / units", cell: (p) => [p.totalLandAcres ? `${p.totalLandAcres} acres` : null, p.totalUnits && p.specifications?.listingKind !== "LAND_LISTING" ? `${groupIndian(p.totalUnits)} units` : null].filter(Boolean).join(" · ") || "—" },
    { label: "Amenities", cell: (p) => (p.amenities.length ? `${p.amenities.length} listed` : "—") },
    {
      label: "Total cost (cheapest unit)",
      cell: (p) => {
        if (!(p.minBudgetLakhs > 0)) return "—";
        const c = purchaseCosts({ priceLakh: p.minBudgetLakhs, kind: kindOf(p.propertyType, p.specifications?.listingKind), underConstruction: p.specifications?.constructionStatus === "UNDER_CONSTRUCTION" });
        return (
          <span title={`Stamp ${formatLakh(c.stampDutyLakh)} · transfer ${formatLakh(c.transferDutyLakh)} · registration ${formatLakh(c.registrationLakh)} · GST ${c.gstLakh == null ? "ask" : formatLakh(c.gstLakh)}`}>
            {formatLakh(c.totalLakh)}{c.gstLakh == null ? " + GST" : ""}
          </span>
        );
      },
    },
    { label: `EMI (${100 - DOWN}% loan, ${LOAN_RATE}%, ${YEARS} yrs)`, cell: (p) => (p.minBudgetLakhs > 0 ? `₹${groupIndian(emi(p.minBudgetLakhs * (1 - DOWN / 100), LOAN_RATE, YEARS))}/mo` : "—") },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <Link href="/projects" className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary"><ArrowLeft size={13} /> Back to projects</Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">Compare projects</h1>
        {!fromUrl.length && store.ids.length > 0 && <button type="button" onClick={store.clear} className="text-xs underline text-text-secondary">Clear list</button>}
      </div>
      <div className="overflow-x-auto bg-white border border-luxury rounded-xl">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr>
              <th className="w-44" />
              {projects.map((p) => (
                <th key={p.id} className="p-4 text-left align-top">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/projects/${p.id}`} className="font-display font-bold text-base hover:underline">{p.name}</Link>
                    {store.has(p.id) && <button type="button" onClick={() => store.toggle(p.id)} aria-label={`Remove ${p.name}`} className="text-text-secondary hover:text-alert"><X size={14} /></button>}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.label}>
                <th scope="row" className="p-4 text-left text-[11px] uppercase tracking-wider text-text-secondary font-bold align-top">{r.label}</th>
                {projects.map((p) => <td key={p.id} className="p-4 align-top text-text-primary">{r.cell(p)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-text-secondary">
        Total cost adds Telangana stamp duty (5.5%), transfer duty (1.5%), registration (0.5%) and GST where it applies, on the cheapest listed unit. The loan figures are an example; set your own on each project page.
      </p>
    </div>
  );
}

export default function ComparePage() {
  return (
    <div className="bg-surface-dim min-h-screen">
      <Suspense fallback={<div className="py-32 flex justify-center"><Loader2 className="animate-spin" /></div>}>
        <CompareInner />
      </Suspense>
    </div>
  );
}
