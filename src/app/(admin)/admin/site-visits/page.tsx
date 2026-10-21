"use client";

// Site visits — admin. Buyers request a date and time of day from a project
// page; confirm by phone, then mark the outcome. Each request is also a Lead.

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

interface Visit {
  id: string; name: string; phone: string; email: string | null; preferredDate: string; slot: string; note: string | null;
  status: string; confirmedFor: string | null; adminNote: string | null; leadId: string | null; createdAt: string;
  project: { id: string; name: string; corridor: string };
}
const SLOT: Record<string, string> = { MORNING: "9–12", AFTERNOON: "12–3", EVENING: "3–6" };
const TABS = ["REQUESTED", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"] as const;
const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

export default function SiteVisitsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("REQUESTED");
  const [visits, setVisits] = useState<Visit[] | null>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let live = true;
    fetch(`/api/admin/site-visits?status=${tab}`)
      .then((r) => (r.ok ? r.json() : { visits: [] }))
      .then((d) => live && setVisits(d.visits))
      .catch(() => live && setVisits([]));
    return () => {
      live = false;
    };
  }, [tab, version]);
  const update = async (id: string, status: string) => {
    await fetch(`/api/admin/site-visits/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    setVersion((v) => v + 1);
  };
  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-6xl">
      <div>
        <h1 className="font-display text-2xl font-bold">Site visits</h1>
        <p className="text-sm text-[#8A8A9E] mt-1">Requested from project pages. Call the buyer to confirm, then record how it went. Each request also appears under Leads.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t} type="button" onClick={() => { setVisits(null); setTab(t); }} className={`rounded-full px-3 py-1.5 text-xs font-semibold border ${tab === t ? "bg-[#5B4FE0] text-white border-[#5B4FE0]" : "bg-white border-[#E4E1F5]"}`}>
            {t.replace("_", " ").toLowerCase()}
          </button>
        ))}
      </div>
      {visits === null ? <Loader2 className="animate-spin text-[#5B4FE0]" /> : visits.length === 0 ? (
        <p className="text-sm text-[#8A8A9E]">Nothing here.</p>
      ) : (
        <div className="rounded-2xl bg-white border border-[#F0EDFA] divide-y divide-[#F6F4FC]">
          {visits.map((v) => (
            <div key={v.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3 justify-between text-sm">
              <div className="min-w-0">
                <div className="font-semibold">{day(v.preferredDate)} · {SLOT[v.slot] ?? v.slot} — <Link href={`/projects/${v.project.id}`} className="text-[#5B4FE0] hover:underline">{v.project.name}</Link></div>
                <div className="text-xs text-[#8A8A9E]">{v.name} · <a href={`tel:${v.phone}`} className="underline">{v.phone}</a>{v.email ? ` · ${v.email}` : ""}{v.note ? ` · “${v.note}”` : ""}</div>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                {tab === "REQUESTED" && <button type="button" onClick={() => update(v.id, "CONFIRMED")} className="rounded-lg bg-[#1E7B46] text-white px-3 py-1.5 text-xs font-semibold">Confirmed</button>}
                {tab === "CONFIRMED" && <button type="button" onClick={() => update(v.id, "COMPLETED")} className="rounded-lg bg-[#1E7B46] text-white px-3 py-1.5 text-xs font-semibold">Visited</button>}
                {tab === "CONFIRMED" && <button type="button" onClick={() => update(v.id, "NO_SHOW")} className="rounded-lg border border-[#E4E1F5] px-3 py-1.5 text-xs font-semibold">No-show</button>}
                {(tab === "REQUESTED" || tab === "CONFIRMED") && <button type="button" onClick={() => update(v.id, "CANCELLED")} className="rounded-lg border border-[#E4E1F5] px-3 py-1.5 text-xs font-semibold text-[#B42318]">Cancel</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
