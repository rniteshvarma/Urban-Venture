"use client";

/** Save the current /projects filters and get a daily email when new listings match. */
import React, { useState } from "react";
import Link from "next/link";
import { BellPlus, Check } from "lucide-react";
import type { ProjectFilters } from "@/lib/projects/query";

export default function SaveSearchButton({ filters }: { filters: ProjectFilters }) {
  const [state, setState] = useState<"idle" | "busy" | "saved" | "error">("idle");
  const [msg, setMsg] = useState<string | null>(null);
  const save = async () => {
    setState("busy");
    const r = await fetch("/api/saved/searches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filters }) });
    if (r.status === 401) {
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      return;
    }
    if (r.ok) {
      setState("saved");
      setMsg(null);
    } else {
      setState("error");
      setMsg((await r.json().catch(() => ({}))).error ?? "Couldn't save the search.");
    }
  };
  if (state === "saved") {
    return (
      <span className="uv-chip" style={{ background: "var(--color-growth-wash)", color: "var(--color-growth)" }}>
        <Check size={13} /> Saved — we&apos;ll email new matches. <Link href="/dashboard" className="underline ml-1">Manage</Link>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" onClick={save} disabled={state === "busy"} className="uv-chip" style={{ cursor: "pointer", border: "1px solid var(--color-line)", background: "var(--color-surface)" }}>
        <BellPlus size={13} /> {state === "busy" ? "Saving…" : "Alert me to new matches"}
      </button>
      {msg && <span className="text-xs" style={{ color: "var(--color-alert)" }}>{msg}</span>}
    </span>
  );
}
