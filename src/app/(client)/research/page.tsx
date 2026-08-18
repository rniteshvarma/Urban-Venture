"use client";

import React, { useState, useEffect } from "react";
import ResearchForm from "@/components/client/ResearchForm";
import ReportCard from "@/components/client/ReportCard";
import { PageHero } from "@/components/ui";
import { Bot } from "lucide-react";

const RESEARCH_STEPS = [
  "Analysing 15 Hyderabad corridors…",
  "Cross-referencing 12 government infrastructure projects…",
  "Checking HMDA & RERA approval records…",
  "Modelling 5-year appreciation scenarios…",
];

export default function ResearchPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<any | null>(null);
  const [searchId, setSearchId] = useState<string>("");
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [contactProvided, setContactProvided] = useState(false);
  const [formData, setFormData] = useState({ budget: 0, horizon: 0, city: "" });
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    async function loadProjects() {
      try {
        const res = await fetch("/api/projects");
        if (res.ok) setAllProjects(await res.json());
      } catch (err) {
        console.error("Failed to load projects:", err);
      }
    }
    loadProjects();
  }, []);

  // cycle the "researching…" status lines while loading
  useEffect(() => {
    if (!isLoading) {
      setStepIdx(0);
      return;
    }
    const id = setInterval(() => setStepIdx((i) => Math.min(i + 1, RESEARCH_STEPS.length - 1)), 1100);
    return () => clearInterval(id);
  }, [isLoading]);

  const handleFormSubmit = async (data: { budget: number; horizon: number; city: string; name?: string; email?: string; phone?: string }) => {
    setIsLoading(true);
    setReportData(null);
    setContactProvided(!!data.email);
    setFormData({ budget: data.budget, horizon: data.horizon, city: data.city });

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const responseData = await res.json();
      if (responseData.success) {
        setReportData(responseData.recommendations);
        setSearchId(responseData.searchId);
      } else {
        alert(responseData.details ? `${responseData.error}: ${responseData.details}` : responseData.error || "An error occurred during recommendations generation.");
      }
    } catch (err: any) {
      console.error(err);
      alert(`Failed to connect to the recommendations server: ${err.message || "Connection failed"}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ background: "var(--color-paper)", minHeight: "100vh" }}>
      {!reportData && (
        <div className="no-print">
          <PageHero
            eyebrow={<><Bot size={12} /> AI Advisory Engine</>}
            title="AI Investment Advisory"
            subtitle="Three inputs — budget, horizon, city. We generate a tailored research report covering Hyderabad's growth corridors, risk indexes, and projected appreciation."
          />
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8" style={{ paddingTop: reportData ? "2rem" : "2.5rem", paddingBottom: "4rem" }}>
        {!reportData && !isLoading && (
          <div className="no-print animate-fade-in">
            <React.Suspense fallback={<div className="h-64 flex items-center justify-center text-sm text-slate-400">Loading form…</div>}>
              <ResearchForm onSubmit={handleFormSubmit} isLoading={isLoading} />
            </React.Suspense>
          </div>
        )}

        {/* Dark "researching" state with sequential status lines */}
        {isLoading && (
          <div className="no-print" style={{ background: "var(--color-ink)", borderRadius: "var(--radius-uv-lg)", padding: "clamp(2rem, 5vw, 3.5rem)", maxWidth: 620, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--color-saffron)", fontFamily: "var(--font-mono)", fontSize: "0.75rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              <span className="animate-pulse-glow" style={{ width: 8, height: 8, borderRadius: 999, background: "var(--color-saffron)" }} /> Researching {formData.city || "Hyderabad"}
            </div>
            <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 14 }}>
              {RESEARCH_STEPS.map((s, i) => {
                const state = i < stepIdx ? "done" : i === stepIdx ? "active" : "pending";
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, opacity: state === "pending" ? 0.35 : 1, transition: "opacity 300ms ease" }}>
                    <span style={{ width: 18, height: 18, borderRadius: 999, flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", border: `2px solid ${state === "pending" ? "var(--color-ink-line)" : "var(--color-saffron)"}`, background: state === "done" ? "var(--color-saffron)" : "transparent", color: "var(--color-ink)", fontSize: 11, fontWeight: 800 }}>
                      {state === "done" ? "✓" : ""}
                    </span>
                    <span style={{ color: state === "active" ? "#fff" : "var(--color-text-invert-mid)", fontSize: "0.9375rem" }}>{s}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {reportData && !isLoading && (
          <div className="animate-fade-in">
            <div className="no-print" style={{ marginBottom: 16 }}>
              <button onClick={() => setReportData(null)} className="uv-btn uv-btn-ghost" style={{ padding: "8px 14px", fontSize: "0.8125rem" }}>
                ← Edit Parameters
              </button>
            </div>
            <ReportCard
              searchId={searchId}
              report={reportData}
              allProjects={allProjects}
              userProvidedContact={contactProvided}
              budget={formData.budget}
              horizon={formData.horizon}
              city={formData.city}
            />
          </div>
        )}
      </div>
    </div>
  );
}
