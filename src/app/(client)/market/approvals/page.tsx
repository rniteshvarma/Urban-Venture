"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  FileCheck, 
  Search, 
  X, 
  Calendar, 
  Loader2,
  ExternalLink,
  ArrowRight
} from "lucide-react";

const APPROVAL_TYPES = [
  { value: "LAYOUT_APPROVAL", label: "Layout Approval (LP)" },
  { value: "BUILDING_PERMISSION", label: "Building Permission" },
  { value: "RERA_REGISTRATION", label: "RERA Registration" },
  { value: "ENVIRONMENTAL_CLEARANCE", label: "Environmental Clearance" },
  { value: "SEZ_APPROVAL", label: "SEZ Approval" },
  { value: "INDUSTRIAL_ALLOTMENT", label: "Industrial Allotment" },
  { value: "TOWNSHIP_APPROVAL", label: "Township Approval" },
];

const AUTHORITIES = [
  { value: "HMDA", label: "HMDA (Metropolitan)" },
  { value: "DTCP", label: "DTCP (Districts)" },
  { value: "GHMC", label: "GHMC (Municipal)" },
  { value: "RERA_TELANGANA", label: "RERA Telangana" },
  { value: "TSIIC", label: "TSIIC (Industrial)" },
  { value: "NHAI", label: "NHAI (Highways)" },
  { value: "MOEF", label: "MoEF (Environment)" },
  { value: "GOT", label: "GoT (Government of Telangana)" },
];

const CORRIDORS_FALLBACK = ["Shadnagar", "Pharma City", "Sangareddy", "Kokapet", "Shamshabad", "Yadadri", "Kompally", "Adibatla"];

export default function ApprovalsDirectoryPage() {
  const [approvals, setApprovals] = useState<any[]>([]);
  const [corridors, setCorridors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [search, setSearch] = useState("");
  const [corridor, setCorridor] = useState("ALL");
  const [authority, setAuthority] = useState("ALL");
  const [type, setType] = useState("ALL");

  useEffect(() => {
    async function loadCorridors() {
      try {
        const res = await fetch("/api/market/corridors");
        if (res.ok) {
          const data = await res.json();
          setCorridors(data);
        }
      } catch (err) {
        console.error("Failed to load corridors", err);
      }
    }
    loadCorridors();
  }, []);

  useEffect(() => {
    fetchApprovals();
  }, [corridor, authority, type]);

  async function fetchApprovals() {
    setLoading(true);
    try {
      let url = `/api/market/approvals?corridor=${corridor}&authority=${authority}&type=${type}&search=${encodeURIComponent(search)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setApprovals(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      fetchApprovals();
    }
  };

  const getCorridorName = (slug: string) => {
    if (!slug) return "—";
    const match = corridors.find(c => c.corridor.toLowerCase() === slug.toLowerCase());
    if (match) return match.shortName || match.name;
    // Fallback logic for legacy naming if any
    return slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  };

  return (
    <div className="bg-luxury-bg text-text-primary min-h-screen font-sans">
      {/* Header Banner */}
      <section className="bg-white py-12 px-6 border-b border-luxury shadow-sm">
        <div className="max-w-7xl mx-auto space-y-4 text-center">
          <span className="text-[10px] font-bold text-primary uppercase tracking-widest block">Verifiable Registry Records</span>
          <h1 className="text-3xl md:text-4xl font-extrabold text-text-primary tracking-tight leading-tight">
            HMDA / DTCP & RERA Layout Directory
          </h1>
          <p className="max-w-xl mx-auto text-text-secondary text-xs md:text-sm leading-relaxed">
            Search our legally audited database of land layouts, housing projects, building permits, and RERA registration codes across major Hyderabad growth corridors.
          </p>
        </div>
      </section>

      <main className="max-w-7xl mx-auto py-12 px-6 space-y-8">
        
        {/* Verification Note Box */}
        <div className="bg-white border border-luxury p-4 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs max-w-4xl mx-auto shadow-sm">
          <div className="space-y-1">
            <span className="font-bold text-text-primary block">💡 Official Verification Disclaimer</span>
            <p className="text-text-secondary leading-relaxed">
              This directory is maintained by our real estate research team. For official, legally binding verification, always check the RERA Telangana or HMDA portal directly.
            </p>
          </div>
          <div className="flex gap-2">
            <a
              href="https://rera.telangana.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 border border-slate-200 hover:border-slate-350 text-text-primary font-bold rounded text-[10px] flex items-center gap-1 transition-all bg-white shadow-sm"
            >
              rera.telangana.gov.in <ExternalLink size={10} />
            </a>
          </div>
        </div>

        {/* Filters Controls Panel */}
        <div className="bg-white border border-luxury p-5 rounded-lg flex flex-wrap gap-4 items-center justify-between shadow-sm">
          <div className="flex flex-wrap gap-4 items-center w-full md:w-auto">
            <div className="flex flex-col gap-1 w-full sm:w-auto">
              <label className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Corridor Zone</label>
              <select
                value={corridor}
                onChange={(e) => setCorridor(e.target.value)}
                className="border border-slate-200 bg-white text-text-primary rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="ALL">All Corridors</option>
                {corridors.map(c => (
                  <option key={c.corridor} value={c.corridor}>{c.shortName || c.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1 w-full sm:w-auto">
              <label className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Authority</label>
              <select
                value={authority}
                onChange={(e) => setAuthority(e.target.value)}
                className="border border-slate-200 bg-white text-text-primary rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="ALL">All Authorities</option>
                {AUTHORITIES.map(a => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1 w-full sm:w-auto">
              <label className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Approval Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="border border-slate-200 bg-white text-text-primary rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="ALL">All Types</option>
                {APPROVAL_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1 w-full sm:w-72 mt-2 md:mt-0">
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Search</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search project, developer, LP code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyPress}
                className="w-full border border-slate-200 bg-white text-text-primary rounded pl-8 pr-2.5 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
              />
              <Search className="absolute left-2.5 top-2.5 text-text-secondary" size={13} />
            </div>
          </div>
        </div>

        {/* Results List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : approvals.length === 0 ? (
          <div className="bg-white border border-luxury rounded py-12 text-center text-text-secondary text-xs italic shadow-sm">
            No layout approval records found matching your filters.
          </div>
        ) : (
          <div className="bg-white border border-luxury rounded-lg overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-luxury text-[10px] font-bold uppercase text-text-secondary">
                    <th className="px-4 py-3">Project / Layout Name</th>
                    <th className="px-4 py-3">Developer</th>
                    <th className="px-4 py-3">Authority</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3 font-mono">LP/RERA Number</th>
                    <th className="px-4 py-3">Approval Date</th>
                    <th className="px-4 py-3">Corridor</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-text-primary">
                  {approvals.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3.5 font-bold text-text-primary">{app.projectName}</td>
                      <td className="px-4 py-3.5 text-text-secondary">{app.developerName || "—"}</td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold border uppercase tracking-wider ${
                          app.authority === "HMDA" ? "bg-green-50 text-green-700 border-green-200" :
                          app.authority === "DTCP" ? "bg-teal-50 text-teal-700 border-teal-200" :
                          "bg-slate-50 text-text-secondary border-slate-200"
                        }`}>
                          {app.authority}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-text-secondary">{app.approvalType.replace(/_/g, " ")}</td>
                      <td className="px-4 py-3.5 font-mono text-[10px] text-text-secondary">{app.approvalNumber || "—"}</td>
                      <td className="px-4 py-3.5 text-text-secondary">
                        {app.approvalDate ? (
                          <span className="flex items-center gap-1.5">
                            <Calendar size={11} className="text-text-secondary" />
                            {new Date(app.approvalDate).toLocaleDateString()}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-text-primary">{getCorridorName(app.corridor || app.corridorProfileSlug)}</td>
                      <td className="px-4 py-3.5 text-right font-bold text-primary">
                        {app.corridor || app.corridorProfileSlug ? (
                          <Link
                            href={`/market/${(app.corridor || app.corridorProfileSlug).toLowerCase()}`}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:text-blue-700 hover:underline cursor-pointer"
                          >
                            Corridor details <ArrowRight size={10} />
                          </Link>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
