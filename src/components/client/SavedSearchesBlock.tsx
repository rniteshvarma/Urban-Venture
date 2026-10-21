"use client";

/** The buyer's saved searches on the dashboard: open, pause alerts, or remove. */
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { BellRing, Trash2 } from "lucide-react";
import type { ProjectFilters } from "@/lib/projects/query";

interface Search { id: string; name: string; filters: ProjectFilters; alertEmail: boolean; lastAlertedAt: string | null }

const href = (f: ProjectFilters) => {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.type) p.set("type", f.type);
  if (f.corridor) p.set("corridor", f.corridor);
  if (f.locality) p.set("locality", f.locality);
  return `/projects${p.toString() ? `?${p}` : ""}`;
};

export default function SavedSearchesBlock() {
  const [rows, setRows] = useState<Search[] | null>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let live = true;
    fetch("/api/saved/searches")
      .then((r) => (r.ok ? r.json() : { searches: [] }))
      .then((d) => live && setRows(d.searches ?? []))
      .catch(() => live && setRows([]));
    return () => {
      live = false;
    };
  }, [version]);
  if (!rows || rows.length === 0) return null;
  const patch = async (id: string, body: object) => {
    await fetch(`/api/saved/searches/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setVersion((v) => v + 1);
  };
  const remove = async (id: string) => {
    await fetch(`/api/saved/searches/${id}`, { method: "DELETE" });
    setVersion((v) => v + 1);
  };
  return (
    <section className="uv-card" style={{ padding: 20 }}>
      <h3 style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, marginBottom: 12 }}><BellRing size={16} /> Saved searches</h3>
      <ul style={{ display: "grid", gap: 10 }}>
        {rows.map((s) => (
          <li key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", justifyContent: "space-between" }}>
            <div style={{ minWidth: 0 }}>
              <Link href={href(s.filters)} style={{ fontWeight: 600 }}>{s.name}</Link>
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-mid)" }}>
                {s.alertEmail ? "Daily email when new listings match" : "Alerts paused"}
                {s.lastAlertedAt ? ` · last alert ${new Date(s.lastAlertedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="uv-btn uv-btn-ghost" style={{ padding: "6px 12px", fontSize: "0.75rem" }} onClick={() => patch(s.id, { alertEmail: !s.alertEmail })}>
                {s.alertEmail ? "Pause alerts" : "Resume alerts"}
              </button>
              <button type="button" aria-label={`Remove ${s.name}`} className="uv-btn uv-btn-ghost" style={{ padding: "6px 10px" }} onClick={() => remove(s.id)}>
                <Trash2 size={14} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
