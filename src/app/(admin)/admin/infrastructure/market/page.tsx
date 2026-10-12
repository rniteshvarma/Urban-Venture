"use client";

// Market data feeds — admin.
//  · run the feeds now (official guidance values, MagicBricks cross-check, news figures)
//  · review figures read from research-firm news before they count
//  · see official guidance values and the INTERNAL MagicBricks cross-check
//    next to our measured prices (MagicBricks is never shown publicly)

import React, { useCallback, useEffect, useState } from "react";
import { Check, ExternalLink, Loader2, RefreshCw, X } from "lucide-react";
import { CITY_METRIC_LABEL, type CityMetric } from "@/lib/market/feeds/news";

interface Observation {
  id: string;
  source: string;
  metric: string;
  value: number;
  unit: string;
  period: string;
  status: string;
  sourceName: string;
  sourceUrl: string | null;
  observedAt: string;
  reviewedAt: string | null;
  meta: { firm?: string; snippet?: string; headline?: string; publishedAt?: string } | null;
}
interface Count { source: string; status: string; count: number; lastObservedAt: string | null }
interface Side { ours: number | null; portalMedian: number | null; gapPct: number | null; projects: number; guidance: number | null; localities: { locality: string; value: number; period: string; yoyPct: number | null; url: string | null }[] }
interface CrossRow { slug: string; name: string; plot: Side; apartment: Side }

const inr = (n: number | null | undefined) => (n == null ? "—" : `₹${Math.round(n).toLocaleString("en-IN")}`);
const when = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "never");
const SOURCE_LABEL: Record<string, string> = { TG_REGISTRATION: "Govt guidance values", MAGICBRICKS: "MagicBricks (internal)", NEWS: "News figures" };

function ReviewCard({ o, onDone }: { o: Observation; onDone: () => void }) {
  const [metric, setMetric] = useState(o.metric);
  const [value, setValue] = useState(String(o.value));
  const [period, setPeriod] = useState(o.period);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const decide = async (status: "APPROVED" | "REJECTED") => {
    setBusy(true);
    setErr(null);
    const r = await fetch(`/api/admin/market/observations/${o.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, metric, value: Number(value.replace(/,/g, "")), period }),
    });
    setBusy(false);
    if (r.ok) onDone();
    else setErr((await r.json().catch(() => ({}))).error ?? "Failed");
  };
  return (
    <div className="rounded-xl border border-[#F0EDFA] p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <a href={o.sourceUrl ?? "#"} target="_blank" rel="noreferrer" className="text-sm font-semibold text-[#1A1A2E] hover:underline inline-flex items-center gap-1">
            {o.meta?.headline ?? o.sourceName} <ExternalLink size={12} />
          </a>
          <p className="text-[11px] text-[#8A8A9E] mt-0.5">{o.meta?.firm} · {o.sourceName} · {when(o.meta?.publishedAt)}</p>
        </div>
      </div>
      {o.meta?.snippet && <p className="text-xs text-[#4A4A5E] bg-[#F8F7FD] rounded-lg px-3 py-2">“{o.meta.snippet}”</p>}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <select value={metric} onChange={(e) => setMetric(e.target.value)} className="rounded-lg border border-[#E4E1F5] px-2 py-1.5 text-xs">
          {Object.entries(CITY_METRIC_LABEL).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <input value={value} onChange={(e) => setValue(e.target.value)} className="rounded-lg border border-[#E4E1F5] px-2 py-1.5 text-xs" aria-label="Value" />
        <input value={period} onChange={(e) => setPeriod(e.target.value)} className="rounded-lg border border-[#E4E1F5] px-2 py-1.5 text-xs" aria-label="Period" />
      </div>
      <div className="flex items-center gap-2">
        <button type="button" disabled={busy} onClick={() => decide("APPROVED")} className="inline-flex items-center gap-1 rounded-lg bg-[#0B6B3D] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Approve — it matches the article
        </button>
        <button type="button" disabled={busy} onClick={() => decide("REJECTED")} className="inline-flex items-center gap-1 rounded-lg border border-[#E4E1F5] px-3 py-1.5 text-xs font-semibold text-[#4A4A5E] disabled:opacity-60">
          <X size={12} /> Reject
        </button>
        <span className="text-[11px] text-[#8A8A9E]">{CITY_METRIC_LABEL[metric as CityMetric]?.unit}</span>
        {err && <span className="text-[11px] text-[#B42318]">{err}</span>}
      </div>
    </div>
  );
}

function SideCells({ s, unit }: { s: Side; unit: string }) {
  const flag = s.gapPct != null && Math.abs(s.gapPct) >= 25;
  return (
    <>
      <td className="px-3 py-2 font-mono">{inr(s.ours)}{s.ours != null && <span className="text-[#A0A0B2]"> ({s.projects})</span>}</td>
      <td className="px-3 py-2 font-mono" title={s.localities.map((l) => `${l.locality}: ${inr(l.value)} ${l.period}${l.yoyPct != null ? `, ${l.yoyPct}%/yr` : ""}`).join("\n")}>
        {inr(s.portalMedian)}{s.localities.length > 0 && <span className="text-[#A0A0B2]"> ({s.localities.length})</span>}
      </td>
      <td className={`px-3 py-2 font-mono ${flag ? "text-[#B42318] font-bold" : ""}`}>{s.gapPct == null ? "—" : `${s.gapPct > 0 ? "+" : ""}${s.gapPct}%`}</td>
      <td className="px-3 py-2 font-mono">{inr(s.guidance)}<span className="text-[#A0A0B2]">{s.guidance != null ? unit : ""}</span></td>
    </>
  );
}

export default function MarketDataAdminPage() {
  const [pending, setPending] = useState<Observation[]>([]);
  const [counts, setCounts] = useState<Count[]>([]);
  const [cross, setCross] = useState<CrossRow[] | null>(null);
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/admin/market/observations?status=PENDING&source=NEWS").then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (!d) return;
      setPending(d.rows);
      setCounts(d.counts);
    }).catch(() => {});
    fetch("/api/admin/market/crosscheck").then((r) => (r.ok ? r.json() : null)).then((d) => setCross(d?.rows ?? [])).catch(() => setCross([]));
  }, []);
  useEffect(() => { load(); }, [load]);

  const runFeeds = async () => {
    setRunning(true);
    setMsg("Running the feeds — official values are fetched one village at a time, so this can take a few minutes…");
    try {
      const r = await fetch("/api/admin/market/feeds", { method: "POST" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "failed");
      const deferred = j.registration.deferred + j.magicbricks.deferred;
      setMsg(`Guidance values: ${j.registration.done} villages updated${j.registration.failed ? `, ${j.registration.failed} failed` : ""}. Cross-check: ${j.magicbricks.done} localities. News: ${j.news.candidates} new figure(s) to review.${deferred ? ` ${deferred} item(s) left for the next run.` : ""}`);
    } catch (e) {
      setMsg(`Feeds failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setRunning(false);
      load();
    }
  };

  const bySource = (source: string) => counts.filter((c) => c.source === source);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Market data feeds</h1>
          <p className="text-sm text-[#8A8A9E] mt-1">Official guidance values refresh monthly, the MagicBricks cross-check quarterly, and news figures daily — all automatically. Run them now if you need to.</p>
        </div>
        <button type="button" onClick={runFeeds} disabled={running} className="inline-flex items-center gap-2 rounded-xl bg-[#5B4FE0] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          <RefreshCw size={14} className={running ? "animate-spin" : undefined} /> {running ? "Running…" : "Run feeds now"}
        </button>
      </div>
      {msg && <p className="text-xs text-[#4A4A5E]">{msg}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {["TG_REGISTRATION", "MAGICBRICKS", "NEWS"].map((src) => {
          const rows = bySource(src);
          const total = rows.reduce((n, r) => n + r.count, 0);
          const last = rows.map((r) => r.lastObservedAt).filter(Boolean).sort().at(-1);
          return (
            <div key={src} className="bg-white border border-[#F0EDFA] rounded-2xl p-4">
              <div className="text-[11px] text-[#8A8A9E]">{SOURCE_LABEL[src]}</div>
              <div className="text-lg font-bold">{total.toLocaleString("en-IN")} <span className="text-xs font-normal text-[#8A8A9E]">figures</span></div>
              <div className="text-[11px] text-[#A0A0B2]">last {when(last)}{src === "NEWS" ? ` · ${rows.find((r) => r.status === "PENDING")?.count ?? 0} waiting` : ""}</div>
            </div>
          );
        })}
      </div>

      <section className="bg-white border border-[#F0EDFA] rounded-2xl p-5 space-y-3">
        <h2 className="font-display text-base font-bold">Figures from news — waiting for review</h2>
        <p className="text-xs text-[#8A8A9E]">Read automatically from research-firm articles. Open the article, check the number, city and period, correct them if needed, then approve. Approved figures replace the city stats and, for price growth, the forecast&apos;s base rate — with the article linked as the source.</p>
        {pending.length === 0 ? (
          <p className="text-xs text-[#A0A0B2]">Nothing waiting. New Knight Frank / ANAROCK Hyderabad figures appear here as the news crawler finds them.</p>
        ) : (
          <div className="space-y-3">{pending.map((o) => <ReviewCard key={o.id} o={o} onDone={load} />)}</div>
        )}
      </section>

      <section className="bg-white border border-[#F0EDFA] rounded-2xl p-5 space-y-3">
        <h2 className="font-display text-base font-bold">Our prices vs the cross-check and guidance values</h2>
        <p className="text-xs text-[#8A8A9E]">
          <strong>Internal only:</strong> MagicBricks figures are for calibration and are never shown on the site. Gaps of 25% or more are in red — usually a thin sample on our side or a mismatch in which localities count as the corridor. Guidance values are the official minimum for stamp duty (public).
        </p>
        {cross == null ? (
          <Loader2 className="animate-spin text-[#8A8A9E]" size={18} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase text-[#8A8A9E] border-b border-[#F0EDFA]">
                  <th className="px-3 py-2">Corridor</th>
                  <th className="px-3 py-2">Plots: ours (projects)</th><th className="px-3 py-2">MagicBricks</th><th className="px-3 py-2">Gap</th><th className="px-3 py-2">Guidance</th>
                  <th className="px-3 py-2">Flats: ours (projects)</th><th className="px-3 py-2">MagicBricks</th><th className="px-3 py-2">Gap</th><th className="px-3 py-2">Guidance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F6F4FC]">
                {cross.map((r) => (
                  <tr key={r.slug}>
                    <td className="px-3 py-2 font-semibold">{r.name}</td>
                    <SideCells s={r.plot} unit="/sq.yd" />
                    <SideCells s={r.apartment} unit="/sq.ft" />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
