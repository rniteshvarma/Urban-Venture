"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Inbox, Search, ShieldCheck, Lock, Building2, User as UserIcon, ArrowRight } from "lucide-react";

interface Enquiry {
  id: string;
  createdAt: string;
  status: string;
  contactReleased: boolean;
  message: string | null;
  budgetLakh: number | null;
  leadId: string | null;
  buyer: { name: string; phone: string; email: string | null };
  listing: {
    id: string;
    name: string;
    corridor: string;
    city: string;
    source: "ADMIN" | "SELLER";
    postedBy: { name: string | null; email: string; phone: string | null } | null;
  } | null;
}

const FILTERS = [
  { key: "ALL", label: "All enquiries" },
  { key: "AWAITING", label: "Awaiting contact release" },
  { key: "SELLER", label: "On seller listings" },
  { key: "ADMIN", label: "On house inventory" },
];

export default function AdminEnquiriesPage() {
  const [enquiries, setEnquiries] = useState<Enquiry[] | null>(null);
  const [counts, setCounts] = useState({ total: 0, awaitingRelease: 0, newStatus: 0 });
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [releasing, setReleasing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setEnquiries(null);
    let url = "/api/admin/enquiries?";
    if (filter === "AWAITING") url += "released=false&source=SELLER&";
    if (filter === "SELLER") url += "source=SELLER&";
    if (filter === "ADMIN") url += "source=ADMIN&";
    try {
      const res = await fetch(url);
      const data = await res.json();
      setEnquiries(data.enquiries ?? []);
      setCounts(data.counts ?? { total: 0, awaitingRelease: 0, newStatus: 0 });
    } catch {
      setEnquiries([]);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const release = async (id: string) => {
    setReleasing(id);
    try {
      await fetch(`/api/admin/enquiries/${id}/release-contact`, { method: "POST" });
      await load();
    } finally {
      setReleasing(null);
    }
  };

  const visible = (enquiries ?? []).filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.buyer.name.toLowerCase().includes(q) ||
      (e.listing?.name ?? "").toLowerCase().includes(q) ||
      e.buyer.phone.includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 w-full animate-fade-in">
      <div>
        <span className="text-[11px] text-[#5B4FE0] font-bold uppercase tracking-widest block mb-1">Buyer Demand</span>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#1A1A2E]">Listing Enquiries</h1>
        <p className="text-xs text-[#8A8A9E] mt-1">
          Every buyer who asked about a property. Buyer contact stays hidden from sellers until you release it here.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="crm-card p-5">
          <div className="text-xs font-semibold text-[#8A8A9E]">Total enquiries</div>
          <div className="text-3xl font-display font-bold text-[#1A1A2E]">{counts.total}</div>
        </div>
        <div className="crm-card p-5">
          <div className="text-xs font-semibold text-[#8A8A9E]">Awaiting contact release</div>
          <div className="text-3xl font-display font-bold text-[#5B4FE0]">{counts.awaitingRelease}</div>
        </div>
        <div className="crm-card p-5">
          <div className="text-xs font-semibold text-[#8A8A9E]">Unactioned (NEW)</div>
          <div className="text-3xl font-display font-bold text-[#1A1A2E]">{counts.newStatus}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={filter === f.key ? "crm-pill-tab crm-pill-tab-active" : "crm-pill-tab"}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="crm-card p-4 flex gap-3 items-center">
        <Search className="w-4 h-4 text-[#8A8A9E]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by buyer, phone, or listing…"
          className="flex-1 bg-transparent text-sm text-[#1A1A2E] placeholder-[#8A8A9E] focus:outline-none"
        />
      </div>

      {enquiries === null ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-[#EBE7F5] rounded-2xl animate-pulse" />)}
        </div>
      ) : visible.length === 0 ? (
        <div className="crm-card p-12 text-center space-y-3">
          <Inbox className="w-10 h-10 text-[#C9C4DC] mx-auto" />
          <h3 className="font-display text-lg font-bold text-[#1A1A2E]">No enquiries here yet</h3>
          <p className="text-xs text-[#8A8A9E]">
            Enquiries appear as buyers submit interest from a project page.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((e) => (
            <div key={e.id} className="crm-card p-5 flex flex-col lg:flex-row lg:items-center gap-4">
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-sm text-[#1A1A2E]">{e.buyer.name}</span>
                  <span className="badge bg-[#F4F0FF] text-[#5B4FE0] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                    {e.status}
                  </span>
                  {e.listing?.source === "ADMIN" ? (
                    <span className="badge bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">House inventory</span>
                  ) : (
                    <span className="badge bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Seller listing</span>
                  )}
                </div>

                <div className="text-xs text-[#8A8A9E] flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="inline-flex items-center gap-1"><Building2 size={12} />
                    {e.listing ? (
                      <Link href={`/admin/projects/${e.listing.id}`} className="text-[#5B4FE0] font-semibold hover:underline">
                        {e.listing.name}
                      </Link>
                    ) : "Listing removed"}
                  </span>
                  {e.listing?.corridor && <span>{e.listing.corridor}</span>}
                  {e.budgetLakh != null && <span>Budget ₹{e.budgetLakh}L</span>}
                  <span>{new Date(e.createdAt).toLocaleDateString()}</span>
                </div>

                <div className="text-xs text-[#6E6D8A]">
                  {e.buyer.phone}{e.buyer.email ? ` · ${e.buyer.email}` : ""}
                </div>

                {e.message && (
                  <p className="text-xs text-[#6E6D8A] italic bg-[#F9F8FD] rounded-lg px-3 py-2 mt-1">“{e.message}”</p>
                )}

                <div className="text-[11px] text-[#8A8A9E] inline-flex items-center gap-1 pt-0.5">
                  <UserIcon size={11} />
                  {e.listing?.postedBy
                    ? <>Posted by {e.listing.postedBy.name || e.listing.postedBy.email}</>
                    : <>Posted by the Property Tiger team</>}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {e.leadId && (
                  <Link href={`/admin/leads/${e.leadId}`} className="crm-btn-secondary text-xs px-4 py-2 inline-flex items-center gap-1.5">
                    Open lead <ArrowRight size={13} />
                  </Link>
                )}
                {e.listing?.source === "SELLER" && (
                  e.contactReleased ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-full">
                      <ShieldCheck size={13} /> Contact released
                    </span>
                  ) : (
                    <button
                      onClick={() => release(e.id)}
                      disabled={releasing === e.id}
                      className="crm-btn-primary text-xs px-4 py-2 inline-flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Lock size={13} /> {releasing === e.id ? "Releasing…" : "Release contact"}
                    </button>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
