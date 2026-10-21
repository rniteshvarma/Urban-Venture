"use client";

// System health — admin. Scheduled jobs' last runs (from JobRun) and server
// errors from the last 3 days (from AppError). A daily job emails the same
// summary when something fails or goes quiet (api/cron/ops-check).

import React, { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

interface Job { job: string; label: string; everyHours: number; health: string; lastStartedAt: string | null; lastOkAt: string | null; lastStatus: number | null; lastError: string | null; lastMs: number | null }
interface ErrorGroup { scope: string; message: string; count: number; lastAt: string; path: string | null }

const TONE: Record<string, string> = {
  OK: "bg-[#E8F7EE] text-[#1E7B46]",
  RUNNING: "bg-[#EEF0FD] text-[#5B4FE0]",
  STALE: "bg-[#FFF4E0] text-[#9A6A1E]",
  FAILED: "bg-[#FDECEA] text-[#B42318]",
  NEVER_RAN: "bg-[#F3F2F8] text-[#8A8A9E]",
};
const ago = (iso: string | null) => {
  if (!iso) return "never";
  const h = (Date.now() - new Date(iso).getTime()) / 3_600_000;
  return h < 1 ? `${Math.max(1, Math.round(h * 60))} min ago` : h < 48 ? `${Math.round(h)} h ago` : `${Math.round(h / 24)} days ago`;
};

export default function SystemHealthPage() {
  const [data, setData] = useState<{ jobs: Job[]; errors: { total: number; groups: ErrorGroup[] } } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  // Bumping `version` refetches; the fetch resolves outside the effect body.
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let live = true;
    fetch("/api/admin/system")
      .then(async (r) => {
        if (!live) return;
        if (r.ok) {
          setErr(null);
          setData(await r.json());
        } else setErr(`Couldn't load (${r.status})`);
      })
      .catch(() => live && setErr("Couldn't load"));
    return () => {
      live = false;
    };
  }, [version]);
  const load = () => {
    setData(null);
    setVersion((v) => v + 1);
  };

  const issues = data?.jobs.filter((j) => j.health === "FAILED" || j.health === "STALE").length ?? 0;
  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">System health</h1>
          <p className="text-sm text-[#8A8A9E] mt-1">
            Scheduled jobs and server errors. A daily check emails {""}
            <span className="font-mono">OPS_ALERT_EMAIL</span> (or the admin email) when a job fails, misses its schedule, or errors appear. Uptime monitors can poll <span className="font-mono">/api/health</span>.
          </p>
        </div>
        <button type="button" onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-[#E4E1F5] bg-white px-4 py-2 text-sm font-semibold">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>
      {err && <p className="text-sm text-[#B42318]">{err}</p>}
      {!data && !err && <Loader2 className="animate-spin text-[#5B4FE0]" />}
      {data && (
        <>
          <section className="rounded-2xl bg-white border border-[#F0EDFA] overflow-x-auto">
            <div className="px-5 py-4 border-b border-[#F0EDFA] flex items-center justify-between">
              <h2 className="font-semibold">Scheduled jobs</h2>
              <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${issues ? TONE.FAILED : TONE.OK}`}>{issues ? `${issues} need attention` : "All healthy"}</span>
            </div>
            <table className="w-full text-xs">
              <thead className="text-left text-[10px] uppercase text-[#8A8A9E]">
                <tr><th className="px-5 py-2">Job</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Last run</th><th className="px-3 py-2">Last success</th><th className="px-3 py-2">Took</th><th className="px-3 py-2">Last error</th></tr>
              </thead>
              <tbody className="divide-y divide-[#F6F4FC]">
                {data.jobs.map((j) => (
                  <tr key={j.job}>
                    <td className="px-5 py-2.5"><div className="font-semibold text-[#1A1A2E]">{j.label}</div><div className="font-mono text-[10px] text-[#A0A0B2]">{j.job} · every {j.everyHours >= 48 ? `${j.everyHours / 24} days` : `${j.everyHours} h`}</div></td>
                    <td className="px-3 py-2.5"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${TONE[j.health] ?? ""}`}>{j.health.replace("_", " ")}</span></td>
                    <td className="px-3 py-2.5">{ago(j.lastStartedAt)}{j.lastStatus ? <span className="text-[#A0A0B2]"> · {j.lastStatus}</span> : null}</td>
                    <td className="px-3 py-2.5">{ago(j.lastOkAt)}</td>
                    <td className="px-3 py-2.5 font-mono">{j.lastMs != null ? `${(j.lastMs / 1000).toFixed(1)} s` : "—"}</td>
                    <td className="px-3 py-2.5 text-[#B42318] max-w-xs truncate" title={j.lastError ?? ""}>{j.lastError ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="rounded-2xl bg-white border border-[#F0EDFA]">
            <div className="px-5 py-4 border-b border-[#F0EDFA] flex items-center justify-between">
              <h2 className="font-semibold">Server errors — last 3 days</h2>
              <span className="text-xs text-[#8A8A9E]">{data.errors.total} in total</span>
            </div>
            {data.errors.groups.length === 0 ? (
              <p className="px-5 py-6 text-sm text-[#8A8A9E]">No server errors recorded.</p>
            ) : (
              <ul className="divide-y divide-[#F6F4FC]">
                {data.errors.groups.map((g) => (
                  <li key={`${g.scope}|${g.message}`} className="px-5 py-3 text-xs">
                    <div className="flex items-center justify-between gap-3"><span className="font-mono text-[#5B4FE0] truncate">{g.scope}</span><span className="text-[#8A8A9E] shrink-0">{g.count}× · {ago(g.lastAt)}</span></div>
                    <p className="text-[#1A1A2E] mt-0.5 break-words">{g.message}</p>
                    {g.path && <p className="text-[#A0A0B2] font-mono mt-0.5 truncate">{g.path}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
