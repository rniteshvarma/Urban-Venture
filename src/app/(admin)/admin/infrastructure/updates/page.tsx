"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, ExternalLink, Check, X, Undo2, MapPin, Radar, Brain, Activity } from "lucide-react";
import InfraRefreshButton from "@/components/admin/InfraRefreshButton";

type Decision = "QUEUED" | "AUTO_APPLIED" | "APPROVED" | "REJECTED" | "REVERTED" | "IGNORED";

interface Signal {
  id: string;
  eventType: string;
  projectName: string;
  proposedStatus: string | null;
  completionPct: number | null;
  investmentCr: number | null;
  lengthKm: number | null;
  places: string[];
  focusZone: string | null;
  extractor: string;
  matchScore: number;
  confidence: number;
  corroboration: number;
  decisionScore: number;
  threshold: number;
  decision: Decision;
  decisionReason: string;
  createdAt: string;
  extracted: { headline?: string; url?: string | null; notes?: string[]; sources?: string[] };
  source: { name: string; tier: string; trust: number };
  document: { title: string; url: string; publisher: string | null; publishedAt: string | null } | null;
  infraProject: { id: string; name: string; status: string } | null;
}

interface Source {
  id: string;
  key: string;
  name: string;
  kind: string;
  tier: string;
  cadenceHours: number;
  isActive: boolean;
  trust: number;
  approvedCount: number;
  implicitOkCount: number;
  rejectedCount: number;
  revertedCount: number;
  lastRunAt: string | null;
  lastOkAt: string | null;
  lastError: string | null;
  consecutiveFailures: number;
}

interface Overview {
  lastRun: { startedAt: string; finishedAt: string | null; status: string; trigger: string } | null;
  queued: number;
  appliedWeek: number;
  newProjectsWeek: number;
  claude: boolean;
  policies: { key: string; threshold: number; approvals: number; implicitOk: number; rejections: number; reverts: number }[];
  movers: { slug: string; from: number; to: number }[];
}

const TABS: { key: Decision; label: string }[] = [
  { key: "QUEUED", label: "Needs review" },
  { key: "AUTO_APPLIED", label: "Auto-applied" },
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Rejected" },
  { key: "REVERTED", label: "Reverted" },
  { key: "IGNORED", label: "Ignored" },
];

const ZONE: Record<string, { label: string; cls: string }> = {
  INSIDE_RRR: { label: "Inside RRR", cls: "bg-[#EEEBFF] text-[#5B4FE0]" },
  RRR_BUFFER: { label: "RRR +20 km", cls: "bg-sky-50 text-sky-700" },
  TELANGANA: { label: "Telangana", cls: "bg-slate-100 text-slate-600" },
  OUTSIDE: { label: "Outside TG", cls: "bg-rose-50 text-rose-600" },
};

const pretty = (s: string | null | undefined) => (s ? s.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : "—");

function ago(iso: string | null): string {
  if (!iso) return "never";
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} days ago`;
}

export default function InfraUpdatesPage() {
  const [tab, setTab] = useState<Decision>("QUEUED");
  const [signals, setSignals] = useState<Signal[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [overview, setOverview] = useState<Overview | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [view, setView] = useState<"signals" | "sources" | "learning">("signals");

  const [reloadKey, setReloadKey] = useState(0);
  const load = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`/api/admin/infra-intel/signals?decision=${tab}`).then((r) => r.json()),
      fetch("/api/admin/infra-intel/overview").then((r) => r.json()),
      fetch("/api/admin/infra-intel/sources").then((r) => r.json()),
    ]).then(([s, o, src]) => {
      if (cancelled) return;
      setSignals(s.signals ?? []);
      setCounts(s.counts ?? {});
      setOverview(o);
      setSources(src.sources ?? []);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [tab, reloadKey]);

  const switchTab = (t: Decision) => {
    if (t === tab) return;
    setLoading(true);
    setTab(t);
  };

  async function act(id: string, action: "approve" | "reject" | "revert") {
    let note: string | undefined;
    if (action !== "approve") {
      const n = window.prompt(action === "reject" ? "Why is this wrong? (optional — helps the extractor learn)" : "Why revert? (optional — helps the extractor learn)");
      if (n === null) return;
      note = n || undefined;
    }
    setBusy(id);
    setMessage(null);
    const r = await fetch(`/api/admin/infra-intel/signals/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, note }),
    });
    const body = await r.json();
    setBusy(null);
    if (!r.ok) {
      setMessage(body.error || "Action failed");
      return;
    }
    setMessage(
      `${pretty(body.decision)}${body.corridors?.length ? ` · rescored ${body.corridors.join(", ")}` : ""}`,
    );
    load();
  }

  async function toggleSource(s: Source) {
    await fetch(`/api/admin/infra-intel/sources/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !s.isActive }),
    });
    load();
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 flex-grow flex flex-col animate-fade-in text-[#1A1A2E] w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#F0EDFA]">
        <div>
          <span className="text-[11px] text-[#5B4FE0] font-bold uppercase tracking-widest block mb-1">Market Intelligence</span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold">Infra Updates</h1>
          <p className="text-xs text-[#8A8A9E] mt-1">
            Live infrastructure signals for Telangana, prioritised inside the RRR + 20 km. Last refresh {ago(overview?.lastRun?.startedAt ?? null)}
            {overview?.lastRun ? ` (${overview.lastRun.trigger.toLowerCase()})` : ""}.
          </p>
        </div>
        <InfraRefreshButton onDone={() => load()} />
      </div>

      {overview && !overview.claude && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          Running on keyword extraction only (no Anthropic API key). It is deliberately cautious: it never creates projects on its own, so most signals land in
          review. Set <code className="font-mono">ANTHROPIC_API_KEY</code> to enable Claude extraction and the weekly AI status check of tracked projects.
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Waiting for review", value: overview?.queued ?? "—", icon: <Radar size={16} /> },
          { label: "Applied this week", value: overview?.appliedWeek ?? "—", icon: <Check size={16} /> },
          { label: "New projects this week", value: overview?.newProjectsWeek ?? "—", icon: <MapPin size={16} /> },
          { label: "Corridor scores moved", value: overview?.movers.length ?? "—", icon: <Activity size={16} /> },
        ].map((k) => (
          <div key={k.label} className="crm-card p-4">
            <div className="flex items-center gap-2 text-[#8A8A9E] text-[11px] font-semibold uppercase tracking-wide">
              {k.icon}
              {k.label}
            </div>
            <div className="text-2xl font-bold mt-1 tabular-nums">{k.value}</div>
          </div>
        ))}
      </div>

      {overview && overview.movers.length > 0 && (
        <div className="crm-card p-4 text-xs flex flex-wrap gap-2 items-center">
          <span className="font-semibold text-[#8A8A9E] mr-1">Infra score moves (7 days):</span>
          {overview.movers.map((m) => (
            <span key={m.slug} className={`px-2.5 py-1 rounded-full font-semibold ${m.to > m.from ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
              {m.slug} {m.from}→{m.to}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-1 border-b border-[#F0EDFA] text-sm">
        {(["signals", "sources", "learning"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-2 -mb-px border-b-2 font-semibold capitalize ${view === v ? "border-[#5B4FE0] text-[#5B4FE0]" : "border-transparent text-[#8A8A9E] hover:text-[#1A1A2E]"}`}
          >
            {v === "learning" ? "Learned policy" : v}
          </button>
        ))}
      </div>

      {message && <div className="text-xs rounded-lg bg-[#EEEBFF] text-[#3F35B5] px-3 py-2">{message}</div>}

      {view === "signals" && (
        <>
          <div className="flex flex-wrap gap-2">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => switchTab(t.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${tab === t.key ? "bg-[#5B4FE0] text-white border-[#5B4FE0]" : "bg-white text-[#1A1A2E] border-[#F0EDFA] hover:border-[#5B4FE0]"}`}
              >
                {t.label}
                <span className="ml-1.5 opacity-70 tabular-nums">{counts[t.key] ?? 0}</span>
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-[#5B4FE0]" size={28} />
            </div>
          ) : signals.length === 0 ? (
            <div className="crm-card p-10 text-center text-sm text-[#8A8A9E]">Nothing here. Press “Refresh infra data” to crawl the sources now.</div>
          ) : (
            <div className="space-y-3">
              {signals.map((s) => {
                const headline = s.document?.title ?? s.extracted.headline ?? s.projectName;
                const url = s.document?.url ?? s.extracted.url ?? null;
                const zone = ZONE[s.focusZone ?? ""];
                return (
                  <div key={s.id} className="crm-card p-4">
                    <div className="flex flex-col md:flex-row md:items-start gap-3 md:gap-6">
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide">
                          <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white">{pretty(s.eventType)}</span>
                          {s.proposedStatus && <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800">→ {pretty(s.proposedStatus)}</span>}
                          {zone && <span className={`px-2 py-0.5 rounded-full ${zone.cls}`}>{zone.label}</span>}
                          <span className="px-2 py-0.5 rounded-full bg-slate-50 text-slate-500">{s.extractor}</span>
                          {s.corroboration > 1 && <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">{s.corroboration} sources</span>}
                        </div>
                        <div className="font-semibold text-sm leading-snug">
                          {url ? (
                            <a href={url} target="_blank" rel="noopener nofollow" className="hover:text-[#5B4FE0] inline-flex items-start gap-1">
                              {headline} <ExternalLink size={12} className="mt-1 shrink-0" />
                            </a>
                          ) : (
                            headline
                          )}
                        </div>
                        <div className="text-xs text-[#8A8A9E]">
                          {s.source.name}
                          {s.document?.publisher ? ` · ${s.document.publisher}` : ""}
                          {s.document?.publishedAt ? ` · ${new Date(s.document.publishedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}
                        </div>
                        <div className="text-xs">
                          {s.infraProject ? (
                            <>
                              Project:{" "}
                              <Link href="/admin/infrastructure/projects" className="font-semibold text-[#5B4FE0]">
                                {s.infraProject.name}
                              </Link>{" "}
                              <span className="text-[#8A8A9E]">({pretty(s.infraProject.status)} · match {Math.round(s.matchScore * 100)}%)</span>
                            </>
                          ) : (
                            <>
                              New project: <b>{s.projectName}</b>
                            </>
                          )}
                          {s.places.length > 0 && <span className="text-[#8A8A9E]"> · {s.places.join(", ")}</span>}
                        </div>
                        {(s.investmentCr || s.lengthKm || s.completionPct !== null) && (
                          <div className="text-xs text-[#1A1A2E]">
                            {s.investmentCr ? `₹${s.investmentCr.toLocaleString("en-IN")} cr` : ""}
                            {s.lengthKm ? ` · ${s.lengthKm} km` : ""}
                            {s.completionPct !== null ? ` · ${s.completionPct}% complete` : ""}
                          </div>
                        )}
                        {(s.extracted.notes?.length ?? 0) > 0 && <div className="text-xs text-emerald-800">Changes: {s.extracted.notes!.join("; ")}</div>}
                        <div className="text-[11px] text-[#8A8A9E]">
                          {s.decisionReason} · confidence {s.confidence} · source trust {s.source.trust.toFixed(2)}
                        </div>
                      </div>
                      <div className="flex md:flex-col gap-2 shrink-0">
                        {s.decision === "QUEUED" && (
                          <>
                            <button disabled={busy === s.id} onClick={() => act(s.id, "approve")} className="crm-btn-primary text-xs inline-flex items-center gap-1 disabled:opacity-50">
                              {busy === s.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Approve
                            </button>
                            <button disabled={busy === s.id} onClick={() => act(s.id, "reject")} className="crm-btn-secondary text-xs inline-flex items-center gap-1 disabled:opacity-50">
                              <X size={13} /> Reject
                            </button>
                          </>
                        )}
                        {(s.decision === "AUTO_APPLIED" || s.decision === "APPROVED") && (
                          <button disabled={busy === s.id} onClick={() => act(s.id, "revert")} className="crm-btn-secondary text-xs inline-flex items-center gap-1 disabled:opacity-50">
                            {busy === s.id ? <Loader2 size={13} className="animate-spin" /> : <Undo2 size={13} />} Revert
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {view === "sources" && (
        <div className="crm-card p-0 overflow-x-auto">
          <table className="crm-table text-xs w-full">
            <thead>
              <tr>
                <th>Source</th>
                <th>Tier</th>
                <th className="text-center">Cadence</th>
                <th className="text-center">Learned trust</th>
                <th className="text-center">✓ / ✗ / ↺</th>
                <th>Health</th>
                <th className="text-right">Active</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div className="font-semibold">{s.name}</div>
                    <div className="text-[#8A8A9E]">{s.kind.replace("_", " ").toLowerCase()}</div>
                  </td>
                  <td>{pretty(s.tier)}</td>
                  <td className="text-center">{s.cadenceHours <= 24 ? "Daily" : "Weekly"}</td>
                  <td className="text-center font-semibold tabular-nums">{s.trust.toFixed(2)}</td>
                  <td className="text-center tabular-nums text-[#8A8A9E]">
                    {s.approvedCount + s.implicitOkCount} / {s.rejectedCount} / {s.revertedCount}
                  </td>
                  <td className="max-w-[260px]">
                    {s.lastError ? (
                      <span className="text-rose-600">
                        {s.consecutiveFailures}× failed · {s.lastError}
                      </span>
                    ) : s.lastOkAt ? (
                      <span className="text-emerald-700">OK · {ago(s.lastOkAt)}</span>
                    ) : (
                      <span className="text-[#8A8A9E]">Not run yet</span>
                    )}
                  </td>
                  <td className="text-right">
                    <button onClick={() => toggleSource(s)} className={`px-3 py-1 rounded-full text-[11px] font-bold ${s.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {s.isActive ? "Active" : "Paused"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[11px] text-[#8A8A9E] px-4 py-3 border-t border-[#F0EDFA]">
            Government sites (HMDA, HMRL, TGIIC, GO portal) often block non-Indian networks; in production the crawler runs from Mumbai (bom1). Sources auto-pause after 6
            consecutive failures.
          </p>
        </div>
      )}

      {view === "learning" && overview && (
        <div className="crm-card p-0 overflow-x-auto">
          <div className="px-4 py-3 border-b border-[#F0EDFA] text-xs text-[#8A8A9E] flex items-start gap-2">
            <Brain size={14} className="text-[#5B4FE0] mt-0.5 shrink-0" />
            A signal auto-applies when confidence × source trust × match × corroboration clears the threshold for its event type and source tier. Reverts raise the
            threshold (+0.05), approvals of near-miss queued items lower it (−0.015), and applied changes nobody reverts within 14 days lower it slightly. Cancellations,
            delays and backward status moves are always reviewed.
          </div>
          <table className="crm-table text-xs w-full">
            <thead>
              <tr>
                <th>Event × tier</th>
                <th className="text-center">Threshold</th>
                <th className="text-center">Approved</th>
                <th className="text-center">Implicit OK</th>
                <th className="text-center">Rejected</th>
                <th className="text-center">Reverted</th>
              </tr>
            </thead>
            <tbody>
              {overview.policies.map((p) => (
                <tr key={p.key}>
                  <td className="font-semibold">{p.key.split(":").map(pretty).join(" · ")}</td>
                  <td className="text-center tabular-nums font-bold">{p.threshold.toFixed(3)}</td>
                  <td className="text-center tabular-nums">{p.approvals}</td>
                  <td className="text-center tabular-nums">{p.implicitOk}</td>
                  <td className="text-center tabular-nums">{p.rejections}</td>
                  <td className="text-center tabular-nums">{p.reverts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
