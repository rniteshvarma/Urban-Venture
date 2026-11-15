"use client";

// Builders — admin. Enter each builder's Google rating by hand from their
// public Google Business profile (never scraped). It shows on the builder's
// public page with the review count, the link and the date it was checked.

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Star } from "lucide-react";
import { toast } from "@/lib/toast";

interface Row {
  slug: string; name: string; projects: number;
  googleRating: number | null; googleReviewCount: number | null; googleProfileUrl: string | null; googleCheckedAt: string | null;
}

function Editor({ row, onSaved }: { row: Row; onSaved: (r: Partial<Row>) => void }) {
  const [rating, setRating] = useState(row.googleRating?.toString() ?? "");
  const [reviews, setReviews] = useState(row.googleReviewCount?.toString() ?? "");
  const [url, setUrl] = useState(row.googleProfileUrl ?? "");
  const [busy, setBusy] = useState(false);
  const save = async (clear = false) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/developers/${encodeURIComponent(row.slug)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clear ? { rating: "", reviews: "", url: "" } : { rating, reviews, url }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Could not save.");
      onSaved(d.developer);
      if (clear) { setRating(""); setReviews(""); setUrl(""); }
      toast.success(clear ? "Google rating removed." : "Google rating saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };
  const field = "border border-[#E4E1F5] rounded-lg px-2.5 py-1.5 text-xs bg-white";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input className={`${field} w-16`} inputMode="decimal" placeholder="4.4" value={rating} onChange={(e) => setRating(e.target.value)} aria-label={`Google rating for ${row.name}`} />
      <input className={`${field} w-20`} inputMode="numeric" placeholder="Reviews" value={reviews} onChange={(e) => setReviews(e.target.value)} aria-label={`Review count for ${row.name}`} />
      <input className={`${field} w-72`} placeholder="https://maps.app.goo.gl/…" value={url} onChange={(e) => setUrl(e.target.value)} aria-label={`Google profile link for ${row.name}`} />
      <button type="button" disabled={busy} onClick={() => save()} className="rounded-lg bg-[#5B4FE0] text-white text-xs font-semibold px-3 py-1.5 disabled:opacity-50">
        {busy ? "Saving…" : "Save"}
      </button>
      {row.googleRating != null && (
        <button type="button" disabled={busy} onClick={() => save(true)} className="text-xs text-[#B42318] underline">Remove</button>
      )}
    </div>
  );
}

export default function AdminDevelopersPage() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  useEffect(() => {
    let live = true;
    const t = setTimeout(() => {
      fetch(`/api/admin/developers?q=${encodeURIComponent(q)}`)
        .then((r) => (r.ok ? r.json() : { developers: [] }))
        .then((d) => live && setRows(d.developers))
        .catch(() => live && setRows([]));
    }, 250);
    return () => { live = false; clearTimeout(t); };
  }, [q]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1A1A2E]">Builders</h1>
        <p className="text-sm text-[#8A8A9E] mt-1 max-w-3xl">
          Copy each builder&apos;s star rating and review count from their public Google Business profile and paste the profile link.
          It appears on the builder&apos;s page with the date you saved it. Only enter what Google shows — never estimate.
        </p>
      </div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search a builder…"
        className="w-full max-w-md border border-[#E4E1F5] rounded-xl px-4 py-2.5 text-sm bg-white"
        aria-label="Search builders"
      />
      {!rows ? (
        <Loader2 className="animate-spin text-[#5B4FE0]" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-[#8A8A9E]">No builders match.</p>
      ) : (
        <div className="rounded-2xl bg-white border border-[#F0EDFA] divide-y divide-[#F0EDFA]">
          {rows.map((r) => (
            <div key={r.slug} className="px-5 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div>
                <Link href={`/developers/${r.slug}`} target="_blank" className="font-semibold text-sm text-[#1A1A2E] hover:underline">{r.name}</Link>
                <div className="text-xs text-[#8A8A9E] mt-0.5 flex items-center gap-2">
                  {r.projects} project{r.projects === 1 ? "" : "s"}
                  {r.googleRating != null && (
                    <span className="inline-flex items-center gap-1 text-[#1A1A2E]">
                      · <Star size={11} className="text-amber-500" fill="currentColor" /> {r.googleRating} ({r.googleReviewCount})
                      {r.googleCheckedAt ? ` · saved ${new Date(r.googleCheckedAt).toLocaleDateString("en-IN")}` : ""}
                    </span>
                  )}
                </div>
              </div>
              <Editor row={r} onSaved={(u) => setRows((prev) => prev?.map((x) => (x.slug === r.slug ? { ...x, ...u } : x)) ?? prev)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
