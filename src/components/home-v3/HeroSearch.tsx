"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin } from "lucide-react";

type Tab = "Apartment" | "Villa" | "Plots" | "Land" | "prices";
const TABS: { id: Tab; label: string }[] = [
  { id: "Apartment", label: "Flats" },
  { id: "Villa", label: "Villas" },
  { id: "Plots", label: "Plots" },
  { id: "Land", label: "Farm land" },
  { id: "prices", label: "Area prices" },
];
// Same ids as the budget chips on /projects.
const BUDGETS = [
  { id: "", label: "Any budget" },
  { id: "<30L", label: "Under ₹30 L" },
  { id: "30-60L", label: "₹30 – 60 L" },
  { id: "60-120L", label: "₹60 L – 1.2 Cr" },
  { id: ">120L", label: "Above ₹1.2 Cr" },
];

export default function HeroSearch({ localities, areas }: { localities: { name: string; count: number }[]; areas: { slug: string; name: string }[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("Apartment");
  const [q, setQ] = useState("");
  const [budget, setBudget] = useState("");
  const [area, setArea] = useState(areas[0]?.slug ?? "");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tab === "prices") {
      if (area) router.push(`/market/${area}`);
      return;
    }
    const p = new URLSearchParams({ type: tab });
    const typed = q.trim();
    if (typed) p.set(localities.some((l) => l.name.toLowerCase() === typed.toLowerCase()) ? "locality" : "q", localities.find((l) => l.name.toLowerCase() === typed.toLowerCase())?.name ?? typed);
    if (budget) p.set("budget", budget);
    router.push(`/projects?${p}`);
  };

  return (
    <div className="v3-card" style={{ padding: 0, overflow: "hidden" }}>
      <div role="tablist" aria-label="What are you looking for?" className="v3-scroller" style={{ gap: 4, padding: "10px 10px 8px", borderBottom: "1px solid var(--v3-line)" }}>
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className="v3-tab" onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>
      <form onSubmit={submit} style={{ display: "grid", gap: 12, padding: 14 }} className="grid-cols-1 md:grid-cols-[1.6fr_1fr_auto] md:items-end">
        {tab === "prices" ? (
          <label className="v3-field md:col-span-2">
            <span>Area</span>
            <select className="v3-input" value={area} onChange={(e) => setArea(e.target.value)}>
              {areas.map((a) => <option key={a.slug} value={a.slug}>{a.name}</option>)}
            </select>
          </label>
        ) : (
          <>
            <label className="v3-field">
              <span>Locality, project or builder</span>
              <div style={{ position: "relative" }}>
                <MapPin size={17} aria-hidden style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--v3-lo)" }} />
                <input className="v3-input" style={{ paddingLeft: 38 }} list="v3-localities" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Tellapur, Kokapet, My Home" />
                <datalist id="v3-localities">{localities.map((l) => <option key={l.name} value={l.name} />)}</datalist>
              </div>
            </label>
            <label className="v3-field">
              <span>Budget</span>
              <select className="v3-input" value={budget} onChange={(e) => setBudget(e.target.value)}>
                {BUDGETS.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
              </select>
            </label>
          </>
        )}
        <button type="submit" className="v3-btn v3-btn-primary" style={{ padding: "14px 26px", fontSize: "1rem" }}>
          <Search size={18} aria-hidden /> {tab === "prices" ? "See prices" : "Search"}
        </button>
      </form>
    </div>
  );
}
