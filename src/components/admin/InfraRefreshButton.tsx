"use client";

/**
 * Admin-only "Refresh infra data" button. Starts a crawl run, then drives it
 * source by source from the browser (two at a time) so each server request
 * stays small and the admin sees live progress; finally rescoring runs.
 * Rendered only inside /admin (middleware-guarded) and every API it calls
 * re-checks the ADMIN role.
 */
import React, { useState } from "react";
import { Loader2, RefreshCw, CheckCircle2, XCircle, MinusCircle } from "lucide-react";

interface SourceRun {
  id: string;
  status: string;
  error: string | null;
  source: { key: string; name: string; kind: string; tier: string };
}

interface Progress {
  id: string;
  name: string;
  status: string;
  detail?: string;
}

export interface RefreshSummary {
  fetched: number;
  newDocs: number;
  signals: number;
  autoApplied: number;
  queued: number;
  failed: number;
  corridorsRescored: string[];
}

export default function InfraRefreshButton({ onDone, label = "Refresh infra data" }: { onDone?: (s: RefreshSummary) => void; label?: string }) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [phase, setPhase] = useState<string>("");
  const [summary, setSummary] = useState<RefreshSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const setOne = (id: string, patch: Partial<Progress>) => setProgress((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  async function refresh() {
    setRunning(true);
    setOpen(true);
    setError(null);
    setSummary(null);
    setProgress([]);
    setPhase("Starting…");
    try {
      const start = await fetch("/api/admin/infra-intel/runs", { method: "POST" });
      const startBody = await start.json();
      if (!start.ok) throw new Error(startBody.error || "Could not start refresh");
      const run = startBody.run as { id: string; sourceRuns: SourceRun[] };
      setProgress(run.sourceRuns.map((s) => ({ id: s.id, name: s.source.name, status: s.status, detail: s.error ?? undefined })));

      const pending = run.sourceRuns.filter((s) => s.status === "PENDING");
      let i = 0;
      let done = 0;
      setPhase(`Crawling ${pending.length} sources…`);
      const worker = async () => {
        while (i < pending.length) {
          const sr = pending[i++];
          setOne(sr.id, { status: "RUNNING" });
          let more = true;
          let last: { status: string; fetched: number; signals: number; autoApplied: number; queued: number; error?: string } | null = null;
          while (more) {
            const r = await fetch(`/api/admin/infra-intel/runs/${run.id}/process`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sourceRunId: sr.id }),
            });
            const body = await r.json().catch(() => ({}));
            if (!r.ok) {
              last = { status: "FAILED", fetched: 0, signals: 0, autoApplied: 0, queued: 0, error: body.error || `HTTP ${r.status}` };
              break;
            }
            last = body;
            more = !!body.more;
            if (more) setOne(sr.id, { detail: `checked ${body.fetched} projects…` });
          }
          done++;
          setPhase(`Crawled ${done}/${pending.length} sources…`);
          setOne(sr.id, {
            status: last?.status ?? "FAILED",
            detail: last?.error ?? (last ? `${last.fetched} items · ${last.signals} signals · ${last.autoApplied} applied · ${last.queued} to review` : undefined),
          });
        }
      };
      await Promise.all([worker(), worker()]);

      setPhase("Rescoring affected corridors…");
      const fin = await fetch(`/api/admin/infra-intel/runs/${run.id}/finalize`, { method: "POST" });
      const finBody = await fin.json();
      if (!fin.ok) throw new Error(finBody.error || "Finalize failed");
      setSummary(finBody);
      setPhase("Done");
      onDone?.(finBody);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refresh failed");
      setPhase("");
    } finally {
      setRunning(false);
    }
  }

  const icon = (s: string) =>
    s === "DONE" ? <CheckCircle2 size={13} className="text-emerald-600 shrink-0" /> :
    s === "FAILED" ? <XCircle size={13} className="text-rose-500 shrink-0" /> :
    s === "RUNNING" ? <Loader2 size={13} className="animate-spin text-[#5B4FE0] shrink-0" /> :
    <MinusCircle size={13} className="text-slate-300 shrink-0" />;

  return (
    <div className="relative">
      <button onClick={refresh} disabled={running} className="crm-btn-primary text-xs disabled:opacity-60 inline-flex items-center gap-1.5">
        {running ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
        {running ? phase || "Refreshing…" : label}
      </button>

      {open && (progress.length > 0 || error) && (
        <div className="absolute right-0 mt-2 w-[min(92vw,440px)] z-30 bg-white border border-[#F0EDFA] rounded-2xl shadow-xl p-4 text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-[#1A1A2E]">{error ? "Refresh failed" : summary ? "Refresh complete" : phase}</span>
            {!running && (
              <button onClick={() => setOpen(false)} className="text-[#8A8A9E] hover:text-[#1A1A2E]">Close</button>
            )}
          </div>
          {error && <p className="text-rose-600 mb-2">{error}</p>}
          {summary && (
            <p className="text-[#1A1A2E] mb-3 leading-relaxed">
              <b>{summary.newDocs}</b> new items · <b>{summary.signals}</b> signals · <b className="text-emerald-700">{summary.autoApplied}</b> auto-applied ·{" "}
              <b className="text-amber-700">{summary.queued}</b> to review
              {summary.corridorsRescored.length > 0 && <> · rescored {summary.corridorsRescored.join(", ")}</>}
            </p>
          )}
          <ul className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
            {progress.map((p) => (
              <li key={p.id} className="flex items-start gap-2">
                {icon(p.status)}
                <div className="min-w-0">
                  <div className="text-[#1A1A2E] truncate">{p.name}</div>
                  {p.detail && <div className="text-[#8A8A9E] truncate">{p.detail}</div>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
