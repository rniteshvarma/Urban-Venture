/**
 * Story visual for a news card — generated from THIS story's facts, not a
 * stock photo: its key number, where it happens on a Hyderabad map (RRR + ORR),
 * and, for projects, which stage it has reached. Server component, inline SVG,
 * no external requests, no third-party imagery (spec Part 0 constraint 2).
 */
import React from 'react';
import type { NewsCategory, NewsSentiment } from '@prisma/client';
import { Building2, Droplets, Factory, Gavel, Hammer, Landmark, MapPin, Scale, TrendingUp } from 'lucide-react';
import { CATEGORY_LABEL } from '@/lib/news/categories';
import { MAP_EXTENT, visualFacts, type VisualFacts } from '@/lib/news/visual-facts';
import { HYDERABAD_CENTRE, RRR_POLYGON } from '@/lib/infra-intel/geo';

const TINT: Record<NewsCategory, { accent: string; fg: string }> = {
  INFRASTRUCTURE: { accent: '#F59E0B', fg: '#111827' },
  POLICY_REGULATION: { accent: '#94A3B8', fg: '#0F172A' },
  MARKET_PRICES: { accent: '#10B981', fg: '#052e1c' },
  PROJECT_LAUNCH: { accent: '#A78BFA', fg: '#1e1238' },
  INDUSTRIAL_JOBS: { accent: '#2DD4BF', fg: '#042f2e' },
  LEGAL_DISPUTES: { accent: '#F87171', fg: '#3b0a0a' },
  CIVIC_UTILITIES: { accent: '#38BDF8', fg: '#082f49' },
  MACRO_FINANCE: { accent: '#60A5FA', fg: '#0b1d3a' },
};

const ICON: Record<NewsCategory, React.ComponentType<{ size?: number; strokeWidth?: number; color?: string }>> = {
  INFRASTRUCTURE: Hammer,
  POLICY_REGULATION: Landmark,
  MARKET_PRICES: TrendingUp,
  PROJECT_LAUNCH: Building2,
  INDUSTRIAL_JOBS: Factory,
  LEGAL_DISPUTES: Gavel,
  CIVIC_UTILITIES: Droplets,
  MACRO_FINANCE: Scale,
};

// Map projection: 1 SVG unit ≈ 1 km at Hyderabad's latitude.
const KX = 111.32 * Math.cos((17.4 * Math.PI) / 180);
const KY = 110.574;
const W = (MAP_EXTENT.maxLng - MAP_EXTENT.minLng) * KX;
const H = (MAP_EXTENT.maxLat - MAP_EXTENT.minLat) * KY;
const px = (lng: number) => (lng - MAP_EXTENT.minLng) * KX;
const py = (lat: number) => (MAP_EXTENT.maxLat - lat) * KY;

const RRR_PATH = RRR_POLYGON.map(([lat, lng], i) => `${i ? 'L' : 'M'}${px(lng).toFixed(1)},${py(lat).toFixed(1)}`).join(' ') + ' Z';
const CX = px(HYDERABAD_CENTRE.lng);
const CY = py(HYDERABAD_CENTRE.lat);
const ORR_R = 22; // km — the Outer Ring Road is roughly a 22 km-radius loop

const DIR_VEC: Record<string, [number, number]> = {
  N: [0, -1], NE: [0.7, -0.7], E: [1, 0], SE: [0.7, 0.7], S: [0, 1], SW: [-0.7, 0.7], W: [-1, 0], NW: [-0.7, -0.7],
};

/** Box aspect (w/h) of the map slot: 44% of a 16:9 card, minus padding. */
const SLOT_ASPECT = 0.8;
const MIN_SPAN_KM = 34;

/** Zoom to the pins (with room for labels); fall back to the whole RRR region. */
function viewFor(facts: VisualFacts): { x: number; y: number; w: number; h: number } {
  if (facts.pins.length === 0) {
    const h = H;
    const w = Math.max(W, h * SLOT_ASPECT);
    return { x: (W - w) / 2, y: 0, w, h };
  }
  const xs = facts.pins.map((p) => px(p.lng));
  const ys = facts.pins.map((p) => py(p.lat));
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const w = Math.max(MIN_SPAN_KM, Math.max(...xs) - Math.min(...xs) + 34, (Math.max(...ys) - Math.min(...ys) + 26) * SLOT_ASPECT);
  const h = w / SLOT_ASPECT;
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

function HydMap({ facts, accent }: { facts: VisualFacts; accent: string }) {
  const v = viewFor(facts);
  const k = v.w / 100; // scale so strokes and text look the same at every zoom
  const label: React.CSSProperties = { paintOrder: 'stroke', stroke: '#0B1220', strokeWidth: 3 * k, strokeLinejoin: 'round' };
  const arrow = facts.offMap ? DIR_VEC[facts.offMap.direction] : null;
  const reach = Math.min(v.w, v.h) * 0.42;

  // Label placement: right of the pin unless near the right edge; a pin close to a
  // previous one flips side and nudges down so labels never overlap.
  const placed: { x: number; y: number; right: boolean; dy: number }[] = [];
  for (const p of facts.pins) {
    const x = px(p.lng);
    const y = py(p.lat);
    let right = x < v.x + v.w * 0.6;
    let dy = 0;
    const near = placed.find((q) => Math.hypot(q.x - x, q.y - y) < v.w * 0.3);
    if (near) {
      right = !near.right;
      if (Math.abs(near.y + near.dy - y) < 9 * k) dy = y >= near.y ? 9 * k : -9 * k;
    }
    placed.push({ x, y, right, dy });
  }

  return (
    <svg
      viewBox={`${v.x.toFixed(1)} ${v.y.toFixed(1)} ${v.w.toFixed(1)} ${v.h.toFixed(1)}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={
        facts.pins.length
          ? `Map of Hyderabad marking ${facts.pins.map((p) => p.name).join(', ')}`
          : facts.offMap
            ? `${facts.offMap.name}, ${facts.offMap.distanceKm} km ${facts.offMap.direction} of Hyderabad`
            : 'Map of Hyderabad'
      }
    >
      <path d={RRR_PATH} fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.35)" strokeWidth={0.9 * k} strokeDasharray={`${3 * k} ${2.5 * k}`} />
      <circle cx={CX} cy={CY} r={ORR_R} fill={facts.scope === 'CITY' ? `${accent}30` : 'none'} stroke={facts.scope === 'CITY' ? accent : 'rgba(255,255,255,0.3)'} strokeWidth={0.9 * k} />
      {facts.scope === 'CITY' && (
        <text x={CX} y={CY + ORR_R + 12 * k} fontSize={7.5 * k} fontWeight={700} fill="#FFFFFF" textAnchor="middle" style={label}>City-wide</text>
      )}
      <circle cx={CX} cy={CY} r={1.8 * k} fill="rgba(255,255,255,0.75)" />
      {/* City label only when it fits inside the view (pins are the point when zoomed in). */}
      {CX + 3 * k + 32 * k < v.x + v.w && CY > v.y + 6 * k && (
        <text x={CX + 3 * k} y={CY - 3 * k} fontSize={6 * k} fill="rgba(255,255,255,0.6)" style={label}>Hyderabad</text>
      )}
      <text x={CX + ORR_R * 0.7 + 1.5 * k} y={CY + ORR_R * 0.7 + 6 * k} fontSize={5 * k} fill="rgba(255,255,255,0.45)">ORR</text>
      {facts.pins.length === 0 && <text x={px(78.95)} y={py(17.83)} fontSize={5 * k} fill="rgba(255,255,255,0.45)" textAnchor="end">RRR</text>}

      {facts.pins.map((p, i) => {
        const { x, y, right, dy } = placed[i];
        return (
          <g key={p.name}>
            <circle cx={x} cy={y} r={5.5 * k} fill={accent} opacity={0.22} />
            <circle cx={x} cy={y} r={2.6 * k} fill={accent} stroke="#0B1220" strokeWidth={0.8 * k} />
            <text x={right ? x + 5 * k : x - 5 * k} y={y + dy + 2.5 * k} fontSize={7.5 * k} fontWeight={700} fill="#FFFFFF" textAnchor={right ? 'start' : 'end'} style={label}>
              {p.name}
            </text>
          </g>
        );
      })}

      {facts.offMap && arrow && (
        <g>
          <line x1={CX} y1={CY} x2={CX + arrow[0] * reach} y2={CY + arrow[1] * reach} stroke={accent} strokeWidth={1.4 * k} strokeDasharray={`${4 * k} ${2 * k}`} />
          <circle cx={CX + arrow[0] * reach} cy={CY + arrow[1] * reach} r={2.8 * k} fill={accent} />
          <text
            x={CX + arrow[0] * reach}
            y={CY + arrow[1] * reach + (arrow[1] > 0.1 ? -6 * k : 10 * k)}
            fontSize={7 * k}
            fontWeight={700}
            fill="#FFFFFF"
            textAnchor={arrow[0] > 0.1 ? 'end' : arrow[0] < -0.1 ? 'start' : 'middle'}
            style={label}
          >
            {facts.offMap.name} · {facts.offMap.distanceKm} km {facts.offMap.direction}
          </text>
        </g>
      )}
    </svg>
  );
}

function StageStrip({ stage, accent }: { stage: NonNullable<VisualFacts['stage']>; accent: string }) {
  if (stage.flag) {
    return (
      <span style={{ display: 'inline-block', background: stage.flag === 'DELAYED' ? '#B45309' : '#991B1B', color: '#fff', fontSize: 10, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', padding: '3px 8px', borderRadius: 5 }}>
        {stage.flag === 'DELAYED' ? 'Delayed / on hold' : 'Scrapped'}
      </span>
    );
  }
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }} aria-label={`Stage: ${stage.steps[stage.current]}`}>
      {stage.steps.map((s, i) => {
        const done = i <= stage.current;
        return (
          <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 38 }}>
            <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <div style={{ flex: 1, height: 2, background: i === 0 ? 'transparent' : done ? accent : 'rgba(255,255,255,0.18)' }} />
              <div style={{ width: i === stage.current ? 10 : 7, height: i === stage.current ? 10 : 7, borderRadius: 99, background: done ? accent : 'rgba(255,255,255,0.22)', boxShadow: i === stage.current ? `0 0 0 3px ${accent}40` : 'none' }} />
              <div style={{ flex: 1, height: 2, background: i === stage.steps.length - 1 ? 'transparent' : i < stage.current ? accent : 'rgba(255,255,255,0.18)' }} />
            </div>
            <span style={{ marginTop: 3, fontSize: 8.5, whiteSpace: 'nowrap', fontWeight: i === stage.current ? 800 : 500, color: i === stage.current ? '#fff' : 'rgba(255,255,255,0.5)' }}>{s}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function StoryVisual({
  headline,
  blurb,
  category,
  sentiment,
  impactScore,
  authorities,
}: {
  headline: string;
  blurb?: string | null;
  category: NewsCategory;
  sentiment: NewsSentiment;
  impactScore: number;
  authorities?: string[];
}) {
  const facts = visualFacts({ headline, blurb, category, sentiment, authorities });
  const { accent, fg } = TINT[category];
  const Icon = ICON[category];
  const showMap = facts.pins.length > 0 || !!facts.offMap || facts.scope === 'CITY';

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        aspectRatio: '16 / 9',
        overflow: 'hidden',
        background: `radial-gradient(120% 90% at 85% 40%, ${accent}26 0%, rgba(11,18,32,0) 60%), linear-gradient(160deg, #0F1A2E 0%, #0B1220 100%)`,
        color: '#fff',
        fontFamily: '"Plus Jakarta Sans", var(--font-sans, sans-serif)',
      }}
    >
      {/* Map (or city / icon) on the right */}
      <div style={{ position: 'absolute', top: 8, right: 8, bottom: 8, width: '44%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {showMap ? (
          <HydMap facts={facts} accent={accent} />
        ) : facts.otherCity ? (
          <div style={{ textAlign: 'center' }}>
            <MapPin size={30} color={accent} strokeWidth={2.2} />
            <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>{facts.otherCity}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>outside Telangana</div>
          </div>
        ) : facts.scope === 'STATE' || facts.scope === 'NATION' ? (
          <div style={{ textAlign: 'center' }}>
            <Icon size={40} strokeWidth={1.5} color={accent} />
            <div style={{ fontSize: 15, fontWeight: 800, marginTop: 6 }}>{facts.scope === 'STATE' ? 'Telangana' : 'India'}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>{facts.scope === 'STATE' ? 'statewide' : 'nationwide'}</div>
          </div>
        ) : (
          <Icon size={64} strokeWidth={1.3} color={`${accent}B0`} />
        )}
      </div>

      {/* Category + impact */}
      <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
        <span style={{ background: accent, color: fg, fontSize: 10, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase', padding: '3px 8px', borderRadius: 5 }}>
          {CATEGORY_LABEL[category]}
        </span>
        {impactScore > 0 && (
          <span
            title="How much this could change a buyer's decision (our estimate)"
            style={{ background: impactScore >= 8 ? 'rgba(239,68,68,0.9)' : impactScore >= 6 ? 'rgba(245,158,11,0.9)' : 'rgba(255,255,255,0.14)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 5 }}
          >
            Impact {impactScore}/10
          </span>
        )}
      </div>

      {/* Key fact */}
      <div style={{ position: 'absolute', left: 14, top: '30%', width: '52%' }}>
        {facts.fact ? (
          <>
            <div style={{ fontSize: 'clamp(20px, 2.6vw, 30px)', fontWeight: 800, lineHeight: 1.05, letterSpacing: -0.5, wordBreak: 'break-word' }}>{facts.fact.value}</div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.1, textTransform: 'uppercase', color: accent, marginTop: 4 }}>{facts.fact.label}</div>
          </>
        ) : (
          <div style={{ fontSize: 'clamp(16px, 2vw, 22px)', fontWeight: 800, lineHeight: 1.15 }}>{facts.tag}</div>
        )}
      </div>

      {/* Stage or tag */}
      <div style={{ position: 'absolute', left: 12, bottom: 12, width: '54%' }}>
        {facts.stage ? (
          <StageStrip stage={facts.stage} accent={accent} />
        ) : facts.fact ? (
          <span style={{ display: 'inline-block', border: '1px solid rgba(255,255,255,0.22)', color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 999 }}>
            {facts.tag}
          </span>
        ) : null}
      </div>
    </div>
  );
}
