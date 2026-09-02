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
  Sparkles
} from "lucide-react";

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
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  const formatPrice = (min: number, max: number) => {
    const minText = min < 100 ? `${min}L` : `${(min / 100).toFixed(1)}Cr`;
    const maxText = max < 100 ? `${max}L` : `${(max / 100).toFixed(1)}Cr`;
    return `₹${minText} - ₹${maxText}`;
  };

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

  const mainImage = (project.imageUrls && project.imageUrls.length > 0)
    ? project.imageUrls[0]
    : `https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1600&q=80`;

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

      {/* Hero Banner - Larger hero with img-hover-zoom */}
      <div className="relative h-[45vh] min-h-[400px] w-full overflow-hidden group">
        {mainImage.startsWith("/") && mainImage !== "/placeholder-project.jpg" ? (
          <img 
            src={mainImage} 
            alt={project.name}
            className="w-full h-full object-cover img-hover-zoom"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1600&q=80`;
            }}
          />
        ) : (
          <img 
            src={`https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1600&q=80`} 
            alt={project.name}
            className="w-full h-full object-cover img-hover-zoom"
          />
        )}
        
        {/* Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/95 via-ink/60 to-transparent flex items-end">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pb-10 sm:pb-16 animate-fade-in-up">
            <div className="space-y-4 max-w-3xl">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[10px] font-bold text-ink bg-saffron px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">
                  {project.status.replace("_", " ")}
                </span>
                <span className="text-[10px] font-bold text-saffron bg-saffron/15 border border-saffron/30 px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1 backdrop-blur-sm">
                  <MapPin size={10} /> {project.corridor}
                </span>
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

      {/* Main Details Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          
          {/* Left Columns (Project Info) */}
          <div className="lg:col-span-2 space-y-8 stagger-1 animate-fade-in-up">
            
            {/* Overview Attributes */}
            <section className="card-premium grid grid-cols-2 sm:grid-cols-4 gap-6 !p-8">
              <div className="space-y-1">
                <span className="text-[10px] text-text-secondary uppercase tracking-wider font-bold flex items-center gap-1.5">
                  <IndianRupee size={12} className="text-saffron-deep" /> Est. Budget
                </span>
                <span className="text-base font-bold text-text-primary block">{formatPrice(project.minBudgetLakhs, project.maxBudgetLakhs)}</span>
              </div>
              <div className="space-y-1 border-l border-gray-100 pl-4 sm:pl-6">
                <span className="text-[10px] text-text-secondary uppercase tracking-wider font-bold flex items-center gap-1.5">
                  <Clock size={12} className="text-saffron-deep" /> Target Horizon
                </span>
                <span className="text-base font-bold text-text-primary block">{project.minHorizonYears} - {project.maxHorizonYears} Yrs</span>
              </div>
              <div className="space-y-1 border-l border-gray-100 pl-4 sm:pl-6">
                <span className="text-[10px] text-text-secondary uppercase tracking-wider font-bold flex items-center gap-1.5">
                  <Activity size={12} className="text-saffron-deep" /> Risk Index
                </span>
                <div className="mt-1">{getRiskBadge(project.riskLevel)}</div>
              </div>
              <div className="space-y-1 border-l border-gray-100 pl-4 sm:pl-6">
                <span className="text-[10px] text-text-secondary uppercase tracking-wider font-bold flex items-center gap-1.5">
                  <ShieldCheck size={12} className="text-growth" /> Verification
                </span>
                {project.riskLevel === "LOW" ? (
                  <span className="text-base font-bold text-growth flex items-center gap-1"><CheckCircle2 size={16} /> Verified</span>
                ) : (
                  <span className="text-base font-bold text-text-secondary">Standard</span>
                )}
              </div>
            </section>

            {/* Project Description */}
            <section className="card-premium space-y-4 !p-8">
              <h2 className="section-header text-xl">About the Project</h2>
              <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
                {project.description}
              </p>
            </section>

            {/* Infrastructure Highlights */}
            <section className="card-premium space-y-6 !p-8 border-t-4 border-t-saffron">
              <h2 className="section-header text-xl">Infrastructure Driving Growth</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {project.infraHighlights.map((tag, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-surface-dim rounded-lg border border-gray-100 hover:border-saffron/40 transition-colors">
                    <div className="bg-saffron-wash p-2 rounded-full text-saffron-deep shrink-0 mt-0.5">
                      <Sparkles size={14} />
                    </div>
                    <span className="text-xs font-semibold text-text-primary pt-1 leading-relaxed">
                      {tag}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Exit Opportunities */}
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

            {/* Comparable Projects */}
            {project.comparables && project.comparables.length > 0 && (
              <section className="card-premium space-y-4 !p-8 border-t-4 border-t-warning">
                <h2 className="section-header text-xl">Comparable Local Benchmarks</h2>
                <div className="flex flex-wrap gap-2">
                  {project.comparables.map((comp, idx) => (
                    <span key={idx} className="bg-surface-dim border border-gray-200 px-4 py-2 rounded-full text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors flex items-center gap-2">
                      <TrendingUp size={12} className="text-caution" /> {comp}
                    </span>
                  ))}
                </div>
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
          <div className="lg:col-span-1 stagger-2 animate-fade-in-up">
            <div className="sticky top-32 card-premium !p-0 overflow-hidden shadow-luxury border-gray-200">
              
              {/* Prominent Price Section */}
              <div className="bg-ink p-6 text-center text-surface relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <IndianRupee size={80} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-saffron block mb-2 relative z-10">
                  Investment Bracket
                </span>
                <h3 className="font-display text-4xl font-bold relative z-10">
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
