"use client";

import React, { useState } from "react";
import Link from "next/link";
import ProjectCard from "./ProjectCard";

interface CorridorRecommendation {
  name: string;
  area: string;
  matchScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  appreciationMin: number;
  appreciationMax: number;
  reasons: string[];
  infraHighlights: string[];
  exitOpportunities: string[];
  bestFor: string;
}

interface ReportData {
  executiveSummary: string;
  corridors: CorridorRecommendation[];
  overallRiskScore: number;
  riskRationale: string;
  marketOutlook: string;
  disclaimer: string;
}

interface ReportCardProps {
  searchId: string;
  report: ReportData;
  allProjects: any[];
  userProvidedContact: boolean;
  budget: number;
  horizon: number;
  city: string;
}

export default function ReportCard({
  searchId,
  report,
  allProjects,
  userProvidedContact,
  budget,
  horizon,
  city,
}: ReportCardProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Calculate compact ROI
  const firstCorridor = report.corridors?.[0];
  const cagrMin = firstCorridor ? firstCorridor.appreciationMin : 12;
  const cagrMax = firstCorridor ? firstCorridor.appreciationMax : 18;
  const rentMin = 2;
  const rentMax = 4;

  let reValMin = budget;
  let reValMax = budget;
  let rentCumMin = 0;
  let rentCumMax = 0;
  let fdVal = budget;
  let niftyVal = budget;

  for (let y = 1; y <= horizon; y++) {
    reValMin = reValMin * (1 + cagrMin / 100);
    reValMax = reValMax * (1 + cagrMax / 100);
    const prevMinVal = y === 1 ? budget : reValMin / (1 + cagrMin / 100);
    const prevMaxVal = y === 1 ? budget : reValMax / (1 + cagrMax / 100);
    rentCumMin += prevMinVal * (rentMin / 100);
    rentCumMax += prevMaxVal * (rentMax / 100);
    fdVal = fdVal * (1 + 0.065);
    niftyVal = niftyVal * (1 + 0.12);
  }

  const finalRETotalMin = reValMin + rentCumMin;
  const finalRETotalMax = reValMax + rentCumMax;

  const formatPriceLocal = (val: number) => {
    return val < 100 ? `₹${val.toFixed(1)}L` : `₹${(val / 100).toFixed(2)}Cr`;
  };
  
  // Lead Capture state (in case they didn't fill it initially)
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handlePrint = () => {
    window.print();
  };

  const handleSaveReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name || !phone) {
      setErrorMsg("Please fill out all fields.");
      return;
    }
    setErrorMsg("");
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          searchId,
          budget,
          horizon,
          city,
          name,
          email,
          phone,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
      } else {
        setErrorMsg(data.error || "Failed to save report.");
      }
    } catch (err: any) {
      setErrorMsg("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "LOW":
        return "bg-green-50 text-green-700 border-green-200";
      case "MEDIUM":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "HIGH":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="print-container max-w-4xl mx-auto space-y-10">
      
      {/* Action bar (Hide on print) */}
      <div className="no-print flex justify-between items-center bg-surface border border-luxury p-4 rounded-card shadow-sm">
        <div className="flex flex-col">
          <span className="text-[10px] text-text-secondary uppercase tracking-widest font-bold">Report Generated</span>
          <span className="text-xs font-semibold text-text-primary">Search ID: {searchId}</span>
        </div>
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-4 py-2 border border-primary text-primary hover:bg-primary hover:text-surface text-xs font-semibold uppercase tracking-wider rounded-[4px] transition-all"
        >
          🖨️ Print / Download PDF
        </button>
      </div>

      {/* Main Report Document */}
      <div className="bg-surface border border-luxury p-6 sm:p-10 rounded-card shadow-luxury-soft space-y-10 relative">
        
        {/* Luxury Watermark Header (Only visible on print/PDF) */}
        <div className="hidden print:flex justify-between items-center border-b border-luxury pb-6 mb-8">
          <div>
            <span className="font-display text-2xl font-bold tracking-widest text-primary">URBAN VENTURES</span>
            <span className="text-xs text-accent font-semibold ml-2 uppercase tracking-widest">Investment Report</span>
          </div>
          <div className="text-right text-xs text-text-secondary">
            <div>City: {city}</div>
            <div>Budget: ₹{budget}L · Horizon: {horizon} Years</div>
          </div>
        </div>

        {/* Executive Summary */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="h-4 w-1 bg-accent" />
            <h2 className="font-display text-2xl font-bold text-primary">Executive Summary</h2>
          </div>
          <p className="text-text-primary leading-relaxed text-base">
            {report.executiveSummary}
          </p>
        </section>

        {/* Compact ROI Calculator Widget */}
        <section className="no-print bg-slate-50 border border-slate-200/80 p-5 rounded-card space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                📈 Future Wealth Multiplier Projections (Compact)
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Simulated growth of ₹{budget}L over {horizon} years in {firstCorridor?.name || "Hyderabad growth corridors"}
              </p>
            </div>
            <Link
              href={`/calculator?amount=${budget}&corridor=${encodeURIComponent(firstCorridor?.name || "")}`}
              className="text-[10px] uppercase font-bold tracking-wider text-accent hover:underline"
            >
              Open Interactive Calculator →
            </Link>
          </div>

          <div className="space-y-3 pt-1">
            {/* Real Estate Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-700">Real Estate (Appreciation + Rent Yield)</span>
                <span className="text-[#2563EB] font-bold">{formatPriceLocal(finalRETotalMin)} - {formatPriceLocal(finalRETotalMax)}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden flex">
                <div className="h-full bg-[#2563EB]" style={{ width: "100%" }} />
              </div>
            </div>

            {/* Nifty Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-700">Nifty 50 Index (Stock Market @ 12%)</span>
                <span className="text-slate-800 font-bold">{formatPriceLocal(niftyVal)}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${(niftyVal / finalRETotalMax) * 100}%` }} />
              </div>
            </div>

            {/* FD Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-700">Fixed Deposit (Debt Market @ 6.5%)</span>
                <span className="text-slate-800 font-bold">{formatPriceLocal(fdVal)}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                <div className="h-full bg-slate-400" style={{ width: `${(fdVal / finalRETotalMax) * 100}%` }} />
              </div>
            </div>
          </div>
        </section>

        {/* Recommended Corridors */}
        <section className="space-y-6">
          <div className="flex items-center gap-2">
            <span className="h-4 w-1 bg-accent" />
            <h2 className="font-display text-2xl font-bold text-primary">Recommended Investment Corridors</h2>
          </div>

          <div className="space-y-6">
            {report.corridors.map((corridor, idx) => {
              // Filter comparable projects for this corridor in budget range
              const matchedProjects = allProjects.filter((p) => {
                const corridorMatch = p.corridor.toLowerCase().includes(corridor.name.split(" ")[0].toLowerCase());
                return corridorMatch;
              });

              return (
                <div 
                  key={idx} 
                  className="border border-luxury rounded-card p-6 hover:shadow-sm transition-all bg-luxury-bg/30"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div>
                      <h3 className="font-display text-xl font-bold text-primary">
                        {corridor.name}
                      </h3>
                      <span className="text-xs text-text-secondary uppercase tracking-wider">
                        {corridor.area}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-primary text-white border border-white/20 font-bold px-2.5 py-0.5 rounded-tag uppercase tracking-wider inline-flex items-center justify-center text-center">
                        {corridor.matchScore}% Match
                      </span>
                      <span className={`text-xs border px-2 py-0.5 rounded-tag font-semibold uppercase tracking-wider ${getRiskColor(corridor.riskLevel)}`}>
                        {corridor.riskLevel} Risk
                      </span>
                    </div>
                  </div>

                  {/* Appreciation Range */}
                  <div className="bg-surface border border-luxury p-3 rounded-input flex justify-between items-center mb-4 text-sm">
                    <span className="text-text-secondary">Expected Appreciation Range:</span>
                    <span className="font-bold text-accent font-display text-base">
                      {corridor.appreciationMin}% - {corridor.appreciationMax}% over {horizon} years
                    </span>
                  </div>

                  {/* Reasons & Highlights Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary mb-2">
                        Investment Rationale
                      </h4>
                      <ul className="space-y-2">
                        {corridor.reasons.map((r, i) => (
                          <li key={i} className="text-xs text-text-secondary flex gap-2">
                            <span className="text-accent">•</span>
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary mb-2">
                          Key Infrastructure Highlights
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {corridor.infraHighlights.map((tag, i) => (
                            <span key={i} className="text-[10px] font-semibold text-primary bg-surface border border-luxury px-2 py-1 rounded-tag">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary mb-2">
                          Exit Opportunities
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {corridor.exitOpportunities.map((exit, i) => (
                            <span key={i} className="text-[10px] font-medium text-text-secondary bg-surface border border-luxury px-2 py-0.5 rounded-tag">
                              {exit}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Best For Info */}
                  <p className="text-xs italic text-text-secondary border-t border-luxury pt-3">
                    <strong>Optimal Investor Type:</strong> {corridor.bestFor}
                  </p>

                  {/* Comparable Projects (No Print in this horizontal carousel for printability, we can show them listed if print, or keep simple) */}
                  {matchedProjects.length > 0 && (
                    <div className="mt-6 border-t border-luxury pt-6">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary mb-3 no-print">
                        Comparable Active Projects in this Corridor
                      </h4>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary mb-3 hidden print:block">
                        Comparable Projects: {matchedProjects.map(p => p.name).join(", ")}
                      </h4>
                      
                      <div className="no-print flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-luxury">
                        {matchedProjects.map((project) => (
                          <ProjectCard key={project.id} project={project} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Portfolio Risk Assessment */}
        <section className="border border-luxury rounded-card p-6 bg-primary text-surface grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="text-center md:text-left">
            <span className="text-[10px] text-accent font-bold uppercase tracking-widest">Risk Analysis</span>
            <h3 className="font-display text-xl font-bold mb-2">Overall Portfolio Risk</h3>
            <p className="text-xs text-gray-400">Calculated based on investment parameters and corridor allocations.</p>
          </div>

          <div className="flex flex-col items-center justify-center">
            {/* Visual Risk Gauge (simple meter) */}
            <div className="relative flex items-center justify-center w-24 h-24 rounded-full border-4 border-primary-light bg-primary-light">
              <span className="text-3xl font-display font-bold text-accent">
                {report.overallRiskScore}
              </span>
              <span className="absolute bottom-2 text-[8px] text-gray-400 font-bold uppercase">
                Scale 1-10
              </span>
            </div>
          </div>

          <div className="text-xs text-gray-300 space-y-2 leading-relaxed">
            <h4 className="font-bold text-accent uppercase tracking-wider">Risk Rationale</h4>
            <p>{report.riskRationale}</p>
          </div>
        </section>

        {/* Market Outlook & Disclaimer */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-luxury pt-8 text-xs text-text-secondary">
          <div className="space-y-2">
            <h4 className="font-bold uppercase text-text-primary tracking-wider">Market Outlook</h4>
            <p className="leading-relaxed">{report.marketOutlook}</p>
          </div>
          <div className="space-y-2">
            <h4 className="font-bold uppercase text-text-primary tracking-wider">Advisor Disclaimer</h4>
            <p className="leading-relaxed">{report.disclaimer}</p>
          </div>
        </section>
      </div>

      {/* Save Report & CTA Section (Hide on print) */}
      <div className="no-print bg-surface border border-luxury p-6 sm:p-8 rounded-card shadow-sm text-center max-w-2xl mx-auto">
        {userProvidedContact || saveSuccess ? (
          <div className="space-y-3">
            <div className="text-2xl">✅</div>
            <h3 className="font-display text-xl font-bold text-primary">Report Saved & Consultation Requested</h3>
            <p className="text-xs text-text-secondary max-w-md mx-auto leading-relaxed">
              Our real estate advisor has received your parameters (Budget: ₹{budget}L, Horizon: {horizon}Y). We will reach out within 24 business hours to share RERA document packs and schedule a site visit.
            </p>
            <div className="text-xs text-accent font-semibold uppercase tracking-wider mt-4">
              Need immediate help? Call us at +91 40 4444 8888
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="font-display text-2xl font-bold text-primary">Schedule a Detailed Consultation</h3>
              <p className="text-xs text-text-secondary max-w-md mx-auto leading-relaxed">
                Save this report to your profile and request a call from our Hyderabad market specialist. We will provide pricing sheets and RERA brochures for comparable projects.
              </p>
            </div>

            <form onSubmit={handleSaveReport} className="max-w-md mx-auto space-y-3 text-left">
              <div>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-luxury-bg border border-luxury px-3 py-2 rounded-input text-xs text-text-primary focus:outline-none focus:border-accent"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-luxury-bg border border-luxury px-3 py-2 rounded-input text-xs text-text-primary focus:outline-none focus:border-accent"
                  required
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-luxury-bg border border-luxury px-3 py-2 rounded-input text-xs text-text-primary focus:outline-none focus:border-accent"
                  required
                />
              </div>
              
              {errorMsg && (
                <p className="text-red-600 text-xs text-center">{errorMsg}</p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-primary hover:bg-primary-light text-surface text-xs font-semibold uppercase tracking-widest rounded-[4px] disabled:opacity-50 transition-all"
              >
                {isSubmitting ? "Saving Report..." : "Save Report & Schedule Consultation"}
              </button>
            </form>
          </div>
        )}
      </div>

    </div>
  );
}
