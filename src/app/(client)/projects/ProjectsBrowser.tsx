"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, MapPin, Building, Activity, IndianRupee, Search, X } from "lucide-react";
import { PageHero, ProjectCard, SkeletonCard, EmptyState, type ProjectCardData } from "@/components/ui";
import SaveSearchButton from "@/components/projects/SaveSearchButton";
import { useT } from "@/lib/i18n";
import { TYPES, RISKS, BUDGET_RANGE, readFilters, toQuery, apiQuery, type Filters, type Corridor, type Page, type SortKey } from "@/lib/projects/list-filters";

const BUDGETS = [
  { id: "ALL", label: "Any Budget", te: "ఏ బడ్జెట్ అయినా" },
  { id: "<30L", label: "Under ₹30 Lakhs", te: "₹30 లక్షల లోపు" },
  { id: "30-60L", label: "₹30L – ₹60 Lakhs", te: "₹30 – ₹60 లక్షలు" },
  { id: "60-120L", label: "₹60L – ₹1.2 Crores", te: "₹60 లక్షలు – ₹1.2 కోట్లు" },
  { id: ">120L", label: "Above ₹1.2 Crores", te: "₹1.2 కోట్లు పైన" },
];

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
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

export interface ProjectsInitial {
  /** The /api/projects query the first page answers. */
  key: string;
  page: Page;
  corridors: Corridor[];
}

export default function ProjectsBrowser({ initial }: { initial: ProjectsInitial | null }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const t = useT();
  const f = readFilters(params);

  // The server renders the first page for the URL's filters; the browser takes over from there.
  const [items, setItems] = useState<ProjectCardData[]>(initial?.page.items ?? []);
  const [total, setTotal] = useState<number | null>(initial?.page.total ?? null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initial?.page.hasMore ?? false);
  // The filters the shown results belong to; anything else is still loading.
  const [loadedKey, setLoadedKey] = useState<string | null>(initial?.key ?? null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);
  const [corridors, setCorridors] = useState<Corridor[]>(initial?.corridors ?? []);
  const [showAllCorridors, setShowAllCorridors] = useState(false);
  const [query, setQuery] = useState(f.q);
  const [sheetOpen, setSheetOpen] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  const setFilters = useCallback(
    (patch: Partial<Filters>) => {
      const next = toQuery({ ...readFilters(new URLSearchParams(window.location.search)), ...patch }).toString();
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    },
    [router, pathname],
  );
  const clearAll = () => {
    setQuery("");
    router.replace(f.sort !== "relevance" ? `${pathname}?sort=${f.sort}` : pathname, { scroll: false });
  };

  useEffect(() => {
    if (initial?.corridors.length) return;
    fetch("/api/projects/corridors")
      .then((r) => (r.ok ? r.json() : []))
      .then((c) => setCorridors(Array.isArray(c) ? c : []))
      .catch(() => setCorridors([]));
  }, [initial]);

  // The search box writes to the URL after a pause in typing.
  useEffect(() => {
    if (query.trim() === f.q) return;
    const id = setTimeout(() => setFilters({ q: query.trim() }), 300);
    return () => clearTimeout(id);
  }, [query, f.q, setFilters]);

  // First page whenever the filters change; stale responses are dropped.
  const key = apiQuery(f, 1);
  // The server already loaded the first page for the URL the visitor arrived on.
  const serverKey = useRef(initial?.key ?? null);
  useEffect(() => {
    if (key === serverKey.current) {
      serverKey.current = null;
      return;
    }
    const ctl = new AbortController();
    fetch(`/api/projects?${key}`, { signal: ctl.signal })
      .then((r) => (r.ok ? (r.json() as Promise<Page>) : Promise.reject(r.status)))
      .then((d) => {
        setItems(d.items);
        setTotal(d.total);
        setHasMore(d.hasMore);
        setPage(1);
        setFailed(false);
        setLoadedKey(key);
      })
      .catch((e) => {
        if (ctl.signal.aborted) return;
        console.error("Error loading projects:", e);
        setFailed(true);
        setLoadedKey(key);
      });
    return () => ctl.abort();
  }, [key]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const r = await fetch(`/api/projects?${key.replace(/(^|&)page=1(&|$)/, `$1page=${page + 1}$2`)}`);
      if (!r.ok) throw new Error(String(r.status));
      const d = (await r.json()) as Page;
      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...d.items.filter((p) => !seen.has(p.id))];
      });
      setHasMore(d.hasMore);
      setPage((n) => n + 1);
    } catch (e) {
      console.error("Error loading more projects:", e);
    } finally {
      setLoadingMore(false);
    }
  };

  // Load the next page when the end of the list scrolls into view. The
  // observer calls the latest loadMore through a ref, so it isn't rebuilt every render.
  const loadMoreRef = useRef(loadMore);
  useEffect(() => {
    loadMoreRef.current = loadMore;
  });
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver((e) => e[0].isIntersecting && loadMoreRef.current(), { rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore]);

  // Applied filters as removable chips
  const applied: { label: string; clear: () => void }[] = [];
  if (f.locality) applied.push({ label: f.locality, clear: () => setFilters({ locality: "" }) });
  if (f.corridor !== "ALL") applied.push({ label: f.corridor, clear: () => setFilters({ corridor: "ALL" }) });
  if (f.budget !== "ALL") {
    const b = BUDGETS.find((x) => x.id === f.budget)!;
    applied.push({ label: t(b.label, b.te), clear: () => setFilters({ budget: "ALL" }) });
  }
  if (f.risk !== "ALL") applied.push({ label: t(`${f.risk} risk`, `${f.risk} రిస్క్`), clear: () => setFilters({ risk: "ALL" }) });
  if (f.type !== "ALL") applied.push({ label: f.type, clear: () => setFilters({ type: "ALL" }) });
  if (f.q) applied.push({ label: `“${f.q}”`, clear: () => { setQuery(""); setFilters({ q: "" }); } });
  const filterCount = applied.filter((a) => !a.label.startsWith("“")).length;

  const isLoading = loadedKey !== key;
  const shownCorridors = showAllCorridors ? corridors : corridors.slice(0, 10);
  const countLabel = total == null ? t("Loading…", "లోడ్ అవుతోంది…") : t(`${total.toLocaleString("en-IN")} ${total === 1 ? "listing" : "listings"}`, `${total.toLocaleString("en-IN")} లిస్టింగ్‌లు`);

  const controls = (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <FilterRow icon={<MapPin size={12} />} label={t("Location", "ప్రాంతం")}>
        <Chip active={f.corridor === "ALL"} onClick={() => setFilters({ corridor: "ALL" })}>{t("All Hyderabad", "హైదరాబాద్ మొత్తం")}</Chip>
        {shownCorridors.map((c) => (
          <Chip key={c.name} active={f.corridor === c.name} onClick={() => setFilters({ corridor: c.name })}>
            {c.name} <span style={{ opacity: 0.6, marginLeft: 4 }}>{c.count}</span>
          </Chip>
        ))}
        {corridors.length > 10 && (
          <button type="button" onClick={() => setShowAllCorridors((v) => !v)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem", fontWeight: 700, color: "var(--color-saffron-deep)" }}>
            {showAllCorridors ? t("Show fewer", "తక్కువ చూపించు") : t(`+${corridors.length - 10} more`, `+${corridors.length - 10} మరిన్ని`)}
          </button>
        )}
      </FilterRow>
      <FilterRow icon={<IndianRupee size={12} />} label={t("Budget", "బడ్జెట్")}>
        {BUDGETS.map((b) => <Chip key={b.id} active={f.budget === b.id} onClick={() => setFilters({ budget: b.id })}>{t(b.label, b.te)}</Chip>)}
      </FilterRow>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, columnGap: 24, borderTop: "1px solid var(--color-line)", paddingTop: 14 }}>
        <FilterRow icon={<Activity size={12} />} label={t("Risk Rating", "రిస్క్")} inline>
          {RISKS.map((r) => <Chip key={r} active={f.risk === r} onClick={() => setFilters({ risk: r })}>{r === "ALL" ? t("All", "అన్నీ") : r}</Chip>)}
        </FilterRow>
        <FilterRow icon={<Building size={12} />} label={t("Type", "రకం")} inline>
          {["ALL", ...TYPES].map((x) => <Chip key={x} active={f.type === x} onClick={() => setFilters({ type: x })}>{x === "ALL" ? t("All", "అన్నీ") : x}</Chip>)}
        </FilterRow>
      </div>
    </div>
  );

  return (
    <div style={{ background: "var(--color-paper)", minHeight: "100vh" }}>
      <PageHero
        eyebrow={<><Building size={12} /> {t("Investment Grade Properties", "పెట్టుబడి స్థాయి ప్రాపర్టీలు")}</>}
        title={t("Hyderabad Projects, Rated", "హైదరాబాద్ ప్రాజెక్టులు, రేటింగ్‌తో")}
        subtitle={t(
          "Apartments, villas, plotted layouts and commercial projects from Hyderabad's developers — with TS-RERA numbers, unit-wise pricing and a Property Tiger rating — plus verified land listings, clearly marked as not RERA.",
          "హైదరాబాద్ డెవలపర్ల అపార్ట్‌మెంట్లు, విల్లాలు, ప్లాట్ లేఅవుట్లు, కమర్షియల్ ప్రాజెక్టులు — TS-RERA నంబర్లు, యూనిట్ వారీ ధరలు, Property Tiger రేటింగ్‌తో — అలాగే RERA కాదని స్పష్టంగా గుర్తించిన భూమి లిస్టింగ్‌లు.",
        )}
        size="md"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" style={{ paddingTop: "2.25rem", paddingBottom: "4rem" }}>
        {/* Search: always visible. Filters: a panel on desktop, a bottom sheet on phones. */}
        <div className="uv-card" style={{ padding: "1.15rem 1.35rem", marginBottom: 20 }}>
          <div className="hidden md:flex" style={{ alignItems: "center", gap: 8, paddingBottom: 12, marginBottom: 14, borderBottom: "1px solid var(--color-line)", color: "var(--color-text-hi)", fontWeight: 700, fontFamily: "var(--font-jakarta)" }}>
            <SlidersHorizontal size={17} style={{ color: "var(--color-saffron-deep)" }} />
            <span>{t("Refine Search", "వెతుకుదాం")}</span>
            <button type="button" onClick={clearAll} style={{ marginLeft: "auto", fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--color-text-lo)", background: "none", border: "none", cursor: "pointer" }}>
              {t("Clear All", "అన్నీ తీసివేయి")}
            </button>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ position: "relative", flex: 1 }}>
              <Search size={15} aria-hidden style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-lo)" }} />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("Search a project, developer or locality…", "ప్రాజెక్ట్, డెవలపర్ లేదా ప్రాంతం వెతకండి…")}
                className="input-premium"
                style={{ width: "100%", paddingLeft: 36 }}
                aria-label={t("Search projects", "ప్రాజెక్టులు వెతకండి")}
              />
            </div>
            {/* The wrapper carries md:hidden: .uv-btn sets its own display, which would beat the utility. */}
            <div className="md:hidden" style={{ flexShrink: 0 }}>
              <button type="button" onClick={() => setSheetOpen(true)} className="uv-btn uv-btn-ghost" style={{ padding: "0 14px", height: "100%" }} aria-haspopup="dialog">
                <SlidersHorizontal size={15} /> {t("Filters", "ఫిల్టర్లు")}{filterCount ? ` (${filterCount})` : ""}
              </button>
            </div>
          </div>
          <div className="hidden md:block" style={{ paddingTop: 14 }}>{controls}</div>
        </div>

        {sheetOpen && (
          <FilterSheet title={t("Filters", "ఫిల్టర్లు")} onClose={() => setSheetOpen(false)}
            footer={
              <>
                <button type="button" onClick={clearAll} className="uv-btn uv-btn-ghost" style={{ flex: 1 }}>{t("Clear", "తీసివేయి")}</button>
                <button type="button" onClick={() => setSheetOpen(false)} className="uv-btn uv-btn-primary" style={{ flex: 2 }}>
                  {total == null ? t("Show results", "ఫలితాలు చూపించు") : t(`Show ${total.toLocaleString("en-IN")} results`, `${total.toLocaleString("en-IN")} ఫలితాలు చూపించు`)}
                </button>
              </>
            }
          >
            {controls}
          </FilterSheet>
        )}

        {/* Result count + applied chips + sort */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
          <span aria-live="polite" style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "var(--color-text-mid)" }}>
            {isLoading ? t("Loading…", "లోడ్ అవుతోంది…") : countLabel}
          </span>
          {applied.map((a) => (
            <button key={a.label} type="button" onClick={a.clear} className="uv-chip uv-chip-saffron" style={{ cursor: "pointer", border: "none" }} aria-label={t(`Remove filter ${a.label}`, `${a.label} ఫిల్టర్ తీసివేయి`)}>
              {a.label} <X size={12} aria-hidden />
            </button>
          ))}
          {applied.length > 0 && (
            <SaveSearchButton
              key={applied.map((a) => a.label).join("|")}
              filters={{
                corridor: f.corridor !== "ALL" ? f.corridor : null,
                locality: f.locality || null,
                risk: f.risk !== "ALL" ? f.risk : null,
                type: f.type !== "ALL" ? f.type : null,
                q: f.q || null,
                ...BUDGET_RANGE[f.budget],
              }}
            />
          )}
          <label style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "0.75rem", color: "var(--color-text-lo)" }}>{t("Sort", "క్రమం")}</span>
            <select value={f.sort} onChange={(e) => setFilters({ sort: e.target.value as SortKey })} className="input-premium" style={{ padding: "8px 12px", fontSize: "0.8125rem", width: "auto" }}>
              <option value="relevance">{t("Top rated", "అత్యుత్తమ రేటింగ్")}</option>
              <option value="price_asc">{t("Price ↑", "ధర ↑")}</option>
              <option value="price_desc">{t("Price ↓", "ధర ↓")}</option>
              <option value="newest">{t("Newest", "కొత్తవి")}</option>
            </select>
          </label>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="pt-card-grid">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} variant="project" />)}
          </div>
        ) : failed && !items.length ? (
          <EmptyState
            icon={<Search size={24} />}
            title={t("Couldn't load projects", "ప్రాజెక్టులు లోడ్ కాలేదు")}
            description={t("Check your connection and try again.", "మీ ఇంటర్నెట్ కనెక్షన్ చూసి మళ్లీ ప్రయత్నించండి.")}
            action={<button type="button" onClick={() => window.location.reload()} className="uv-btn uv-btn-ghost">{t("Try again", "మళ్లీ ప్రయత్నించండి")}</button>}
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Search size={24} />}
            title={t("No matching projects found", "సరిపోయే ప్రాజెక్టులు లేవు")}
            description={t("We couldn't find projects matching your exact criteria. Try broadening your filters, or contact our advisory team for off-market listings.", "మీ ఎంపికలకు సరిపోయే ప్రాజెక్టులు దొరకలేదు. ఫిల్టర్లు కొంచెం సడలించి చూడండి.")}
            action={<button type="button" onClick={clearAll} className="uv-btn uv-btn-ghost">{t("Clear filters", "ఫిల్టర్లు తీసివేయి")}</button>}
          />
        ) : (
          <>
            <div className="pt-card-grid">
              {items.map((p) => <ProjectCard key={p.id} project={p} variant="grid" />)}
              {loadingMore && Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={`more-${i}`} variant="project" />)}
            </div>
            <div ref={sentinel} aria-hidden style={{ height: 1 }} />
            {hasMore && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginTop: 28 }}>
                <button type="button" onClick={loadMore} disabled={loadingMore} className="uv-btn uv-btn-ghost">
                  {loadingMore ? t("Loading…", "లోడ్ అవుతోంది…") : t("Show more", "మరిన్ని చూపించు")}
                </button>
                <span style={{ fontSize: "0.75rem", color: "var(--color-text-lo)" }}>
                  {t(`Showing ${items.length.toLocaleString("en-IN")} of ${total?.toLocaleString("en-IN")}`, `${total?.toLocaleString("en-IN")}లో ${items.length.toLocaleString("en-IN")} చూపిస్తున్నాం`)}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** Phone filter panel: slides up from the bottom; Escape or the backdrop closes it. */
function FilterSheet({ title, onClose, footer, children }: { title: string; onClose: () => void; footer: React.ReactNode; children: React.ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      prev?.focus();
    };
  }, [onClose]);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(13,13,18,0.5)" }} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="pt-sheet"
        style={{ position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "85vh", display: "flex", flexDirection: "column", background: "var(--color-surface)", borderRadius: "18px 18px 0 0", boxShadow: "0 -8px 30px rgba(0,0,0,0.25)", outline: "none" }}
      >
        <div style={{ display: "flex", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid var(--color-line)" }}>
          <strong style={{ fontFamily: "var(--font-jakarta)", color: "var(--color-text-hi)" }}>{title}</strong>
          <button type="button" onClick={onClose} aria-label="Close" style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", padding: 6, color: "var(--color-text-mid)" }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ overflowY: "auto", padding: 16 }}>{children}</div>
        <div style={{ display: "flex", gap: 10, padding: "12px 16px calc(12px + env(safe-area-inset-bottom))", borderTop: "1px solid var(--color-line)" }}>{footer}</div>
      </div>
    </div>
  );
}

function FilterRow({ icon, label, children, inline }: { icon: React.ReactNode; label: string; children: React.ReactNode; inline?: boolean }) {
  return (
    <div role="group" aria-label={label} className="pt-filter-row" data-inline={inline ? "" : undefined}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.625rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--color-text-mid)", minWidth: 84, paddingTop: inline ? 0 : 4 }}>
        {icon} {label}
      </span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{children}</div>
    </div>
  );
}
