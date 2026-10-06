"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  MapPin,
  ShieldCheck,
  ArrowLeft,
  Building,
  Activity,
  Clock,
  IndianRupee,
  FileText,
  TrendingUp,
  Landmark,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  LayoutGrid,
  Ruler,
  Award,
  Info,
  Compass,
} from "lucide-react";
import { formatLakh, groupIndian } from "@/lib/format";
import AccessibilityPanel, { type AccessibilityView } from "@/components/accessibility/AccessibilityPanel";
import ImageLightbox from "@/components/projects/ImageLightbox";

interface UnitType {
  id: string;
  label: string;
  unitCategory: string;
  bedrooms: number | null;
  areaSqFt: number | null;
  areaSqYd: number | null;
  carpetAreaSqFt: number | null;
  builtUpSqFt: number | null;
  priceLakh: number | null;
  ratePerSqFt: number | null;
  ratePerSqYd: number | null;
  priceNote: string | null;
}

interface Media {
  id: string;
  fileUrl: string;
  mediaType: string;
  altText: string | null;
}

interface RatingComponent {
  key: string;
  label: string;
  points: number;
  max: number;
  note: string;
}

interface Specifications {
  locality?: string;
  developerEstablished?: number | null;
  coordPrecision?: "exact" | "approximate" | null;
  sources?: { name: string; url: string; accessed: string }[];
  constructionStatus?: string;
}

interface ProjectDetails {
  id: string;
  name: string;
  developer: string;
  corridor: string;
  city: string;
  minBudgetLakhs: number;
  maxBudgetLakhs: number;
  minHorizonYears: number;
  maxHorizonYears: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  propertyType: string;
  infraHighlights: string[];
  exitOpportunities: string[];
  comparables: string[];
  description: string;
  brochureUrl: string | null;
  imageUrls: string[];
  status: string;
  reraNumber: string | null;
  reraUrl: string | null;
  possessionText: string | null;
  totalLandAcres: number | null;
  totalUnits: number | null;
  totalPlots: number | null;
  towerCount: number | null;
  floorsPerTower: string | null;
  amenities: string[];
  addressLine: string | null;
  latitude: number | null;
  longitude: number | null;
  specifications: Specifications | null;
  unitTypes?: UnitType[];
  media?: Media[];
  inventoryScore: number | null;
  inventoryGrade: string | null;
  inventoryRating: { total: number; grade: string; components: RatingComponent[] } | null;
  /** separate from the rating; null until the OpenStreetMap job has scored it */
  accessibility: AccessibilityView | null;
}

const TS_RERA_SEARCH = "https://rerait.telangana.gov.in/SearchList/Search";

const GRADE_COLOR: Record<string, string> = {
  A: "var(--color-growth)",
  B: "var(--color-saffron-deep)",
  C: "#9A6A1E",
  D: "var(--color-alert)",
};

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Which gallery image is open in the full-screen viewer (null = closed).
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  // The hero's pixel width once loaded — small photos are shown whole, not stretched.
  const [heroWidth, setHeroWidth] = useState<number | null>(null);
  const [heroBroken, setHeroBroken] = useState(false);

  // Lead capture form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function loadProject() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/projects/${id}`);
        if (res.ok) {
          const data = await res.json();
          setProject(data);
        }
      } catch (err) {
        console.error("Error loading project details:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadProject();
  }, [id]);

  const handleExpressInterest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      // Enquire against THIS listing. The route creates a ListingEnquiry (which
      // reaches the seller who posted it) alongside a CRM Lead, and increments
      // the listing's enquiry counters. Posting to /api/research instead created
      // an unattached research lead, so seller listings never received enquiries.
      const res = await fetch(`/api/projects/${project.id}/enquiry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          email: email || null,
          message: notes || null,
          budgetLakh: project.minBudgetLakhs ?? null,
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setSubmitSuccess(true);
      } else {
        setErrorMsg(data.error || "Failed to submit your enquiry.");
      }
    } catch (err) {
      setErrorMsg("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPrice = (min: number, max: number) =>
    min === max ? formatLakh(min) : `${formatLakh(min)} – ${formatLakh(max)}`;

  const getRiskBadge = (level: string) => {
    switch (level) {
      case "LOW":
        return <span className="uv-chip uv-chip-growth text-[10px] font-bold uppercase tracking-wider">LOW RISK</span>;
      case "MEDIUM":
        return <span className="uv-chip uv-chip-caution text-[10px] font-bold uppercase tracking-wider">MEDIUM RISK</span>;
      case "HIGH":
        return <span className="uv-chip uv-chip-alert text-[10px] font-bold uppercase tracking-wider">HIGH RISK</span>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex-grow flex flex-col justify-center items-center py-40 bg-surface-dim font-sans min-h-screen">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 border-4 border-saffron border-t-transparent rounded-full animate-spin mb-4"></div>
          <div className="h-4 bg-gray-200 w-48 rounded"></div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex-grow flex flex-col justify-center items-center py-40 bg-surface-dim text-center font-sans min-h-screen">
        <h2 className="font-display text-2xl font-bold text-text-primary mb-2">Project Not Found</h2>
        <p className="text-sm text-text-secondary mb-6">The requested project detail does not exist or has been removed.</p>
        <Link href="/projects" className="btn-primary inline-flex items-center gap-2">
          <ArrowLeft size={16} /> Back to Projects
        </Link>
      </div>
    );
  }

  const spec = project.specifications ?? {};
  const media = project.media ?? [];
  const gallery = media.filter((m) => !["MASTER_PLAN", "FLOOR_PLAN", "UNIT_PLAN"].includes(m.mediaType)).map((m) => m.fileUrl);
  const images = gallery.length ? gallery : (project.imageUrls ?? []).filter((u) => u && u !== "/placeholder-project.jpg");
  const masterPlans = media.filter((m) => m.mediaType === "MASTER_PLAN");
  const floorPlans = media.filter((m) => m.mediaType === "FLOOR_PLAN" || m.mediaType === "UNIT_PLAN");
  const mainImage = heroBroken ? null : images[0] ?? null;
  // Below this width a full-bleed hero has to be stretched and looks soft.
  const heroIsSmall = heroWidth != null && heroWidth < 1400;
  const units = project.unitTypes ?? [];
  const isPlots = project.propertyType.toLowerCase().includes("plot");
  const locality = spec.locality;
  const hasPin = project.latitude != null && project.longitude != null;
  const reraNumbers = (project.reraNumber ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const rating = project.inventoryRating;
  const sources = spec.sources ?? [];
  const accessed = sources[0]?.accessed;

  const facts: { label: string; value: string }[] = [];
  if (project.totalLandAcres) facts.push({ label: "Land area", value: `${project.totalLandAcres} acres` });
  if (project.towerCount) facts.push({ label: "Towers", value: String(project.towerCount) });
  if (project.floorsPerTower) facts.push({ label: "Floors", value: project.floorsPerTower });
  if (isPlots && (project.totalPlots ?? project.totalUnits)) facts.push({ label: "Plots", value: groupIndian((project.totalPlots ?? project.totalUnits)!) });
  else if (project.totalUnits) facts.push({ label: "Units", value: groupIndian(project.totalUnits) });
  if (project.possessionText) facts.push({ label: "Possession", value: project.possessionText });
  if (spec.developerEstablished) facts.push({ label: "Developer since", value: String(spec.developerEstablished) });

  const sizeOf = (u: UnitType) =>
    u.areaSqYd ? `${groupIndian(u.areaSqYd)} sq.yd` : u.builtUpSqFt ? `${groupIndian(u.builtUpSqFt)} sq.ft` : u.carpetAreaSqFt ? `${groupIndian(u.carpetAreaSqFt)} sq.ft (carpet)` : "—";
  const rateOf = (u: UnitType) =>
    u.ratePerSqYd ? `₹${groupIndian(u.ratePerSqYd)}/sq.yd` : u.ratePerSqFt ? `₹${groupIndian(u.ratePerSqFt)}/sq.ft` : "—";

  const osm = hasPin
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${project.longitude! - 0.012},${project.latitude! - 0.008},${project.longitude! + 0.012},${project.latitude! + 0.008}&layer=mapnik&marker=${project.latitude},${project.longitude}`
    : null;
  const gmaps = hasPin
    ? `https://www.google.com/maps/search/?api=1&query=${project.latitude},${project.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${project.name} ${locality ?? project.corridor} Hyderabad`)}`;

  return (
    <div className="flex-grow bg-surface-dim font-sans min-h-screen">

      {/* Back Nav */}
      <div
        className="sticky top-[69px] z-30 backdrop-blur-xl border-b py-2.5"
        style={{ background: "rgba(13, 13, 18, 0.85)", borderColor: "var(--color-ink-line)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/80 hover:text-saffron transition-colors"
          >
            <ArrowLeft size={13} /> Back to Listings
          </Link>
          <span className="text-xs text-white/55 font-bold uppercase tracking-wider hidden sm:block">
            {project.city} / {project.corridor}
          </span>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="relative h-[45vh] min-h-[400px] w-full overflow-hidden group bg-ink">
        {mainImage ? (
          <button
            type="button"
            onClick={() => setViewerIndex(0)}
            aria-label="Open photo gallery"
            className="absolute inset-0 w-full h-full cursor-zoom-in"
          >
            {heroIsSmall && (
              // Soft fill behind a small photo, so the photo itself stays sharp at its own size.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mainImage} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-60" />
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mainImage}
              alt={project.name}
              className={heroIsSmall ? "relative mx-auto h-full object-contain" : "w-full h-full object-cover img-hover-zoom"}
              style={heroIsSmall ? { maxWidth: heroWidth! } : undefined}
              onLoad={(e) => setHeroWidth(e.currentTarget.naturalWidth)}
              onError={() => setHeroBroken(true)}
            />
          </button>
        ) : (
          <div className="w-full h-full" style={{ background: "linear-gradient(135deg, var(--color-ink) 0%, var(--color-ink-soft) 100%)" }} />
        )}

        {/* Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/95 via-ink/60 to-transparent flex items-end pointer-events-none">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pb-10 sm:pb-16 animate-fade-in-up">
            <div className="space-y-4 max-w-3xl">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[10px] font-bold text-ink bg-saffron px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">
                  {project.possessionText ?? project.status.replace("_", " ")}
                </span>
                <span className="text-[10px] font-bold text-saffron bg-saffron/15 border border-saffron/30 px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1 backdrop-blur-sm">
                  <MapPin size={10} /> {locality ?? project.corridor}
                </span>
                {reraNumbers.length > 0 && (
                  <span className="text-[10px] font-bold text-white bg-white/10 border border-white/25 px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1 backdrop-blur-sm">
                    <ShieldCheck size={10} /> TS-RERA
                  </span>
                )}
              </div>

              <h1 className="font-display text-4xl sm:text-6xl font-bold text-surface drop-shadow-md">
                {project.name}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-300">
                <p className="flex items-center gap-1.5">
                  <Building size={16} className="text-saffron" />
                  Developed by <strong className="text-surface font-semibold">{project.developer}</strong>
                </p>
                <span className="hidden sm:inline text-gray-500">•</span>
                <p className="flex items-center gap-1.5">
                  <Landmark size={16} className="text-saffron" />
                  {project.propertyType}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {viewerIndex != null && images.length > 0 && (
        <ImageLightbox images={images} index={viewerIndex} alt={project.name} onIndex={setViewerIndex} onClose={() => setViewerIndex(null)} />
      )}

      {/* Gallery strip */}
      {images.length > 1 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5">
          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6 }}>
            {images.slice(0, 16).map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => setViewerIndex(i)}
                aria-label={`Open image ${i + 1}`}
                style={{
                  flex: "0 0 auto", width: 112, height: 72, borderRadius: 8, overflow: "hidden", padding: 0, cursor: "zoom-in",
                  border: "1px solid var(--color-line)",
                  background: "var(--color-ink-soft)",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Details Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

          {/* Left Columns (Project Info) */}
          <div className="lg:col-span-2 space-y-8 stagger-1 animate-fade-in-up">

            {/* Overview Attributes */}
            <section className="card-premium grid grid-cols-2 sm:grid-cols-4 gap-6 !p-8">
              <div className="space-y-1">
                <span className="text-[10px] text-text-secondary uppercase tracking-wider font-bold flex items-center gap-1.5">
                  <IndianRupee size={12} className="text-saffron-deep" /> Price
                </span>
                <span className="text-base font-bold text-text-primary block">{formatPrice(project.minBudgetLakhs, project.maxBudgetLakhs)}</span>
              </div>
              <div className="space-y-1 border-l border-gray-100 pl-4 sm:pl-6">
                <span className="text-[10px] text-text-secondary uppercase tracking-wider font-bold flex items-center gap-1.5">
                  <Clock size={12} className="text-saffron-deep" /> {project.possessionText ? "Possession" : "Target Horizon"}
                </span>
                <span className="text-base font-bold text-text-primary block">{project.possessionText ?? `${project.minHorizonYears} - ${project.maxHorizonYears} Yrs`}</span>
              </div>
              <div className="space-y-1 border-l border-gray-100 pl-4 sm:pl-6">
                <span className="text-[10px] text-text-secondary uppercase tracking-wider font-bold flex items-center gap-1.5">
                  <Activity size={12} className="text-saffron-deep" /> Risk Index
                </span>
                <div className="mt-1">{getRiskBadge(project.riskLevel)}</div>
              </div>
              <div className="space-y-1 border-l border-gray-100 pl-4 sm:pl-6">
                {project.inventoryGrade ? (
                  <>
                    <span className="text-[10px] text-text-secondary uppercase tracking-wider font-bold flex items-center gap-1.5">
                      <Award size={12} className="text-saffron-deep" /> Tiger Rating
                    </span>
                    <span className="text-base font-bold block" style={{ color: GRADE_COLOR[project.inventoryGrade] }}>
                      {project.inventoryGrade} <span className="text-text-secondary font-semibold">· {project.inventoryScore}/100</span>
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] text-text-secondary uppercase tracking-wider font-bold flex items-center gap-1.5">
                      <ShieldCheck size={12} className="text-growth" /> Verification
                    </span>
                    {reraNumbers.length > 0 ? (
                      <span className="text-base font-bold text-growth flex items-center gap-1"><CheckCircle2 size={16} /> RERA listed</span>
                    ) : (
                      <span className="text-base font-bold text-text-secondary">Standard</span>
                    )}
                  </>
                )}
              </div>
            </section>

            {/* Project Description */}
            <section className="card-premium space-y-4 !p-8">
              <h2 className="section-header text-xl">About the Project</h2>
              <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
                {project.description}
              </p>
              {facts.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                  {facts.map((f) => (
                    <div key={f.label} className="bg-surface-dim rounded-lg border border-gray-100 px-4 py-3">
                      <div className="text-[10px] uppercase tracking-wider font-bold text-text-secondary">{f.label}</div>
                      <div className="text-sm font-semibold text-text-primary mt-0.5">{f.value}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Unit-wise pricing */}
            {units.length > 0 && (
              <section className="card-premium space-y-4 !p-8">
                <h2 className="section-header text-xl flex items-center gap-2"><Ruler size={18} className="text-saffron-deep" /> {isPlots ? "Plot Sizes & Prices" : "Configurations & Prices"}</h2>
                <div style={{ overflowX: "auto" }}>
                  <table className="w-full text-sm" style={{ borderCollapse: "collapse", minWidth: 480 }}>
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-wider text-text-secondary">
                        <th className="py-2 pr-4">{isPlots ? "Plot" : "Configuration"}</th>
                        <th className="py-2 pr-4">Size</th>
                        <th className="py-2 pr-4">Base price</th>
                        <th className="py-2">Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {units.map((u) => (
                        <tr key={u.id} className="border-t border-gray-100 align-top">
                          <td className="py-2.5 pr-4 font-semibold text-text-primary">{u.label}</td>
                          <td className="py-2.5 pr-4 text-text-secondary">{sizeOf(u)}</td>
                          <td className="py-2.5 pr-4 font-semibold text-text-primary">
                            {u.priceLakh != null ? formatLakh(u.priceLakh) : <span className="text-text-secondary font-normal">On request</span>}
                            {u.priceNote && <div className="text-[11px] font-normal text-text-secondary">{u.priceNote}</div>}
                          </td>
                          <td className="py-2.5 text-text-secondary">{rateOf(u)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] text-text-secondary">
                  Base prices as listed{accessed ? ` on ${new Date(accessed).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : ""}; registration, GST and other charges extra. Confirm the current price sheet with the developer.
                </p>
              </section>
            )}

            {/* Property Tiger rating */}
            {rating && (
              <section className="card-premium space-y-5 !p-8 border-t-4 border-t-saffron">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <h2 className="section-header text-xl flex items-center gap-2"><Award size={18} className="text-saffron-deep" /> Property Tiger Rating</h2>
                  <span className="font-display text-3xl font-bold" style={{ color: GRADE_COLOR[rating.grade] }}>
                    {rating.grade} <span className="text-base text-text-secondary font-semibold">{rating.total}/100</span>
                  </span>
                </div>
                <div className="space-y-4">
                  {rating.components.map((c) => (
                    <div key={c.key}>
                      <div className="flex justify-between text-xs font-semibold text-text-primary">
                        <span>{c.label}</span>
                        <span className="font-mono">{c.points}/{c.max}</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 mt-1.5 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(c.points / c.max) * 100}%`, background: "var(--color-saffron)" }} />
                      </div>
                      <div className="text-[11px] text-text-secondary mt-1">{c.note}</div>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-text-secondary flex items-start gap-1.5">
                  <Info size={12} className="shrink-0 mt-0.5" />
                  Computed from public facts — RERA registration, developer history, distance to the HITEC City–Financial District job hub, delivery stage, density and price against same-zone projects. Missing facts score neutral. Not investment advice.
                </p>
              </section>
            )}

            {/* Amenities */}
            {project.amenities?.length > 0 && (
              <section className="card-premium space-y-4 !p-8">
                <h2 className="section-header text-xl">Amenities</h2>
                <div className="flex flex-wrap gap-2">
                  {project.amenities.map((a) => (
                    <span key={a} className="bg-surface-dim border border-gray-200 px-3 py-1.5 rounded-full text-xs font-medium text-text-primary">{a}</span>
                  ))}
                </div>
              </section>
            )}

            {/* Layout: master plan + floor plans */}
            {(masterPlans.length > 0 || floorPlans.length > 0) && (
              <section className="card-premium space-y-4 !p-8">
                <h2 className="section-header text-xl flex items-center gap-2"><LayoutGrid size={18} className="text-saffron-deep" /> Layout & Floor Plans</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[...masterPlans, ...floorPlans].slice(0, 18).map((m) => (
                    <a key={m.id} href={m.fileUrl} target="_blank" rel="noreferrer" className="block rounded-lg overflow-hidden border border-gray-200 bg-white hover:border-saffron transition-colors">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.fileUrl} alt={m.altText ?? project.name} loading="lazy" style={{ width: "100%", height: 150, objectFit: "contain", background: "#fff" }} />
                      <div className="text-[10px] uppercase tracking-wider font-bold text-text-secondary px-3 py-2 border-t border-gray-100">
                        {m.mediaType === "MASTER_PLAN" ? "Master plan" : "Floor plan"}
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* Location */}
            <section className="card-premium space-y-4 !p-8">
              <h2 className="section-header text-xl flex items-center gap-2"><MapPin size={18} className="text-saffron-deep" /> Location</h2>
              {project.addressLine && <p className="text-sm text-text-secondary">{project.addressLine}</p>}
              {osm ? (
                <iframe
                  title={`${project.name} location`}
                  src={osm}
                  loading="lazy"
                  style={{ width: "100%", height: 300, border: "1px solid var(--color-line)", borderRadius: 10 }}
                />
              ) : (
                <p className="text-xs text-text-secondary">Exact pin not verified for this project — locality shown above.</p>
              )}
              {spec.coordPrecision === "approximate" && (
                <p className="text-[11px] text-text-secondary">Pin is approximate (shared with a neighbouring project in the source data).</p>
              )}
              <div className="flex flex-wrap gap-3">
                <a href={gmaps} target="_blank" rel="noreferrer" className="uv-btn uv-btn-ghost text-xs inline-flex items-center gap-1.5">
                  Open in Google Maps <ExternalLink size={12} />
                </a>
                {hasPin && (
                  <Link href="/explore" className="uv-btn uv-btn-ghost text-xs inline-flex items-center gap-1.5">
                    View on Explore map
                  </Link>
                )}
              </div>
              {project.infraHighlights.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {project.infraHighlights.map((tag, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-surface-dim rounded-lg border border-gray-100">
                      <div className="bg-saffron-wash p-2 rounded-full text-saffron-deep shrink-0">
                        <Sparkles size={14} />
                      </div>
                      <span className="text-xs font-semibold text-text-primary pt-1 leading-relaxed">{tag}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Accessibility — its own score, separate from the rating */}
            {project.accessibility && (
              <section className="card-premium space-y-4 !p-8">
                <h2 className="section-header text-xl flex items-center gap-2"><Compass size={18} className="text-saffron-deep" /> Accessibility</h2>
                <p className="text-sm text-text-secondary">How well connected and well served this location is, from mapped hospitals, stations, ORR exits, malls, colleges, parks and job hubs. Separate from the Property Tiger Rating.</p>
                <div className="max-w-xl">
                  <AccessibilityPanel a={project.accessibility} />
                </div>
                {project.latitude != null && project.longitude != null && (
                  <Link href={`/explore?lat=${project.latitude.toFixed(4)}&lng=${project.longitude.toFixed(4)}&z=14&sel=${project.id}`} className="uv-btn uv-btn-ghost" style={{ fontSize: "0.8125rem", padding: "8px 14px" }}>
                    See it on the map with 2 km / 5 km rings
                  </Link>
                )}
              </section>
            )}

            {/* Exit Opportunities */}
            {project.exitOpportunities.length > 0 && (
              <section className="card-premium space-y-6 !p-8 border-t-4 border-t-success">
                <h2 className="section-header text-xl">Liquidation & Exit Opportunities</h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {project.exitOpportunities.map((exit, idx) => (
                    <li key={idx} className="bg-growth-wash border border-growth/20 px-4 py-4 rounded-[8px] text-xs text-text-primary font-medium flex items-start gap-3 shadow-sm">
                      <CheckCircle2 size={16} className="text-growth shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{exit}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Comparable Projects */}
            {project.comparables && project.comparables.length > 0 && (
              <section className="card-premium space-y-4 !p-8 border-t-4 border-t-warning">
                <h2 className="section-header text-xl">{project.inventoryGrade ? "Similar Projects Nearby" : "Comparable Local Benchmarks"}</h2>
                <div className="flex flex-wrap gap-2">
                  {project.comparables.map((comp, idx) => (
                    <span key={idx} className="bg-surface-dim border border-gray-200 px-4 py-2 rounded-full text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors flex items-center gap-2">
                      <TrendingUp size={12} className="text-caution" /> {comp}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* RERA + sources */}
            {(reraNumbers.length > 0 || sources.length > 0) && (
              <section className="card-premium space-y-4 !p-8">
                <h2 className="section-header text-xl flex items-center gap-2"><ShieldCheck size={18} className="text-growth" /> Registration & Sources</h2>
                {reraNumbers.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs text-text-secondary">TS-RERA registration{reraNumbers.length > 1 ? "s" : ""}:</div>
                    <div className="flex flex-wrap gap-2">
                      {reraNumbers.map((n) => (
                        <span key={n} className="font-mono text-xs font-semibold bg-growth-wash text-growth px-3 py-1.5 rounded-full">{n}</span>
                      ))}
                    </div>
                    <a href={project.reraUrl ?? TS_RERA_SEARCH} target="_blank" rel="noreferrer" className="text-xs font-semibold text-saffron-deep inline-flex items-center gap-1">
                      Verify on the TS-RERA portal <ExternalLink size={11} />
                    </a>
                  </div>
                )}
                {sources.length > 0 && (
                  <div className="text-[11px] text-text-secondary space-y-1 pt-1">
                    <div>Project facts compiled from public listings:</div>
                    <ul className="list-disc pl-5">
                      {sources.map((s) => (
                        <li key={s.url}>
                          <a href={s.url} target="_blank" rel="noreferrer" className="underline">{s.name}</a>
                          {s.accessed && <> — accessed {new Date(s.accessed).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</>}
                        </li>
                      ))}
                    </ul>
                    <div>Images are the developer’s marketing material. Verify prices, approvals and availability with the developer before booking.</div>
                  </div>
                )}
              </section>
            )}

            {/* Brochure download if brochureUrl exists */}
            {project.brochureUrl && (
              <section className="card-premium !p-8 bg-gradient-to-r from-surface to-saffron-wash border-l-4 border-l-saffron flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-text-primary font-display flex items-center gap-2">
                    <FileText size={18} className="text-saffron-deep" /> Project Documentation
                  </h3>
                  <p className="text-xs text-text-secondary">Download full RERA registration documents, layouts, and master plans.</p>
                </div>
                <a
                  href={project.brochureUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary whitespace-nowrap text-xs shadow-glow-cyan"
                >
                  Download Brochure
                </a>
              </section>
            )}
          </div>

          {/* Right Column (Express Interest Form + Price) */}
          <div id="enquire" className="lg:col-span-1 stagger-2 animate-fade-in-up">
            <div className="sticky top-32 card-premium !p-0 overflow-hidden shadow-luxury border-gray-200">

              {/* Prominent Price Section */}
              <div className="bg-ink p-6 text-center text-surface relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <IndianRupee size={80} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-saffron block mb-2 relative z-10">
                  {units.length > 0 ? "Base Price Range" : "Investment Bracket"}
                </span>
                <h3 className="font-display text-3xl font-bold relative z-10">
                  {formatPrice(project.minBudgetLakhs, project.maxBudgetLakhs)}
                </h3>
              </div>

              {/* Form Section */}
              <div className="p-6 space-y-6 bg-surface">
                <div className="text-center border-b border-gray-100 pb-4">
                  <h4 className="font-display text-base font-bold text-text-primary">Direct Advisor Connect</h4>
                  <p className="text-[10px] text-text-secondary mt-1">Get priority access to inventory and pricing</p>
                </div>

                {submitSuccess ? (
                  <div className="text-center py-6 space-y-3">
                    <div className="text-4xl flex justify-center text-growth"><CheckCircle2 size={48} /></div>
                    <h4 className="font-display text-lg font-bold text-text-primary">Interest Registered</h4>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      Thank you! Our Hyderabad advisor has received your request and will call you with project layouts and price sheets shortly.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleExpressInterest} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                        Full Name
                      </label>
                      <input
                        type="text"
                        placeholder="Your Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="input-premium w-full"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                        Email Address
                      </label>
                      <input
                        type="email"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="input-premium w-full"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        placeholder="+91 99999 99999"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="input-premium w-full"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                        Message / Notes (Optional)
                      </label>
                      <textarea
                        placeholder="Requesting site visit details or pricing sheets..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        className="input-premium w-full resize-none"
                      />
                    </div>

                    {errorMsg && (
                      <p className="text-alert text-xs text-center font-semibold bg-alert-wash p-2 rounded">{errorMsg}</p>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="btn-primary w-full py-3"
                    >
                      {isSubmitting ? "Submitting..." : "Submit Inquiry"}
                    </button>

                    <p className="text-[9px] text-center text-text-secondary">
                      By submitting, you agree to our privacy policy and terms of service.
                    </p>
                  </form>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
