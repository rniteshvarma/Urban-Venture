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
  Loader2,
  XCircle
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
      <div className="flex flex-col items-center justify-center py-40 min-h-screen bg-surface-dim text-text-primary">
        <Loader2 className="animate-spin text-accent" size={36} />
        <span className="text-xs text-accent font-semibold uppercase tracking-wider mt-4">Opening Legal Registers...</span>
      </div>
    );
  }

  return (
    <div className="bg-surface-dim text-text-primary min-h-screen font-sans flex flex-col justify-between selection:bg-accent/20">
      
      {/* Back Header */}
      <div className="glass-header sticky top-16 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/market" className="nav-link inline-flex items-center gap-1.5 text-xs font-semibold">
            <ArrowLeft size={13} /> Back to Market Hub
          </Link>
          <span className="text-xs text-primary-light font-bold uppercase tracking-wider">Land Registry & Legal Audit</span>
        </div>
      </div>

      {/* Hero Header */}
      <section className="bg-surface border-b border-gray-200 py-12 px-6 gradient-surface">
        <div className="max-w-4xl mx-auto text-center space-y-4 animate-fade-in-up">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-danger/10 border border-danger/20 text-danger text-[10px] font-mono uppercase tracking-wider">
            <Scale size={12} /> Legal Protection & Due Diligence Stack
          </div>
          <h2 className="text-3xl md:text-5xl font-display text-text-primary">
            Hyderabad Land Registry Audit
          </h2>
          <p className="text-text-secondary text-xs md:text-sm max-w-xl mx-auto leading-relaxed">
            Protect your investments from prohibited properties, mutation delays, lake encroachments, and unapproved plotting layouts using official Telangana verification nodes.
          </p>
        </div>
      </section>

      <main className="max-w-7xl mx-auto py-12 px-6 w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Guidelines & Checklist */}
        <div className="lg:col-span-1 space-y-6 stagger-1 animate-fade-in-up">
          <div className="card-premium space-y-4">
            <h3 className="section-header text-lg flex items-center gap-1.5">
              <CheckCircle className="text-success" size={18} />
              Online Due Diligence Checklist
            </h3>
            
            <ul className="space-y-3.5 text-xs text-text-secondary">
              <li className="flex gap-3">
                <CheckCircle className="text-success mt-0.5 shrink-0" size={16} />
                <div>
                  <strong className="text-text-primary">Verify Dharani Mutation Status</strong>
                  <p className="mt-0.5 leading-relaxed text-[11px]">Request the Patta Passbook and run survey number mutations to verify title clarity.</p>
                </div>
              </li>
              <li className="flex gap-3">
                <CheckCircle className="text-success mt-0.5 shrink-0" size={16} />
                <div>
                  <strong className="text-text-primary">Check Section 22-A Registers</strong>
                  <p className="mt-0.5 leading-relaxed text-[11px]">Verify the land survey numbers are not listed on the prohibited registry list.</p>
                </div>
              </li>
              <li className="flex gap-3">
                <CheckCircle className="text-success mt-0.5 shrink-0" size={16} />
                <div>
                  <strong className="text-text-primary">Validate DTCP/HMDA Layout LP</strong>
                  <p className="mt-0.5 leading-relaxed text-[11px]">Layout numbers should match official master plan layouts and have physical markers.</p>
                </div>
              </li>
              <li className="flex gap-3 bg-warning-light/30 border border-warning/30 p-2 rounded">
                <AlertOctagon className="text-warning mt-0.5 shrink-0" size={16} />
                <div>
                  <strong className="text-text-primary">Lake FTL Boundaries check</strong>
                  <p className="mt-0.5 leading-relaxed text-[11px]">Check with Irrigation Department records to ensure coordinates don't overlap FTL buffers.</p>
                </div>
              </li>
              <li className="flex gap-3">
                <CheckCircle className="text-success mt-0.5 shrink-0" size={16} />
                <div>
                  <strong className="text-text-primary">TG-RERA Registration Status</strong>
                  <p className="mt-0.5 leading-relaxed text-[11px]">Every gated community or layout exceeding 500 sq meters must have active RERA status.</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Quick links to Government Portals */}
          <div className="card-premium space-y-3">
            <h3 className="font-display text-base text-text-primary">Official Registration Links</h3>
            <div className="grid grid-cols-1 gap-2 text-xs">
              <a
                href="https://dharani.telangana.gov.in"
                target="_blank"
                rel="noopener noreferrer"
                className="card-interactive flex items-center justify-between p-3 font-bold text-accent"
              >
                <span>Dharani Land Portal</span> <ExternalLink size={12} />
              </a>
              <a
                href="https://rera.telangana.gov.in"
                target="_blank"
                rel="noopener noreferrer"
                className="card-interactive flex items-center justify-between p-3 font-bold text-accent"
              >
                <span>TG-RERA Portal</span> <ExternalLink size={12} />
              </a>
              <a
                href="https://hmda.gov.in"
                target="_blank"
                rel="noopener noreferrer"
                className="card-interactive flex items-center justify-between p-3 font-bold text-accent"
              >
                <span>HMDA Planning Maps</span> <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>

        {/* Right Side: Risks Explorer */}
        <div className="lg:col-span-2 space-y-6 stagger-2 animate-fade-in-up">
          
          {/* Filters Row */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 card-premium !py-3">
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-2.5 text-text-secondary" size={15} />
              <input
                type="text"
                placeholder="Search survey risks, corridors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-premium w-full pl-9 pr-3 py-1.5"
              />
            </div>

            <div className="flex flex-wrap gap-1 w-full md:w-auto">
              {["ALL", "LAND_RECORDS", "RESTRICTIONS", "APPROVALS", "RERA"].map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={activeCategory === cat ? "filter-pill-active text-[10px]" : "filter-pill text-[10px]"}
                >
                  {cat.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Risks list */}
          <div className="space-y-4">
            {filteredRisks.length === 0 ? (
              <div className="card-premium p-12 text-center text-text-secondary text-xs italic">
                No matching legal risks found. Try adjusting filters or search query.
              </div>
            ) : (
              filteredRisks.map((risk) => {
                const isRed = risk.severity === "RED";
                const isOrange = risk.severity === "ORANGE";
                
                const borderColor = isRed ? "border-l-danger" : isOrange ? "border-l-warning" : "border-l-success";
                const badgeColor = isRed ? "bg-danger/10 text-danger border-danger/20" : isOrange ? "bg-warning/10 text-warning border-warning/20" : "bg-success/10 text-success border-success/20";

                return (
                  <div 
                    key={risk.id}
                    className={`card-premium space-y-3 border-l-4 ${borderColor}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold border uppercase tracking-wider ${badgeColor}`}>
                          {risk.severity} Severity
                        </span>
                        <h4 className="font-display text-lg text-text-primary mt-1">{risk.title}</h4>
                      </div>
                      <span className="text-[10px] font-mono text-accent bg-accent/10 px-2 py-0.5 rounded uppercase">
                        {risk.category.replace(/_/g, " ")}
                      </span>
                    </div>

                    <p className="text-xs text-text-secondary leading-relaxed">
                      {risk.description}
                    </p>

                    <div className="bg-surface-dim p-4 rounded border border-gray-100 space-y-2 text-xs">
                      <div>
                        <strong className="text-text-primary">Validation check instructions:</strong>
                        <p className="text-text-secondary mt-0.5 leading-relaxed">{risk.checkMethod}</p>
                      </div>
                      <div className="flex items-center justify-between gap-4 pt-2 border-t border-gray-100">
                        <span className="font-mono text-[9px] text-text-secondary">
                          Ref: <strong className="text-text-primary font-bold">{risk.govReference || "Official Registry"}</strong>
                        </span>
                        {risk.checkUrl && (
                          <a
                            href={risk.checkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-mono text-[10px] text-accent hover:text-accent-gold font-bold transition-colors"
                          >
                            Verify Online <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    </div>

                    {risk.affectedZones?.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-2">
                        <span className="text-[9px] text-text-secondary font-mono uppercase font-bold">Risk Boundaries:</span>
                        {risk.affectedZones.map((z: string) => (
                          <span key={z} className="bg-surface-dim px-2 py-0.5 rounded text-[10px] font-mono text-text-primary border border-gray-100">
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
      <div className="bg-surface-dim border-t border-gray-200 py-6 text-center text-[10px] text-text-secondary font-mono">
        <p>UrbanVenture Legal Advisory. Compiled from Dharani, RERA Telangana, and HMDA layout notifications.</p>
      </div>
    </div>
  );
}
