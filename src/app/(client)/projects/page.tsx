"use client";

import React, { Suspense, useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { SlidersHorizontal, MapPin, Building, Activity, IndianRupee, Search, X } from "lucide-react";
import { PageHero, ProjectCard, SkeletonCard, EmptyState, type ProjectCardData } from "@/components/ui";

type SortKey = "relevance" | "price_asc" | "price_desc" | "newest";
type Corridor = { name: string; count: number };

const PAGE = 24;

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
      }}
    >
      {children}
    </button>
  );
}

const TYPES = ["Apartment", "Villa", "Plots", "Commercial"];

// useSearchParams needs a Suspense boundary on a prerendered page; the browser
// renders the list itself, so filters can start from the URL.
export default function PublicProjectsPage() {
  return (
    <Suspense fallback={null}>
      <ProjectsBrowser />
    </Suspense>
  );
}

function ProjectsBrowser() {
  // Arriving from the homepage search (/projects?q=Kokapet&type=Villa) starts
  // with those filters applied.
  const params = useSearchParams();
  const initialQuery = params.get("q")?.trim() ?? "";
  const initialType = params.get("type");

  const [projects, setProjects] = useState<(ProjectCardData & { createdAt?: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedCorridor, setSelectedCorridor] = useState(() => params.get("corridor") || "ALL");
  const [selectedLocality, setSelectedLocality] = useState(() => params.get("locality")?.trim() || "");
  const [selectedRisk, setSelectedRisk] = useState("ALL");
  const [selectedType, setSelectedType] = useState(() => (initialType && TYPES.includes(initialType) ? initialType : "ALL"));
  const [budgetRange, setBudgetRange] = useState("ALL");
  const [sort, setSort] = useState<SortKey>("relevance");
  const [corridors, setCorridors] = useState<Corridor[]>([]);
  const [showAllCorridors, setShowAllCorridors] = useState(false);
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [visible, setVisible] = useState(PAGE);

  const clearAll = () => {
    setSelectedCorridor("ALL");
    setSelectedLocality("");
    setSelectedRisk("ALL");
    setSelectedType("ALL");
    setBudgetRange("ALL");
    setQuery("");
  };

  useEffect(() => {
    fetch("/api/projects/corridors")
      .then((r) => (r.ok ? r.json() : []))
      .then((c) => setCorridors(Array.isArray(c) ? c : []))
      .catch(() => setCorridors([]));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    async function fetchProjects() {
      setIsLoading(true);
      try {
        let url = `/api/projects?status=ACTIVE`;
        if (selectedCorridor !== "ALL") url += `&corridor=${encodeURIComponent(selectedCorridor)}`;
        if (selectedLocality) url += `&locality=${encodeURIComponent(selectedLocality)}`;
        if (selectedRisk !== "ALL") url += `&risk=${selectedRisk}`;
        if (selectedType !== "ALL") url += `&type=${selectedType}`;
        if (debouncedQuery) url += `&q=${encodeURIComponent(debouncedQuery)}`;
        if (budgetRange === "<30L") url += `&maxBudget=30`;
        else if (budgetRange === "30-60L") url += `&minBudget=30&maxBudget=60`;
        else if (budgetRange === "60-120L") url += `&minBudget=60&maxBudget=120`;
        else if (budgetRange === ">120L") url += `&minBudget=120`;

        const res = await fetch(url);
        if (res.ok) setProjects(await res.json());
        setVisible(PAGE);
      } catch (err) {
        console.error("Error loading projects:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchProjects();
  }, [selectedCorridor, selectedLocality, selectedRisk, selectedType, budgetRange, debouncedQuery]);

  const sorted = useMemo(() => {
    const arr = [...projects];
    if (sort === "price_asc") arr.sort((a, b) => a.minBudgetLakhs - b.minBudgetLakhs);
    else if (sort === "price_desc") arr.sort((a, b) => b.minBudgetLakhs - a.minBudgetLakhs);
    else if (sort === "newest") arr.sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
    return arr;
  }, [projects, sort]);

  // Applied filters as removable chips
  const applied: { label: string; clear: () => void }[] = [];
  if (selectedLocality) applied.push({ label: selectedLocality, clear: () => setSelectedLocality("") });
  if (selectedCorridor !== "ALL") applied.push({ label: selectedCorridor, clear: () => setSelectedCorridor("ALL") });
  if (budgetRange !== "ALL") applied.push({ label: BUDGETS.find((b) => b.id === budgetRange)!.label, clear: () => setBudgetRange("ALL") });
  if (selectedRisk !== "ALL") applied.push({ label: `${selectedRisk} risk`, clear: () => setSelectedRisk("ALL") });
  if (selectedType !== "ALL") applied.push({ label: selectedType, clear: () => setSelectedType("ALL") });
  if (debouncedQuery) applied.push({ label: `“${debouncedQuery}”`, clear: () => setQuery("") });

  const shownCorridors = showAllCorridors ? corridors : corridors.slice(0, 10);

  return (
    <div style={{ background: "var(--color-paper)", minHeight: "100vh" }}>
      <PageHero
        eyebrow={<><Building size={12} /> Investment Grade Properties</>}
        title="Hyderabad Projects, Rated"
        subtitle="Apartments, villas and plotted layouts from Hyderabad's developers — with TS-RERA numbers, unit-wise pricing, locations and a Property Tiger rating for every project."
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
            <div style={{ position: "relative" }}>
              <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-lo)" }} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search a project, developer or locality…"
                className="input-premium"
                style={{ width: "100%", paddingLeft: 36 }}
                aria-label="Search projects"
              />
            </div>
            <FilterRow icon={<MapPin size={12} />} label="Location">
              <Chip active={selectedCorridor === "ALL"} onClick={() => setSelectedCorridor("ALL")}>All Hyderabad</Chip>
              {shownCorridors.map((c) => (
                <Chip key={c.name} active={selectedCorridor === c.name} onClick={() => setSelectedCorridor(c.name)}>
                  {c.name} <span style={{ opacity: 0.6, marginLeft: 4 }}>{c.count}</span>
                </Chip>
              ))}
              {corridors.length > 10 && (
                <button type="button" onClick={() => setShowAllCorridors((v) => !v)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem", fontWeight: 700, color: "var(--color-saffron-deep)" }}>
                  {showAllCorridors ? "Show fewer" : `+${corridors.length - 10} more`}
                </button>
              )}
            </FilterRow>
            <FilterRow icon={<IndianRupee size={12} />} label="Budget">
              {BUDGETS.map((b) => <Chip key={b.id} active={budgetRange === b.id} onClick={() => setBudgetRange(b.id)}>{b.label}</Chip>)}
            </FilterRow>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 24, borderTop: "1px solid var(--color-line)", paddingTop: 14 }}>
              <FilterRow icon={<Activity size={12} />} label="Risk Rating" inline>
                {["ALL", "LOW", "MEDIUM", "HIGH"].map((r) => <Chip key={r} active={selectedRisk === r} onClick={() => setSelectedRisk(r)}>{r === "ALL" ? "All" : r}</Chip>)}
              </FilterRow>
              <FilterRow icon={<Building size={12} />} label="Type" inline>
                {["ALL", ...TYPES].map((t) => <Chip key={t} active={selectedType === t} onClick={() => setSelectedType(t)}>{t === "ALL" ? "All" : t}</Chip>)}
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
              <option value="relevance">Top rated</option>
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
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
              {sorted.slice(0, visible).map((p) => <ProjectCard key={p.id} project={p} variant="grid" />)}
            </div>
            {visible < sorted.length && (
              <div style={{ display: "flex", justifyContent: "center", marginTop: 28 }}>
                <button onClick={() => setVisible((v) => v + PAGE)} className="uv-btn uv-btn-ghost">
                  Show more ({sorted.length - visible} remaining)
                </button>
              </div>
            )}
          </>
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
