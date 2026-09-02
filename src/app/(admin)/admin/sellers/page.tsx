"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Users, Search, BadgeCheck, Ban, Building2 } from "lucide-react";

interface Seller {
  id: string;
  userId: string;
  displayName: string;
  firmName: string | null;
  sellerType: string;
  reraAgentNumber: string | null;
  isVerified: boolean;
  isSuspended: boolean;
  suspendReason: string | null;
  contact: { name: string | null; email: string; phone: string | null };
  listings: { total: number; draft: number; pending: number; live: number; rejected: number };
  totalEnquiries: number;
  responseRate: number | null;
}

const STATES = [
  { key: "", label: "All sellers" },
  { key: "unverified", label: "Unverified" },
  { key: "verified", label: "Verified" },
  { key: "suspended", label: "Suspended" },
];

export default function AdminSellersPage() {
  const [sellers, setSellers] = useState<Seller[] | null>(null);
  const [counts, setCounts] = useState({ total: 0, verified: 0, suspended: 0, pendingListings: 0 });
  const [state, setState] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setSellers(null);
    const params = new URLSearchParams();
    if (state) params.set("state", state);
    if (search) params.set("search", search);
    try {
      const res = await fetch(`/api/admin/sellers?${params.toString()}`);
      const data = await res.json();
      setSellers(data.sellers ?? []);
      setCounts(data.counts ?? { total: 0, verified: 0, suspended: 0, pendingListings: 0 });
    } catch {
      setSellers([]);
    }
  }, [state, search]);

  useEffect(() => { load(); }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (id: string, body: Record<string, unknown>) => {
    setBusy(id);
    try {
      await fetch(`/api/admin/sellers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      await load();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 w-full animate-fade-in">
      <div>
        <span className="text-[11px] text-[#5B4FE0] font-bold uppercase tracking-widest block mb-1">Supply Side</span>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#1A1A2E]">Seller Directory</h1>
        <p className="text-xs text-[#8A8A9E] mt-1">
          Owners, agents and builders who post inventory. Verify the good ones, suspend the rest.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { l: "Sellers", v: counts.total, c: "#1A1A2E" },
          { l: "Verified", v: counts.verified, c: "#059669" },
          { l: "Listings awaiting review", v: counts.pendingListings, c: "#5B4FE0" },
          { l: "Suspended", v: counts.suspended, c: "#DC2626" },
        ].map((s) => (
          <div key={s.l} className="crm-card p-5">
            <div className="text-xs font-semibold text-[#8A8A9E]">{s.l}</div>
            <div className="text-3xl font-display font-bold" style={{ color: s.c }}>{s.v}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {STATES.map((s) => (
          <button key={s.key} onClick={() => setState(s.key)} className={state === s.key ? "crm-pill-tab crm-pill-tab-active" : "crm-pill-tab"}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="crm-card p-4 flex gap-3 items-center">
        <Search className="w-4 h-4 text-[#8A8A9E]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          placeholder="Search by name, firm, or email…"
          className="flex-1 bg-transparent text-sm text-[#1A1A2E] placeholder-[#8A8A9E] focus:outline-none"
        />
        <button onClick={load} className="crm-btn-primary text-xs px-5">Search</button>
      </div>

      {sellers === null ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-28 bg-[#EBE7F5] rounded-2xl animate-pulse" />)}</div>
      ) : sellers.length === 0 ? (
        <div className="crm-card p-12 text-center space-y-3">
          <Users className="w-10 h-10 text-[#C9C4DC] mx-auto" />
          <h3 className="font-display text-lg font-bold text-[#1A1A2E]">No sellers yet</h3>
          <p className="text-xs text-[#8A8A9E]">A seller appears here once someone completes seller onboarding.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sellers.map((s) => (
            <div key={s.id} className="crm-card p-5 flex flex-col lg:flex-row lg:items-center gap-4">
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-sm text-[#1A1A2E]">{s.displayName}</span>
                  <span className="badge bg-[#F4F0FF] text-[#5B4FE0] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">{s.sellerType}</span>
                  {s.isVerified && (
                    <span className="badge bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                      <BadgeCheck size={11} /> Verified
                    </span>
                  )}
                  {s.isSuspended && (
                    <span className="badge bg-rose-100 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Suspended</span>
                  )}
                </div>

                <div className="text-xs text-[#8A8A9E]">
                  {s.firmName ? `${s.firmName} · ` : ""}{s.contact.email}{s.contact.phone ? ` · ${s.contact.phone}` : ""}
                  {s.reraAgentNumber ? ` · RERA ${s.reraAgentNumber}` : ""}
                </div>

                <div className="text-xs text-[#6E6D8A] flex flex-wrap gap-x-4 gap-y-1 pt-0.5">
                  <span className="inline-flex items-center gap-1"><Building2 size={12} /> {s.listings.total} listings</span>
                  <span>{s.listings.live} live</span>
                  <span>{s.listings.pending} awaiting review</span>
                  <span>{s.listings.draft} draft</span>
                  <span>{s.totalEnquiries} enquiries</span>
                  {s.responseRate !== null && <span>{s.responseRate}% responded</span>}
                </div>

                {s.isSuspended && s.suspendReason && (
                  <p className="text-xs text-rose-700 bg-rose-50 rounded-lg px-3 py-1.5 mt-1">{s.suspendReason}</p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Link href={`/admin/projects/review`} className="crm-btn-secondary text-xs px-4 py-2">
                  Their listings
                </Link>
                <button
                  onClick={() => act(s.id, { isVerified: !s.isVerified })}
                  disabled={busy === s.id}
                  className="crm-btn-secondary text-xs px-4 py-2 inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  <BadgeCheck size={13} /> {s.isVerified ? "Unverify" : "Verify"}
                </button>
                <button
                  onClick={() =>
                    act(s.id, s.isSuspended
                      ? { isSuspended: false }
                      : { isSuspended: true, suspendReason: window.prompt("Reason for suspension?") || "Suspended by admin" })
                  }
                  disabled={busy === s.id}
                  className="text-xs px-4 py-2 rounded-full font-semibold border border-rose-200 text-rose-700 hover:bg-rose-50 inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Ban size={13} /> {s.isSuspended ? "Unsuspend" : "Suspend"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
