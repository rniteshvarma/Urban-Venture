"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";

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
      // Create user and lead by posting to /api/research
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budget: project.minBudgetLakhs,
          horizon: project.minHorizonYears,
          city: project.city,
          name,
          email,
          phone,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSubmitSuccess(true);
      } else {
        setErrorMsg(data.error || "Failed to submit request.");
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

  if (isLoading) {
    return (
      <div className="flex-grow flex flex-col justify-center items-center py-24 bg-luxury-bg animate-pulse">
        <div className="h-8 bg-luxury-border w-48 rounded mb-4" />
        <div className="h-4 bg-luxury-border w-64 rounded" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex-grow flex flex-col justify-center items-center py-24 bg-luxury-bg text-center">
        <h2 className="font-display text-2xl font-bold text-primary mb-2">Project Not Found</h2>
        <p className="text-xs text-text-secondary mb-6">The requested project detail does not exist.</p>
        <Link href="/projects" className="px-4 py-2 bg-primary text-surface text-xs font-semibold uppercase tracking-wider rounded-tag">
          Back to Projects
        </Link>
      </div>
    );
  }

  const mainImage = (project.imageUrls && project.imageUrls.length > 0)
    ? project.imageUrls[0]
    : `https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80`;

  return (
    <div className="flex-grow bg-luxury-bg">
      {/* Hero Banner */}
      <div className="relative h-96 bg-primary-light w-full overflow-hidden">
        {mainImage.startsWith("/") && mainImage !== "/placeholder-project.jpg" ? (
          <img 
            src={mainImage} 
            alt={project.name}
            className="w-full h-full object-cover opacity-90"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80`;
            }}
          />
        ) : (
          <img 
            src={`https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80`} 
            alt={project.name}
            className="w-full h-full object-cover opacity-90"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent flex items-end">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pb-8">
            <div className="space-y-2">
              <span className="text-xs font-bold text-accent uppercase tracking-widest border border-accent/30 bg-primary/40 px-3 py-1 rounded-tag">
                {project.corridor}
              </span>
              <h1 className="font-display text-3xl sm:text-5xl font-bold text-surface">
                {project.name}
              </h1>
              <p className="text-sm text-gray-300">
                Developed by <strong className="text-surface">{project.developer}</strong> · {project.city}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Details Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          
          {/* Left Columns (Project Info) */}
          <div className="lg:col-span-2 space-y-10">
            {/* Overview Attributes */}
            <section className="bg-surface border border-luxury p-6 rounded-card shadow-sm grid grid-cols-2 sm:grid-cols-4 gap-6">
              <div>
                <span className="text-[10px] text-text-secondary uppercase tracking-wider block">Investment Bracket</span>
                <span className="text-base font-bold text-primary">{formatPrice(project.minBudgetLakhs, project.maxBudgetLakhs)}</span>
              </div>
              <div>
                <span className="text-[10px] text-text-secondary uppercase tracking-wider block">Target Horizon</span>
                <span className="text-base font-bold text-primary">{project.minHorizonYears} - {project.maxHorizonYears} Years</span>
              </div>
              <div>
                <span className="text-[10px] text-text-secondary uppercase tracking-wider block">Risk Index</span>
                <span className="text-base font-bold text-accent uppercase tracking-wide">{project.riskLevel} Risk</span>
              </div>
              <div>
                <span className="text-[10px] text-text-secondary uppercase tracking-wider block">Property Type</span>
                <span className="text-base font-bold text-primary">{project.propertyType}</span>
              </div>
            </section>

            {/* Project Description */}
            <section className="space-y-4">
              <h2 className="font-display text-2xl font-bold text-primary">About the Project</h2>
              <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
                {project.description}
              </p>
            </section>

            {/* Infrastructure Highlights */}
            <section className="space-y-4">
              <h2 className="font-display text-2xl font-bold text-primary">Infrastructure Driving Growth</h2>
              <div className="flex flex-wrap gap-2">
                {project.infraHighlights.map((tag, idx) => (
                  <span key={idx} className="bg-surface border border-luxury px-3.5 py-1.5 rounded-tag text-xs font-semibold text-primary shadow-sm">
                    🚀 {tag}
                  </span>
                ))}
              </div>
            </section>

            {/* Exit Opportunities */}
            <section className="space-y-4">
              <h2 className="font-display text-2xl font-bold text-primary">Liquidation & Exit Opportunities</h2>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {project.exitOpportunities.map((exit, idx) => (
                  <li key={idx} className="bg-surface border border-luxury px-4 py-3 rounded-card text-xs text-text-secondary flex items-start gap-2.5 shadow-sm">
                    <span className="text-accent text-sm">✔</span>
                    <span>{exit}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Comparable Projects */}
            {project.comparables && project.comparables.length > 0 && (
              <section className="space-y-4">
                <h2 className="font-display text-2xl font-bold text-primary">Comparable Local Benchmarks</h2>
                <div className="flex flex-wrap gap-2">
                  {project.comparables.map((comp, idx) => (
                    <span key={idx} className="bg-luxury-bg border border-luxury px-3 py-1.5 rounded-tag text-xs text-text-secondary">
                      🏢 {comp}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Brochure download if brochureUrl exists */}
            {project.brochureUrl && (
              <section className="bg-surface border border-luxury p-5 rounded-card shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-primary uppercase tracking-wide">Project Documentation</h3>
                  <p className="text-xs text-text-secondary">Download full RERA registration documents and layouts.</p>
                </div>
                <a
                  href={project.brochureUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 border border-accent text-accent hover:bg-accent hover:text-surface text-xs font-bold uppercase tracking-wider rounded-tag transition-colors"
                >
                  Download Brochure PDF
                </a>
              </section>
            )}
          </div>

          {/* Right Column (Express Interest Form) */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-surface border border-luxury p-6 rounded-card shadow-luxury-soft space-y-6">
              <div className="text-center border-b border-luxury pb-4">
                <span className="text-[10px] text-accent font-bold uppercase tracking-widest block mb-1">Direct Advisor Connect</span>
                <h3 className="font-display text-lg font-bold text-primary">Express Investment Interest</h3>
              </div>

              {submitSuccess ? (
                <div className="text-center py-6 space-y-3">
                  <div className="text-3xl">✅</div>
                  <h4 className="font-display text-base font-bold text-primary">Interest Registered</h4>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Thank you! Our Hyderabad advisor has received your request and will call you with project layouts and price sheets.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleExpressInterest} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-secondary mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      placeholder="Your Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-luxury-bg border border-luxury px-3 py-2 rounded-input text-xs text-text-primary focus:outline-none focus:border-accent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-secondary mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-luxury-bg border border-luxury px-3 py-2 rounded-input text-xs text-text-primary focus:outline-none focus:border-accent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-secondary mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      placeholder="+91 99999 99999"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-luxury-bg border border-luxury px-3 py-2 rounded-input text-xs text-text-primary focus:outline-none focus:border-accent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-secondary mb-1">
                      Message / Notes (Optional)
                    </label>
                    <textarea
                      placeholder="Requesting site visit details or pricing sheets..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      className="w-full bg-luxury-bg border border-luxury px-3 py-2 rounded-input text-xs text-text-primary focus:outline-none focus:border-accent resize-none"
                    />
                  </div>

                  {errorMsg && (
                    <p className="text-red-600 text-xs text-center">{errorMsg}</p>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-primary hover:bg-primary-light text-surface text-xs font-semibold uppercase tracking-widest rounded-[4px] disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {isSubmitting ? "Submitting..." : "Submit Inquiry"}
                  </button>
                </form>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
