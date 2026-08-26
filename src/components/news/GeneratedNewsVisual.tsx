"use client";

/**
 * Editorial Photographic News Visual Engine
 * Provides deterministic, high-resolution editorial photography for news cards
 * matched to categories, sub-topics, and headline content with authentic news overlays.
 */

import React, { useState } from 'react';
import type { NewsCategory, NewsSentiment } from '@prisma/client';
import { CATEGORY_LABEL } from '@/lib/news/categories';

interface NewsVisualProps {
  seed: string;
  category: NewsCategory;
  impactScore: number;
  headline?: string;
  sentiment?: NewsSentiment;
  variant?: '16:9' | '1:1';
  className?: string;
}

// Curated collection of high-resolution editorial photographs per category
const CATEGORY_IMAGES: Record<NewsCategory, string[]> = {
  INFRASTRUCTURE: [
    'https://images.unsplash.com/photo-1545459720-aac8509eb02c?auto=format&fit=crop&w=800&q=80', // Multi-lane expressway & interchange
    'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=800&q=80', // Modern metro rail transit
    'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=800&q=80', // Major infrastructure construction & crane
    'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80', // Aerotropolis / highway corridor
    'https://images.unsplash.com/photo-1590486803833-1c5dc8ddd4c8?auto=format&fit=crop&w=800&q=80', // Modern bridge & transit corridor
  ],
  MACRO_FINANCE: [
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80', // Glass financial district tower
    'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=800&q=80', // Stock exchange & financial data
    'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=800&q=80', // Commercial atrium & investment banking
    'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=800&q=80', // Central bank / financial institution
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80', // Economic charts & fiscal analysis
  ],
  POLICY_REGULATION: [
    'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80', // Government master plans & blueprints
    'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=800&q=80', // Cadastral survey & GIS map
    'https://images.unsplash.com/photo-1555848962-6e79363ec58f?auto=format&fit=crop&w=800&q=80', // Administrative secretariat building
    'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=800&q=80', // Official legislative documentation
  ],
  MARKET_PRICES: [
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80', // Premium real estate market
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80', // Plotted land & green growth corridor
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80', // Kokapet / Neopolis skyline
    'https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&w=800&q=80', // Real estate valuation & city expansion
  ],
  PROJECT_LAUNCH: [
    'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=800&q=80', // Luxury villa launch
    'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80', // Modern high-rise residential tower
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80', // Contemporary gated community
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80', // Luxury residential architecture
  ],
  INDUSTRIAL_JOBS: [
    'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80', // Hi-tech manufacturing facility
    'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80', // Logistics & SEZ industrial park
    'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=800&q=80', // Pharma & biotechnology research lab
    'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=800&q=80', // Engineering manufacturing plant
  ],
  LEGAL_DISPUTES: [
    'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80', // High court & legal documents
    'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80', // Title deeds & dispute records
    'https://images.unsplash.com/photo-1589994965851-a8f479c573a9?auto=format&fit=crop&w=800&q=80', // Legal library & case files
  ],
  CIVIC_UTILITIES: [
    'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80', // Solar energy & power grid
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80', // Water reservoirs & civic grid
    'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=800&q=80', // Urban power infrastructure
  ],
};

const CATEGORY_COLORS: Record<NewsCategory, { badgeBg: string; badgeFg: string; border: string }> = {
  INFRASTRUCTURE: { badgeBg: '#F59E0B', badgeFg: '#000000', border: '#D97706' },
  MACRO_FINANCE: { badgeBg: '#2563EB', badgeFg: '#FFFFFF', border: '#1D4ED8' },
  POLICY_REGULATION: { badgeBg: '#475569', badgeFg: '#FFFFFF', border: '#334155' },
  MARKET_PRICES: { badgeBg: '#10B981', badgeFg: '#000000', border: '#059669' },
  PROJECT_LAUNCH: { badgeBg: '#8B5CF6', badgeFg: '#FFFFFF', border: '#7C3AED' },
  INDUSTRIAL_JOBS: { badgeBg: '#0D9488', badgeFg: '#FFFFFF', border: '#0F766E' },
  LEGAL_DISPUTES: { badgeBg: '#EF4444', badgeFg: '#FFFFFF', border: '#DC2626' },
  CIVIC_UTILITIES: { badgeBg: '#0284C7', badgeFg: '#FFFFFF', border: '#0369A1' },
};

function getDeterministicImage(seed: string, category: NewsCategory, headline?: string): string {
  const images = CATEGORY_IMAGES[category] || CATEGORY_IMAGES.INFRASTRUCTURE;
  
  // Topic-specific keyword overrides for maximum contextual accuracy
  if (headline) {
    const hl = headline.toLowerCase();
    if (hl.includes('repo rate') || hl.includes('rbi') || hl.includes('interest rate') || hl.includes('inflation')) {
      return CATEGORY_IMAGES.MACRO_FINANCE[0];
    }
    if (hl.includes('reit') || hl.includes('commercial') || hl.includes('retail investor')) {
      return CATEGORY_IMAGES.MACRO_FINANCE[1];
    }
    if (hl.includes('rrr') || hl.includes('ring road') || hl.includes('highway') || hl.includes('expressway')) {
      return CATEGORY_IMAGES.INFRASTRUCTURE[0];
    }
    if (hl.includes('metro') || hl.includes('transit') || hl.includes('rail')) {
      return CATEGORY_IMAGES.INFRASTRUCTURE[1];
    }
    if (hl.includes('digitisation') || hl.includes('dharani') || hl.includes('land record') || hl.includes('survey')) {
      return CATEGORY_IMAGES.POLICY_REGULATION[1];
    }
    if (hl.includes('court') || hl.includes('rera') || hl.includes('dispute') || hl.includes('encroach')) {
      return CATEGORY_IMAGES.LEGAL_DISPUTES[0];
    }
    if (hl.includes('pharma') || hl.includes('manufacturing') || hl.includes('factory') || hl.includes('jobs')) {
      return CATEGORY_IMAGES.INDUSTRIAL_JOBS[0];
    }
    if (hl.includes('villa') || hl.includes('launch') || hl.includes('gated community')) {
      return CATEGORY_IMAGES.PROJECT_LAUNCH[0];
    }
  }

  // Hash seed to select image deterministically
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % images.length;
  return images[index];
}

export default function GeneratedNewsVisual({
  seed,
  category,
  impactScore,
  headline,
  variant = '16:9',
  className = '',
}: NewsVisualProps) {
  const imageUrl = getDeterministicImage(seed, category, headline);
  const color = CATEGORY_COLORS[category] || CATEGORY_COLORS.INFRASTRUCTURE;
  const label = CATEGORY_LABEL[category] || category;

  return (
    <div
      className={`relative w-full h-full overflow-hidden bg-slate-900 group ${className}`}
      style={{
        aspectRatio: variant === '1:1' ? '1 / 1' : '16 / 9',
      }}
    >
      {/* Editorial Photo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt={headline || `${label} news`}
        loading="lazy"
        className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        onError={(e) => {
          // Fallback to high-res city landscape if specific photo fails
          (e.target as HTMLImageElement).src =
            'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80';
        }}
      />

      {/* Cinematic Dark Gradient Scrim for Readability */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(180deg, rgba(15, 23, 42, 0.45) 0%, rgba(15, 23, 42, 0) 40%, rgba(15, 23, 42, 0.85) 100%)',
        }}
      />

      {/* Top Left: Category Badge */}
      <div className="absolute top-3 left-3 z-10">
        <span
          className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider shadow-sm"
          style={{
            background: color.badgeBg,
            color: color.badgeFg,
          }}
        >
          {label}
        </span>
      </div>

      {/* Top Right: Impact Score Pill */}
      {impactScore > 0 && (
        <div className="absolute top-3 right-3 z-10">
          <span
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold shadow-sm backdrop-blur-md"
            style={{
              background:
                impactScore >= 8
                  ? 'rgba(239, 68, 68, 0.9)' // Red for High Impact
                  : impactScore >= 6
                  ? 'rgba(245, 158, 11, 0.9)' // Amber for Medium Impact
                  : 'rgba(15, 23, 42, 0.75)',
              color: '#FFFFFF',
            }}
          >
            <span>⚡</span>
            <span>Impact {impactScore}/10</span>
          </span>
        </div>
      )}

      {/* Bottom Overlay Title Bar (Micro-Watermark) */}
      <div className="absolute bottom-2.5 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
        <span className="text-[10px] font-mono font-medium text-white/70 tracking-widest uppercase">
          PROPERTY TIGER · INTELLIGENCE
        </span>
      </div>
    </div>
  );
}
