"use client";

/** Before-you-pay checklists for every kind of purchase, as tabs (/market/legal). */
import React, { useState } from "react";
import { ExternalLink } from "lucide-react";
import { CHECKLISTS } from "@/lib/buyer/checklist";

type Key = keyof typeof CHECKLISTS;
const ORDER: Key[] = ["apartment", "villa", "plot", "resale_plot", "land", "commercial"];

export default function ChecklistTabs() {
  const [k, setK] = useState<Key>("apartment");
  const list = CHECKLISTS[k];
  return (
    <div className="card-premium space-y-4">
      <h3 className="section-header text-lg">Checklist by what you&apos;re buying</h3>
      <div className="flex flex-wrap gap-2" role="tablist">
        {ORDER.map((key) => (
          <button key={key} type="button" role="tab" aria-selected={k === key} onClick={() => setK(key)} className={k === key ? "filter-pill-active text-[11px]" : "filter-pill text-[11px]"}>
            {CHECKLISTS[key].label}
          </button>
        ))}
      </div>
      <ol className="space-y-3">
        {list.items.map((it, i) => (
          <li key={it.title} className="flex gap-3 text-xs">
            <span className="shrink-0 w-5 h-5 rounded-full bg-saffron-wash text-saffron-deep font-bold flex items-center justify-center text-[10px]">{i + 1}</span>
            <div>
              <div className="font-semibold text-text-primary">{it.title}</div>
              <p className="text-text-secondary leading-relaxed mt-0.5">
                {it.why}
                {it.where && <> <a href={it.where.url} target="_blank" rel="noreferrer" className="text-saffron-deep font-semibold inline-flex items-center gap-0.5">{it.where.label} <ExternalLink size={9} /></a></>}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
