"use client";

// OpenStreetMap places & accessibility — import status and a "run now" button.
// The daily cron re-imports categories older than 30 days; this runs it on demand
// (for example right after a deploy to an empty database).

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

interface Status {
  categories: { key: string; label: string; count: number; syncedAt: string | null }[];
  lastRun: { status: string; startedAt: string; finishedAt: string | null; errors: Record<string, string> | null } | null;
  scored: number;
  withPins: number;
}

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "never");

export default function OsmSyncCard() {
  const [s, setS] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/admin/osm/sync").then((r) => (r.ok ? r.json() : null)).then(setS).catch(() => setS(null));
  }, []);
  useEffect(() => { load(); }, [load]);

  const run = async () => {
    setBusy(true);
    setMsg("Importing from OpenStreetMap — this can take a few minutes…");
    try {
      const r = await fetch("/api/admin/osm/sync", { method: "POST" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "failed");
      if (j.skipped) setMsg(j.skipped);
      else {
        const imported = Object.keys(j.sync?.counts ?? {}).length;
        const deferred = j.sync?.deferred?.length ?? 0;
        setMsg(`${imported ? `Imported ${imported} categor${imported === 1 ? "y" : "ies"}` : "Nothing was due for re-import"}${deferred ? `; ${deferred} left for the next run` : ""}. Scored ${j.recompute?.computed ?? 0} listing(s).`);
      }
    } catch (e) {
      setMsg(`Import failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
      load();
    }
  };

  const total = s?.categories.reduce((n, c) => n + c.count, 0) ?? 0;

  return (
    <section className="bg-white border border-[#F0EDFA] rounded-2xl p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-bold">OpenStreetMap places &amp; accessibility</h2>
          <p className="text-xs text-[#8A8A9E] mt-1">
            {s ? (
              <>
                {total.toLocaleString("en-IN")} places · last import {when(s.lastRun?.finishedAt ?? s.lastRun?.startedAt ?? null)}
                {s.lastRun ? ` (${s.lastRun.status.toLowerCase()})` : ""} · {s.scored} of {s.withPins} mapped listings scored
              </>
            ) : "Loading…"}
          </p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-xl bg-[#5B4FE0] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          <RefreshCw size={14} className={busy ? "animate-spin" : undefined} /> {busy ? "Running…" : "Run import now"}
        </button>
      </div>
      {msg && <p className="text-xs text-[#4A4A5E]">{msg}</p>}
      {s && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {s.categories.map((c) => (
            <div key={c.key} className="rounded-xl bg-[#F8F7FD] px-3 py-2">
              <div className="text-[11px] text-[#8A8A9E] truncate">{c.label}</div>
              <div className="text-sm font-bold">{c.count.toLocaleString("en-IN")}</div>
            </div>
          ))}
        </div>
      )}
      <p className="text-[11px] text-[#A0A0B2]">Data © OpenStreetMap contributors. Refreshed automatically every 30 days; accessibility is a separate score from the listing rating.</p>
    </section>
  );
}
