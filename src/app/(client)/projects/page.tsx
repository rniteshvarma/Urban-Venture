"use client";

import React, { useState, useEffect } from "react";
import ProjectCard from "@/components/client/ProjectCard";

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
    <div className="flex-grow py-12 px-4 sm:px-6 lg:px-8 bg-luxury-bg">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h1 className="font-display text-3xl sm:text-5xl font-bold text-primary">
            Curated Premium Projects
          </h1>
          <p className="text-sm text-text-secondary">
            Browse premium investment-mapped properties across Hyderabad's highest performing growth vectors.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Filters Sidebar */}
          <div className="bg-surface border border-luxury p-6 rounded-card shadow-sm h-fit space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary border-b border-luxury pb-3">
              Filters
            </h3>

            {/* Corridor Filter */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
                Growth Corridor
              </label>
              <select
                value={selectedCorridor}
                onChange={(e) => setSelectedCorridor(e.target.value)}
                className="w-full bg-luxury-bg border border-luxury px-3 py-2 rounded-input text-xs text-text-primary focus:outline-none focus:border-accent"
              >
                <option value="ALL">All Corridors</option>
                {corridors.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Budget Range Filter */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
                Budget Range
              </label>
              <select
                value={budgetRange}
                onChange={(e) => setBudgetRange(e.target.value)}
                className="w-full bg-luxury-bg border border-luxury px-3 py-2 rounded-input text-xs text-text-primary focus:outline-none focus:border-accent"
              >
                <option value="ALL">Any Budget</option>
                <option value="<30L">Under ₹30 Lakhs</option>
                <option value="30-60L">₹30L - ₹60 Lakhs</option>
                <option value="60-120L">₹60L - ₹1.2 Crores</option>
                <option value=">120L">Above ₹1.2 Crores</option>
              </select>
            </div>

            {/* Risk Level Filter */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
                Risk Rating
              </label>
              <select
                value={selectedRisk}
                onChange={(e) => setSelectedRisk(e.target.value)}
                className="w-full bg-luxury-bg border border-luxury px-3 py-2 rounded-input text-xs text-text-primary focus:outline-none focus:border-accent"
              >
                <option value="ALL">All Ratings</option>
                <option value="LOW">LOW Risk</option>
                <option value="MEDIUM">MEDIUM Risk</option>
                <option value="HIGH">HIGH Risk</option>
              </select>
            </div>

            {/* Property Type Filter */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
                Property Type
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full bg-luxury-bg border border-luxury px-3 py-2 rounded-input text-xs text-text-primary focus:outline-none focus:border-accent"
              >
                <option value="ALL">All Types</option>
                <option value="Plots">Plots</option>
                <option value="Residential">Residential</option>
                <option value="Villa">Villa</option>
                <option value="Commercial">Commercial</option>
              </select>
            </div>

            {/* Reset Button */}
            <button
              onClick={() => {
                setSelectedCorridor("ALL");
                setSelectedRisk("ALL");
                setSelectedType("ALL");
                setBudgetRange("ALL");
              }}
              className="w-full py-2 bg-luxury-bg border border-luxury text-text-secondary hover:text-primary text-xs font-semibold uppercase tracking-wider rounded-tag transition-colors"
            >
              Reset Filters
            </button>
          </div>

          {/* Listings Grid */}
          <div className="lg:col-span-3">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-surface border border-luxury rounded-card h-80 animate-pulse p-4 space-y-4">
                    <div className="bg-luxury-border h-48 rounded-tag" />
                    <div className="h-4 bg-luxury-border rounded w-1/2" />
                    <div className="h-4 bg-luxury-border rounded w-3/4" />
                  </div>
                ))}
              </div>
            ) : projects.length === 0 ? (
              <div className="bg-surface border border-luxury rounded-card p-12 text-center text-text-secondary space-y-3">
                <span className="text-3xl">🔍</span>
                <h3 className="font-display text-lg font-bold text-primary">No Matching Projects Found</h3>
                <p className="text-xs max-w-sm mx-auto">
                  Adjust your filter parameters or request a manual search profile from our advisory team.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {projects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
