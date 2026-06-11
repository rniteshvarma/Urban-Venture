"use client";

import React, { useState, useEffect } from "react";
import ResearchForm from "@/components/client/ResearchForm";
import ReportCard from "@/components/client/ReportCard";

export default function ResearchPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<any | null>(null);
  const [searchId, setSearchId] = useState<string>("");
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [contactProvided, setContactProvided] = useState(false);
  
  // Save form parameters to pass back to ReportCard if they request consultation later
  const [formData, setFormData] = useState({
    budget: 0,
    horizon: 0,
    city: "",
  });

  // Fetch projects on load to use as comparables
  useEffect(() => {
    async function loadProjects() {
      try {
        const res = await fetch("/api/projects");
        if (res.ok) {
          const data = await res.ok ? await res.json() : [];
          setAllProjects(data);
        }
      } catch (err) {
        console.error("Failed to load projects:", err);
      }
    }
    loadProjects();
  }, []);

  const handleFormSubmit = async (data: {
    budget: number;
    horizon: number;
    city: string;
    name?: string;
    email?: string;
    phone?: string;
  }) => {
    setIsLoading(true);
    setReportData(null);
    setContactProvided(!!data.email);
    setFormData({
      budget: data.budget,
      horizon: data.horizon,
      city: data.city,
    });

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
        alert(responseData.details ? `${responseData.error}: ${responseData.details}` : (responseData.error || "An error occurred during recommendations generation."));
      }
    } catch (err: any) {
      console.error(err);
      alert(`Failed to connect to the recommendations server: ${err.message || "Connection failed"}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-grow py-12 px-4 sm:px-6 lg:px-8 bg-luxury-bg">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Page Header (Hide on print) */}
        <div className="no-print text-center max-w-2xl mx-auto space-y-3">
          <h1 className="font-display text-3xl sm:text-5xl font-bold text-primary">
            AI Investment Advisory
          </h1>
          <p className="text-sm sm:text-base text-text-secondary leading-relaxed">
            Specify your parameters below to generate a tailored market intelligence report covering Hyderabad's growth corridors, risk indexes, and projected appreciation.
          </p>
        </div>

        {/* Form or Report */}
        {!reportData && !isLoading ? (
          <div className="no-print animate-fade-in">
            <ResearchForm onSubmit={handleFormSubmit} isLoading={isLoading} />
          </div>
        ) : null}

        {/* Loading Skeleton */}
        {isLoading ? (
          <div className="no-print max-w-2xl mx-auto bg-surface border border-luxury p-8 rounded-card shadow-sm space-y-6 animate-pulse">
            <div className="h-4 bg-luxury-border rounded w-1/3 mx-auto" />
            <div className="h-8 bg-luxury-border rounded w-2/3 mx-auto" />
            <div className="space-y-3 pt-6">
              <div className="h-4 bg-luxury-border rounded" />
              <div className="h-4 bg-luxury-border rounded w-5/6" />
              <div className="h-4 bg-luxury-border rounded w-4/5" />
            </div>
            <div className="grid grid-cols-2 gap-4 pt-6">
              <div className="h-20 bg-luxury-border rounded" />
              <div className="h-20 bg-luxury-border rounded" />
            </div>
            <div className="h-12 bg-primary/20 rounded w-full pt-4 flex items-center justify-center text-xs font-semibold text-primary uppercase tracking-widest">
              Analyzing {formData.city} real estate patterns...
            </div>
          </div>
        ) : null}

        {/* Report Output */}
        {reportData && !isLoading ? (
          <div className="animate-fade-in">
            {/* Back to Form Button (Hide on print) */}
            <div className="no-print max-w-4xl mx-auto mb-4">
              <button
                onClick={() => setReportData(null)}
                className="text-xs font-bold text-primary hover:text-accent border border-luxury px-3 py-1.5 rounded-tag bg-surface uppercase tracking-wider transition-colors"
              >
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
        ) : null}

      </div>
    </div>
  );
}
