"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ShieldCheck, 
  ArrowLeft, 
  ExternalLink, 
  Search, 
  FileText, 
  AlertOctagon, 
  Scale, 
  CheckCircle,
  HelpCircle,
  Loader2
} from "lucide-react";

export default function LegalHubPage() {
  const [risks, setRisks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("ALL");

  useEffect(() => {
    fetchRisks();
  }, []);

  async function fetchRisks() {
    try {
      const res = await fetch("/api/market/legal");
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.risks) {
          setRisks(data.risks);
        }
      }
    } catch (e) {
      console.error("Failed to load legal risks", e);
    } finally {
      setLoading(false);
    }
  }

  const filteredRisks = risks.filter(risk => {
    const matchesSearch = risk.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          risk.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          risk.affectedZones.some((z: string) => z.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = activeCategory === "ALL" || risk.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 min-h-screen bg-[#F8FAFC] text-[#0F172A]">
        <Loader2 className="animate-spin text-[#2563EB]" size={36} />
        <span className="text-xs text-[#3B82F6] font-semibold uppercase tracking-wider mt-4">Opening Legal Registers...</span>
      </div>
    );
  }

  return (
    <div className="bg-[#F8FAFC] text-[#0F172A] min-h-screen font-sans flex flex-col justify-between selection:bg-[#2563EB]/20">
      
      {/* Back Header */}
      <div className="bg-white border-b border-[#E2E8F0] py-3.5 px-6 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/market" className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors">
            <ArrowLeft size={13} /> Back to Market Hub
          </Link>
          <span className="text-xs text-primary font-bold uppercase tracking-wider">Land Registry & Legal Audit</span>
        </div>
      </div>

      {/* Hero Header */}
      <section className="bg-[#FFFFFF] border-b border-[#E2E8F0] py-12 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] text-[10px] font-mono uppercase tracking-wider">
            <Scale size={12} /> Legal Protection & Due Diligence Stack
          </div>
          <h2 className="text-3xl md:text-5xl font-display text-[#0F172A]">
            Hyderabad Land Registry Audit
          </h2>
          <p className="text-[#475569] text-xs md:text-sm max-w-xl mx-auto leading-relaxed">
            Protect your investments from prohibited properties, mutation delays, lake encroachments, and unapproved plotting layouts using official Telangana verification nodes.
          </p>
        </div>
      </section>

      <main className="max-w-7xl mx-auto py-12 px-6 w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Guidelines & Checklist */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg p-5 space-y-4">
            <h3 className="font-display text-lg text-[#0F172A] flex items-center gap-1.5 border-b border-[#E2E8F0] pb-2">
              <CheckCircle className="text-[#3B82F6]" size={18} />
              Online Due Diligence Checklist
            </h3>
            
            <ul className="space-y-3.5 text-xs text-[#475569]">
              <li className="flex gap-2">
                <span className="text-[#3B82F6] font-bold">1.</span>
                <div>
                  <strong className="text-[#0F172A]">Verify Dharani Mutation Status</strong>
                  <p className="mt-0.5 leading-relaxed text-[11px]">Request the Patta Passbook and run survey number mutations to verify title clarity.</p>
                </div>
              </li>
              <li className="flex gap-2">
                <span className="text-[#3B82F6] font-bold">2.</span>
                <div>
                  <strong className="text-[#0F172A]">Check Section 22-A Registers</strong>
                  <p className="mt-0.5 leading-relaxed text-[11px]">Verify the land survey numbers are not listed on the prohibited registry list.</p>
                </div>
              </li>
              <li className="flex gap-2">
                <span className="text-[#3B82F6] font-bold">3.</span>
                <div>
                  <strong className="text-[#0F172A]">Validate DTCP/HMDA Layout LP</strong>
                  <p className="mt-0.5 leading-relaxed text-[11px]">Layout numbers should match official master plan layouts and have physical markers.</p>
                </div>
              </li>
              <li className="flex gap-2">
                <span className="text-[#3B82F6] font-bold">4.</span>
                <div>
                  <strong className="text-[#3B82F6]">Lake FTL Boundaries check</strong>
                  <p className="mt-0.5 leading-relaxed text-[11px]">Check with Irrigation Department records to ensure coordinates don't overlap FTL buffers.</p>
                </div>
              </li>
              <li className="flex gap-2">
                <span className="text-[#3B82F6] font-bold">5.</span>
                <div>
                  <strong className="text-[#3B82F6]">TG-RERA Registration Status</strong>
                  <p className="mt-0.5 leading-relaxed text-[11px]">Every gated community or layout exceeding 500 sq meters must have active RERA status.</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Quick links to Government Portals */}
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg p-5 space-y-3">
            <h3 className="font-display text-base text-[#0F172A]">Official Registration Links</h3>
            <div className="grid grid-cols-1 gap-2 text-xs">
              <a
                href="https://dharani.telangana.gov.in"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2 border border-[#E2E8F0] hover:border-[#2563EB] rounded bg-[#F8FAFC]/30 font-bold transition-all text-[#3B82F6]"
              >
                <span>Dharani Land Portal</span> <ExternalLink size={12} />
              </a>
              <a
                href="https://rera.telangana.gov.in"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2 border border-[#E2E8F0] hover:border-[#2563EB] rounded bg-[#F8FAFC]/30 font-bold transition-all text-[#3B82F6]"
              >
                <span>TG-RERA Portal</span> <ExternalLink size={12} />
              </a>
              <a
                href="https://hmda.gov.in"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2 border border-[#E2E8F0] hover:border-[#2563EB] rounded bg-[#F8FAFC]/30 font-bold transition-all text-[#3B82F6]"
              >
                <span>HMDA Planning Maps</span> <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>

        {/* Right Side: Risks Explorer */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Filters Row */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-[#FFFFFF] p-4 rounded-lg border border-[#E2E8F0]">
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-2.5 text-[#475569]" size={15} />
              <input
                type="text"
                placeholder="Search survey risks, corridors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-[#E2E8F0] rounded-md text-xs focus:outline-none focus:border-[#2563EB] bg-[#F8FAFC]/10"
              />
            </div>

            <div className="flex flex-wrap gap-1 w-full md:w-auto">
              {["ALL", "LAND_RECORDS", "RESTRICTIONS", "APPROVALS", "RERA"].map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase transition-all ${
                    activeCategory === cat ? "bg-[#3B82F6] text-white" : "bg-[#F8FAFC] text-[#475569] border border-[#E2E8F0]"
                  }`}
                >
                  {cat.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Risks list */}
          <div className="space-y-4">
            {filteredRisks.length === 0 ? (
              <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg p-12 text-center text-[#475569] text-xs italic shadow-sm">
                No matching legal risks found. Try adjusting filters or search query.
              </div>
            ) : (
              filteredRisks.map((risk) => {
                const isRed = risk.severity === "RED";
                const isOrange = risk.severity === "ORANGE";

                return (
                  <div 
                    key={risk.id}
                    className={`bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg p-5 space-y-3 shadow-sm border-l-4 ${
                      isRed ? "border-l-[#EF4444]" :
                      isOrange ? "border-l-[#2563EB]" :
                      "border-l-[#3B82F6]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold border uppercase tracking-wider ${
                          isRed ? "bg-red-50 text-[#EF4444] border-red-200" :
                          isOrange ? "bg-amber-50 text-[#2563EB] border-amber-200" :
                          "bg-emerald-50 text-[#3B82F6] border-emerald-200"
                        }`}>
                          {risk.severity} Severity
                        </span>
                        <h4 className="font-display text-lg text-[#0F172A] mt-1">{risk.title}</h4>
                      </div>
                      <span className="text-[10px] font-mono text-[#3B82F6] bg-[#3B82F6]/10 px-2 py-0.5 rounded uppercase">
                        {risk.category.replace(/_/g, " ")}
                      </span>
                    </div>

                    <p className="text-xs text-[#475569] leading-relaxed">
                      {risk.description}
                    </p>

                    <div className="bg-[#F8FAFC]/40 p-4 rounded border border-[#E2E8F0] space-y-2 text-xs">
                      <div>
                        <strong className="text-[#0F172A]">Validation check instructions:</strong>
                        <p className="text-[#475569] mt-0.5 leading-relaxed">{risk.checkMethod}</p>
                      </div>
                      <div className="flex items-center justify-between gap-4 pt-2 border-t border-[#E2E8F0]/60">
                        <span className="font-mono text-[9px] text-[#475569]">
                          Ref: <strong className="text-[#0F172A] font-bold">{risk.govReference || "Official Registry"}</strong>
                        </span>
                        {risk.checkUrl && (
                          <a
                            href={risk.checkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-mono text-[10px] text-[#2563EB] hover:text-[#3B82F6] font-bold transition-colors"
                          >
                            Verify Online <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    </div>

                    {risk.affectedZones?.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-2">
                        <span className="text-[9px] text-[#475569] font-mono uppercase font-bold">Risk Boundaries:</span>
                        {risk.affectedZones.map((z: string) => (
                          <span key={z} className="bg-[#F8FAFC] px-2 py-0.5 rounded text-[10px] font-mono text-[#0F172A] border border-[#E2E8F0]">
                            {z}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>

      {/* Disclaimer block */}
      <div className="bg-slate-50 border-t border-[#E2E8F0] py-6 text-center text-[10px] text-text-secondary font-mono">
        <p>UrbanVenture Legal Advisory. Compiled from Dharani, RERA Telangana, and HMDA layout notifications.</p>
      </div>
    </div>
  );
}
