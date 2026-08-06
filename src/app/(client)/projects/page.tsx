"use client";

import React, { useState, useEffect } from "react";
import ProjectCard from "@/components/client/ProjectCard";
import { SlidersHorizontal, Loader2, MapPin, Building, Activity, IndianRupee } from "lucide-react";

export default function PublicProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter states
  const [selectedCorridor, setSelectedCorridor] = useState("ALL");
  const [selectedRisk, setSelectedRisk] = useState("ALL");
  const [selectedType, setSelectedType] = useState("ALL");
  const [budgetRange, setBudgetRange] = useState("ALL"); // ALL, <30L, 30-60L, 60-120L, >120L

  useEffect(() => {
    async function fetchProjects() {
      setIsLoading(true);
      try {
        let url = `/api/projects?status=ACTIVE`;
        
        if (selectedCorridor !== "ALL") {
          url += `&corridor=${encodeURIComponent(selectedCorridor)}`;
        }
        if (selectedRisk !== "ALL") {
          url += `&risk=${selectedRisk}`;
        }
        if (selectedType !== "ALL") {
          url += `&type=${selectedType}`;
        }
        
        // Add budget filters
        if (budgetRange === "<30L") {
          url += `&maxBudget=30`;
        } else if (budgetRange === "30-60L") {
          url += `&minBudget=30&maxBudget=60`;
        } else if (budgetRange === "60-120L") {
          url += `&minBudget=60&maxBudget=120`;
        } else if (budgetRange === ">120L") {
          url += `&minBudget=120`;
        }

        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setProjects(data);
        }
      } catch (err) {
        console.error("Error loading projects:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchProjects();
  }, [selectedCorridor, selectedRisk, selectedType, budgetRange]);

  const corridors = [
    "Shadnagar Corridor",
    "Pharma City Influence Zone",
    "Sangareddy Industrial Belt",
    "Kokapet / Financial District Extension",
    "Shamshabad / Aerospace SEZ",
    "Yadadri / Outer Ring Road East",
    "Kompally / NH44 Corridor",
    "Adibatla IT Corridor"
  ];

  return (
    <div className="flex-grow py-12 px-4 sm:px-6 lg:px-8 bg-surface-dim font-sans min-h-screen">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-4 animate-fade-in-down">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-light text-accent text-[10px] font-mono uppercase tracking-wider">
            <Building size={12} /> Investment Grade Properties
          </div>
          <h1 className="font-display text-3xl sm:text-5xl font-bold text-text-primary">
            Curated Premium Projects
          </h1>
          <p className="text-sm text-text-secondary leading-relaxed">
            Browse premium investment-mapped properties across Hyderabad's highest performing growth vectors. Verified for title clarity and growth potential.
          </p>
        </div>

        {/* Filter Bar - Horizontal Scrollable */}
        <div className="bg-surface border border-gray-200 rounded-[12px] p-4 shadow-sm space-y-4 stagger-1 animate-fade-in-up">
          <div className="flex items-center gap-2 text-text-primary font-display font-bold border-b border-gray-100 pb-3">
            <SlidersHorizontal size={18} className="text-accent" />
            <span>Refine Search</span>
            <button
              onClick={() => {
                setSelectedCorridor("ALL");
                setSelectedRisk("ALL");
                setSelectedType("ALL");
                setBudgetRange("ALL");
              }}
              className="ml-auto text-[10px] text-text-secondary hover:text-danger uppercase tracking-wider font-bold transition-colors"
            >
              Clear All
            </button>
          </div>

          <div className="space-y-4">
            {/* Corridor Filters */}
            <div className="flex items-center gap-3">
              <span className="text-[10px] uppercase font-bold text-text-secondary tracking-wider flex items-center gap-1 min-w-[80px]">
                <MapPin size={12} /> Corridor
              </span>
              <div className="flex overflow-x-auto pb-2 -mb-2 gap-2 hide-scrollbar">
                <button
                  onClick={() => setSelectedCorridor("ALL")}
                  className={selectedCorridor === "ALL" ? "filter-pill-active whitespace-nowrap text-[11px]" : "filter-pill whitespace-nowrap text-[11px]"}
                >
                  All Corridors
                </button>
                {corridors.map((c) => (
                  <button
                    key={c}
                    onClick={() => setSelectedCorridor(c)}
                    className={selectedCorridor === c ? "filter-pill-active whitespace-nowrap text-[11px]" : "filter-pill whitespace-nowrap text-[11px]"}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Budget Filters */}
            <div className="flex items-center gap-3">
              <span className="text-[10px] uppercase font-bold text-text-secondary tracking-wider flex items-center gap-1 min-w-[80px]">
                <IndianRupee size={12} /> Budget
              </span>
              <div className="flex overflow-x-auto pb-2 -mb-2 gap-2 hide-scrollbar">
                {[
                  { id: "ALL", label: "Any Budget" },
                  { id: "<30L", label: "Under ₹30 Lakhs" },
                  { id: "30-60L", label: "₹30L - ₹60 Lakhs" },
                  { id: "60-120L", label: "₹60L - ₹1.2 Crores" },
                  { id: ">120L", label: "Above ₹1.2 Crores" }
                ].map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setBudgetRange(b.id)}
                    className={budgetRange === b.id ? "filter-pill-active whitespace-nowrap text-[11px]" : "filter-pill whitespace-nowrap text-[11px]"}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Combined Risk & Type Filters */}
            <div className="flex flex-col md:flex-row gap-6 border-t border-gray-100 pt-3 mt-1">
              <div className="flex items-center gap-3">
                <span className="text-[10px] uppercase font-bold text-text-secondary tracking-wider flex items-center gap-1 min-w-[80px]">
                  <Activity size={12} /> Risk Rating
                </span>
                <div className="flex gap-2">
                  {["ALL", "LOW", "MEDIUM", "HIGH"].map((r) => (
                    <button
                      key={r}
                      onClick={() => setSelectedRisk(r)}
                      className={selectedRisk === r ? "filter-pill-active whitespace-nowrap text-[11px]" : "filter-pill whitespace-nowrap text-[11px]"}
                    >
                      {r === "ALL" ? "All" : r}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[10px] uppercase font-bold text-text-secondary tracking-wider flex items-center gap-1 min-w-[80px]">
                  <Building size={12} /> Type
                </span>
                <div className="flex gap-2">
                  {["ALL", "Plots", "Residential", "Villa", "Commercial"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setSelectedType(t)}
                      className={selectedType === t ? "filter-pill-active whitespace-nowrap text-[11px]" : "filter-pill whitespace-nowrap text-[11px]"}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Listings Grid */}
        <div className="stagger-2 animate-fade-in-up">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="card-premium h-80 animate-pulse p-4 space-y-4">
                  <div className="bg-gray-200 h-48 rounded-lg" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                </div>
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="card-premium p-16 text-center space-y-4 border-dashed border-2">
              <span className="text-4xl">🔍</span>
              <h3 className="font-display text-xl font-bold text-text-primary">No Matching Projects Found</h3>
              <p className="text-sm text-text-secondary max-w-sm mx-auto leading-relaxed">
                We couldn't find any projects matching your exact criteria. Try broadening your filters or contact our advisory team for off-market listings.
              </p>
              <button
                onClick={() => {
                  setSelectedCorridor("ALL");
                  setSelectedRisk("ALL");
                  setSelectedType("ALL");
                  setBudgetRange("ALL");
                }}
                className="btn-secondary mt-4 inline-block"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <div key={project.id} className="w-full">
                  <ProjectCard project={project} />
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
