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

const CORRIDORS = ["Shadnagar", "Pharma City", "Sangareddy", "Kokapet", "Shamshabad", "Yadadri", "Kompally", "Adibatla"];

export default function ApprovalsDirectoryPage() {
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [search, setSearch] = useState("");
  const [corridor, setCorridor] = useState("ALL");
  const [authority, setAuthority] = useState("ALL");
  const [type, setType] = useState("ALL");

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

  return (
    <div className="bg-slate-900 text-slate-100 min-h-screen font-sans">
      {/* Header Banner */}
      <section className="bg-gradient-to-b from-slate-950 to-slate-900 py-12 px-6 border-b border-slate-800">
        <div className="max-w-7xl mx-auto space-y-4 text-center">
          <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest block">Verifiable Registry Records</span>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
            HMDA / DTCP & RERA Layout Directory
          </h1>
          <p className="max-w-xl mx-auto text-slate-400 text-xs md:text-sm leading-relaxed">
            Search our legally audited database of land layouts, housing projects, building permits, and RERA registration codes across major Hyderabad growth corridors.
          </p>
        </div>
      </section>

      <main className="max-w-7xl mx-auto py-12 px-6 space-y-8">
        
        {/* Verification Note Box */}
        <div className="bg-slate-950 border border-slate-800 p-4 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs max-w-4xl mx-auto">
          <div className="space-y-1">
            <span className="font-bold text-white block">💡 Official Verification Disclaimer</span>
            <p className="text-slate-400 leading-relaxed">
              This directory is maintained by our real estate research team. For official, legally binding verification, always check the RERA Telangana or HMDA portal directly.
            </p>
          </div>
          <div className="flex gap-2">
            <a
              href="https://rera.telangana.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 border border-slate-850 hover:border-slate-650 text-white font-bold rounded text-[10px] flex items-center gap-1 transition-all"
            >
              rera.telangana.gov.in <ExternalLink size={10} />
            </a>
          </div>
        </div>

        {/* Filters Controls Panel */}
        <div className="bg-slate-950 border border-slate-800 p-5 rounded-lg flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-4 items-center w-full md:w-auto">
            <div className="flex flex-col gap-1 w-full sm:w-auto">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Corridor Zone</label>
              <select
                value={corridor}
                onChange={(e) => setCorridor(e.target.value)}
                className="border border-slate-800 bg-slate-900 text-slate-350 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
              >
                <option value="ALL">All Corridors</option>
                {CORRIDORS.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1 w-full sm:w-auto">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Authority</label>
              <select
                value={authority}
                onChange={(e) => setAuthority(e.target.value)}
                className="border border-slate-800 bg-slate-900 text-slate-350 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
              >
                <option value="ALL">All Authorities</option>
                {AUTHORITIES.map(a => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1 w-full sm:w-auto">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Approval Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="border border-slate-800 bg-slate-900 text-slate-350 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
              >
                <option value="ALL">All Types</option>
                {APPROVAL_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1 w-full sm:w-72 mt-2 md:mt-0">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Search</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search project, developer, LP code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyPress}
                className="w-full border border-slate-800 bg-slate-900 text-white rounded pl-8 pr-2.5 py-1.5 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
              />
              <Search className="absolute left-2.5 top-2.5 text-slate-500" size={13} />
            </div>
          </div>
        </div>

        {/* Results List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-amber-500" size={32} />
          </div>
        ) : approvals.length === 0 ? (
          <div className="bg-slate-950 border border-slate-800 rounded py-12 text-center text-slate-500 text-xs italic">
            No layout approval records found matching your filters.
          </div>
        ) : (
          <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-[10px] font-bold uppercase text-slate-400">
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
                <tbody className="divide-y divide-slate-850 text-slate-300">
                  {approvals.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-900/50">
                      <td className="px-4 py-3.5 font-bold text-white">{app.projectName}</td>
                      <td className="px-4 py-3.5 text-slate-400">{app.developerName || "—"}</td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold border uppercase tracking-wider ${
                          app.authority === "HMDA" ? "bg-green-500/10 text-green-400 border-green-500/20" :
                          app.authority === "DTCP" ? "bg-teal-500/10 text-teal-400 border-teal-500/20" :
                          "bg-slate-800 text-slate-350 border-slate-700"
                        }`}>
                          {app.authority}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-400">{app.approvalType.replace("_", " ")}</td>
                      <td className="px-4 py-3.5 font-mono text-[10px] text-slate-400">{app.approvalNumber || "—"}</td>
                      <td className="px-4 py-3.5 text-slate-400">
                        {app.approvalDate ? (
                          <span className="flex items-center gap-1.5">
                            <Calendar size={11} className="text-slate-500" />
                            {new Date(app.approvalDate).toLocaleDateString()}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-300">{app.corridor || "—"}</td>
                      <td className="px-4 py-3.5 text-right">
                        {app.corridor ? (
                          <Link
                            href={`/market/${app.corridor.toLowerCase().replace(/\s+/g, "-")}`}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-500 hover:text-amber-400 hover:underline cursor-pointer"
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
