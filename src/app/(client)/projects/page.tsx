"use client";

import React, { useState, useEffect, useMemo } from "react";
import { SlidersHorizontal, MapPin, Building, Activity, IndianRupee, Search, X } from "lucide-react";
import { PageHero, ProjectCard, SkeletonCard, EmptyState, type ProjectCardData } from "@/components/ui";

type SortKey = "relevance" | "price_asc" | "price_desc" | "newest";

const CORRIDORS = [
  "Shadnagar Corridor",
  "Pharma City Influence Zone",
  "Sangareddy Industrial Belt",
  "Kokapet / Financial District Extension",
  "Shamshabad / Aerospace SEZ",
  "Yadadri / Outer Ring Road East",
  "Kompally / NH44 Corridor",
  "Adibatla IT Corridor",
];

const BUDGETS = [
  { id: "ALL", label: "Any Budget" },
  { id: "<30L", label: "Under ₹30 Lakhs" },
  { id: "30-60L", label: "₹30L – ₹60 Lakhs" },
  { id: "60-120L", label: "₹60L – ₹1.2 Crores" },
  { id: ">120L", label: "Above ₹1.2 Crores" },
];

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="uv-chip"
      style={{
        cursor: "pointer",
        border: "1px solid var(--color-line)",
        background: active ? "var(--color-saffron)" : "var(--color-surface)",
        color: active ? "var(--color-ink)" : "var(--color-text-mid)",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

export default function PublicProjectsPage() {
  const [projects, setProjects] = useState<ProjectCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedCorridor, setSelectedCorridor] = useState("ALL");
  const [selectedRisk, setSelectedRisk] = useState("ALL");
  const [selectedType, setSelectedType] = useState("ALL");
  const [budgetRange, setBudgetRange] = useState("ALL");
  const [sort, setSort] = useState<SortKey>("relevance");

  const clearAll = () => {
    setSelectedCorridor("ALL");
    setSelectedRisk("ALL");
    setSelectedType("ALL");
    setBudgetRange("ALL");
  };

  useEffect(() => {
    async function fetchProjects() {
      setIsLoading(true);
      try {
        let url = `/api/projects?status=ACTIVE`;
        if (selectedCorridor !== "ALL") url += `&corridor=${encodeURIComponent(selectedCorridor)}`;
        if (selectedRisk !== "ALL") url += `&risk=${selectedRisk}`;
        if (selectedType !== "ALL") url += `&type=${selectedType}`;
        if (budgetRange === "<30L") url += `&maxBudget=30`;
        else if (budgetRange === "30-60L") url += `&minBudget=30&maxBudget=60`;
        else if (budgetRange === "60-120L") url += `&minBudget=60&maxBudget=120`;
        else if (budgetRange === ">120L") url += `&minBudget=120`;

        const res = await fetch(url);
        if (res.ok) setProjects(await res.json());
      } catch (err) {
        console.error("Error loading projects:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchProjects();
  }, [selectedCorridor, selectedRisk, selectedType, budgetRange]);

  const sorted = useMemo(() => {
    const arr = [...projects];
    if (sort === "price_asc") arr.sort((a, b) => a.minBudgetLakhs - b.minBudgetLakhs);
    else if (sort === "price_desc") arr.sort((a, b) => b.minBudgetLakhs - a.minBudgetLakhs);
    return arr;
  }, [projects, sort]);

  // Applied filters as removable chips
  const applied: { label: string; clear: () => void }[] = [];
  if (selectedCorridor !== "ALL") applied.push({ label: selectedCorridor, clear: () => setSelectedCorridor("ALL") });
  if (budgetRange !== "ALL") applied.push({ label: BUDGETS.find((b) => b.id === budgetRange)!.label, clear: () => setBudgetRange("ALL") });
  if (selectedRisk !== "ALL") applied.push({ label: `${selectedRisk} risk`, clear: () => setSelectedRisk("ALL") });
  if (selectedType !== "ALL") applied.push({ label: selectedType, clear: () => setSelectedType("ALL") });

  return (
    <div style={{ background: "var(--color-paper)", minHeight: "100vh" }}>
      <PageHero
        eyebrow={<><Building size={12} /> Investment Grade Properties</>}
        title="Curated Premium Projects"
        subtitle="Browse premium, investment-mapped properties across Hyderabad's highest-performing growth corridors — verified for title clarity and growth potential."
        size="md"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" style={{ paddingTop: "2.25rem", paddingBottom: "4rem" }}>
        {/* Filter panel */}
        <div className="uv-card" style={{ padding: "1.15rem 1.35rem", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 12, borderBottom: "1px solid var(--color-line)", color: "var(--color-text-hi)", fontWeight: 700, fontFamily: "var(--font-jakarta)" }}>
            <SlidersHorizontal size={17} style={{ color: "var(--color-saffron-deep)" }} />
            <span>Refine Search</span>
            <button onClick={clearAll} style={{ marginLeft: "auto", fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--color-text-lo)", background: "none", border: "none", cursor: "pointer" }}>
              Clear All
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 14 }}>
            <FilterRow icon={<MapPin size={12} />} label="Corridor">
              <Chip active={selectedCorridor === "ALL"} onClick={() => setSelectedCorridor("ALL")}>All Corridors</Chip>
              {CORRIDORS.map((c) => <Chip key={c} active={selectedCorridor === c} onClick={() => setSelectedCorridor(c)}>{c}</Chip>)}
            </FilterRow>
            <FilterRow icon={<IndianRupee size={12} />} label="Budget">
              {BUDGETS.map((b) => <Chip key={b.id} active={budgetRange === b.id} onClick={() => setBudgetRange(b.id)}>{b.label}</Chip>)}
            </FilterRow>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 24, borderTop: "1px solid var(--color-line)", paddingTop: 14 }}>
              <FilterRow icon={<Activity size={12} />} label="Risk Rating" inline>
                {["ALL", "LOW", "MEDIUM", "HIGH"].map((r) => <Chip key={r} active={selectedRisk === r} onClick={() => setSelectedRisk(r)}>{r === "ALL" ? "All" : r}</Chip>)}
              </FilterRow>
              <FilterRow icon={<Building size={12} />} label="Type" inline>
                {["ALL", "Plots", "Residential", "Villa", "Commercial"].map((t) => <Chip key={t} active={selectedType === t} onClick={() => setSelectedType(t)}>{t === "ALL" ? "All" : t}</Chip>)}
              </FilterRow>
            </div>
          </div>
        </div>

        {/* Result count + applied chips + sort */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "var(--color-text-mid)" }}>
            {isLoading ? "Loading…" : `${sorted.length} project${sorted.length === 1 ? "" : "s"}`}
          </span>
          {applied.map((a) => (
            <button key={a.label} onClick={a.clear} className="uv-chip uv-chip-saffron" style={{ cursor: "pointer", border: "none" }}>
              {a.label} <X size={12} />
            </button>
          ))}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "0.75rem", color: "var(--color-text-lo)" }}>Sort</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="input-premium" style={{ padding: "8px 12px", fontSize: "0.8125rem", width: "auto" }}>
              <option value="relevance">Relevance</option>
              <option value="price_asc">Price ↑</option>
              <option value="price_desc">Price ↓</option>
              <option value="newest">Newest</option>
            </select>
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} variant="project" />)}
          </div>
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={<Search size={24} />}
            title="No matching projects found"
            description="We couldn't find projects matching your exact criteria. Try broadening your filters, or contact our advisory team for off-market listings."
            action={<button onClick={clearAll} className="uv-btn uv-btn-ghost">Clear filters</button>}
          />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
            {sorted.map((p) => <ProjectCard key={p.id} project={p} variant="grid" />)}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterRow({ icon, label, children, inline }: { icon: React.ReactNode; label: string; children: React.ReactNode; inline?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: inline ? "center" : "flex-start", gap: 12 }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.625rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--color-text-mid)", minWidth: 84, paddingTop: inline ? 0 : 4 }}>
        {icon} {label}
      </span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{children}</div>
    </div>
  );
}
