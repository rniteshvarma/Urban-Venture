/**
 * Facts that drive each news card's visual — derived from the headline (and
 * the feed's own short description), so the picture says something true and
 * specific about THIS story: its key number, where it is, and what stage it's at.
 * Pure; unit tested in live-news.test.ts.
 */
import type { NewsCategory, NewsSentiment } from '@prisma/client';
import { classifyEvent, extractCompletionPct, extractCrore, extractKm, extractTargetDate } from '../infra-intel/text';
import { classifyZone, findPlaces, haversineKm, HYDERABAD_CENTRE } from '../infra-intel/geo';

export interface KeyFact {
  value: string;
  label: string;
}

export interface MapPin {
  name: string;
  lat: number;
  lng: number;
}

export interface OffMap {
  name: string;
  distanceKm: number;
  direction: string; // N, NE, …
}

export interface Stage {
  steps: string[];
  current: number; // index into steps
  flag: 'DELAYED' | 'CANCELLED' | null;
}

export interface VisualFacts {
  fact: KeyFact | null;
  pins: MapPin[]; // places inside the Hyderabad map extent
  offMap: OffMap | null; // a Telangana place outside the map
  otherCity: string | null; // a non-Telangana city the story is about
  stage: Stage | null;
  tag: string;
  /** Only a city- or state-level place is named: the story is area-wide. */
  scope: 'CITY' | 'STATE' | 'NATION' | null;
}

/** Map extent (lat/lng) — the RRR plus its 20 km buffer. */
export const MAP_EXTENT = { minLat: 16.7, maxLat: 18.05, minLng: 77.9, maxLng: 79.1 };

function inExtent(lat: number, lng: number): boolean {
  return lat >= MAP_EXTENT.minLat && lat <= MAP_EXTENT.maxLat && lng >= MAP_EXTENT.minLng && lng <= MAP_EXTENT.maxLng;
}

const DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

export function direction(fromLat: number, fromLng: number, toLat: number, toLng: number): string {
  const y = Math.sin(((toLng - fromLng) * Math.PI) / 180) * Math.cos((toLat * Math.PI) / 180);
  const x =
    Math.cos((fromLat * Math.PI) / 180) * Math.sin((toLat * Math.PI) / 180) -
    Math.sin((fromLat * Math.PI) / 180) * Math.cos((toLat * Math.PI) / 180) * Math.cos(((toLng - fromLng) * Math.PI) / 180);
  const deg = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  return DIRS[Math.round(deg / 45) % 8];
}

const OTHER_CITIES = [
  'Navi Mumbai', 'Mumbai', 'Pune', 'Bengaluru', 'Bangalore', 'Chennai', 'Delhi', 'Gurugram', 'Gurgaon', 'Noida', 'Kolkata',
  'Ahmedabad', 'Amaravati', 'Visakhapatnam', 'Vizag', 'Vijayawada', 'Kochi', 'Jaipur', 'Lucknow', 'Goa', 'Nagpur', 'Indore',
  'Uttar Pradesh', 'UP', 'Maharashtra', 'Karnataka', 'Tamil Nadu', 'Kerala', 'Gujarat', 'Rajasthan', 'Haryana', 'Punjab',
  'West Bengal', 'Odisha', 'Andhra Pradesh', 'Bihar', 'Madhya Pradesh', 'Dubai', 'Singapore',
];
const CITY_ALIAS: Record<string, string> = { Bangalore: 'Bengaluru', Gurgaon: 'Gurugram', Vizag: 'Visakhapatnam', UP: 'Uttar Pradesh' };

function fmtIndian(n: number): string {
  return n.toLocaleString('en-IN', { maximumFractionDigits: n < 10 ? 2 : 0 });
}

/** The single most useful number/entity in the story. */
export function keyFact(text: string, authorities: string[] = []): KeyFact | null {
  const cr = extractCrore(text);
  if (cr !== null && cr > 0) {
    const value = cr >= 100000 ? `₹${fmtIndian(cr / 100000)} lakh cr` : `₹${fmtIndian(cr)} cr`;
    return { value, label: /\b(penalt|fine|compensation)/i.test(text) ? 'Penalty / compensation' : /\b(loss|wipe|dues)/i.test(text) ? 'Amount' : 'Investment' };
  }
  const lakh = text.match(/(?:rs\.?|₹)\s?([\d,]+(?:\.\d+)?)\s*(?:lakh\b(?!\s*(sq|crore))|l\b)/i);
  if (lakh) return { value: `₹${lakh[1]} lakh`, label: /\b(penalt|fine)/i.test(text) ? 'Penalty' : 'Amount' };
  const acres = text.match(/([\d,]+(?:\.\d+)?)\s*-?\s*acres?\b/i);
  if (acres) return { value: `${acres[1]} acres`, label: 'Land area' };
  const sqft = text.match(/([\d.]+)\s*(lakh|million|mn)\s*sq\.?\s*ft/i);
  if (sqft) return { value: `${sqft[1]} ${sqft[2].toLowerCase().startsWith('l') ? 'lakh' : 'mn'} sq ft`, label: 'Space' };
  const done = extractCompletionPct(text);
  if (done !== null) return { value: `${done}%`, label: 'Complete' };
  const pct = text.match(/(\d{1,3}(?:\.\d+)?)\s?(?:%|per\s?cent)/i);
  if (pct) return { value: `${pct[1]}%`, label: /\b(rise|up|jump|grow|surge|hike)/i.test(text) ? 'Increase' : /\b(fall|drop|down|decline|cut)/i.test(text) ? 'Decrease' : 'Change' };
  const km = extractKm(text);
  if (km !== null) return { value: `${fmtIndian(km)} km`, label: 'Length' };
  const target = extractTargetDate(text);
  if (target) return { value: target, label: 'Target date' };
  if (authorities.length) return { value: authorities[0], label: 'Authority' };
  return null;
}

const INFRA_STEPS = ['Plan', 'Approved', 'Land', 'Build', 'Open'];
const STATUS_TO_STEP: Record<string, number> = {
  ANNOUNCED: 0,
  APPROVED: 1,
  LAND_ACQUISITION: 2,
  UNDER_CONSTRUCTION: 3,
  PARTIALLY_COMPLETE: 4,
  COMPLETE: 4,
};

export function projectStage(text: string): Stage | null {
  const { status } = classifyEvent(text);
  if (!status) return null;
  if (status === 'DELAYED') return { steps: INFRA_STEPS, current: -1, flag: 'DELAYED' };
  if (status === 'CANCELLED') return { steps: INFRA_STEPS, current: -1, flag: 'CANCELLED' };
  return { steps: INFRA_STEPS, current: STATUS_TO_STEP[status] ?? 0, flag: null };
}

function tagFor(category: NewsCategory, sentiment: NewsSentiment, authorities: string[]): string {
  switch (category) {
    case 'POLICY_REGULATION':
      return authorities[0] ? `Rule change · ${authorities[0]}` : 'Rule change';
    case 'LEGAL_DISPUTES':
      return 'Legal risk';
    case 'MARKET_PRICES':
      return sentiment === 'POSITIVE' ? 'Prices & demand ↑' : sentiment === 'NEGATIVE' ? 'Prices & demand ↓' : 'Prices & demand';
    case 'PROJECT_LAUNCH':
      return 'New supply';
    case 'INDUSTRIAL_JOBS':
      return 'Jobs & investment';
    case 'CIVIC_UTILITIES':
      return 'Civic services';
    case 'MACRO_FINANCE':
      return 'Financing';
    case 'INFRASTRUCTURE':
      return 'Infrastructure';
  }
}

export function visualFacts(input: {
  headline: string;
  blurb?: string | null;
  category: NewsCategory;
  sentiment: NewsSentiment;
  authorities?: string[];
}): VisualFacts {
  const text = `${input.headline}. ${input.blurb ?? ''}`;
  const authorities = input.authorities ?? [];
  const places = findPlaces(input.headline).length ? findPlaces(input.headline) : findPlaces(text);
  const specific = places.filter((p) => !p.generic);

  const pins: MapPin[] = specific.filter((p) => inExtent(p.lat, p.lng)).slice(0, 3).map((p) => ({ name: p.name, lat: p.lat, lng: p.lng }));
  let offMap: OffMap | null = null;
  if (pins.length === 0) {
    const far = specific.find((p) => !inExtent(p.lat, p.lng) && classifyZone(p.lat, p.lng) !== 'OUTSIDE');
    if (far) {
      offMap = {
        name: far.name,
        distanceKm: Math.round(haversineKm(HYDERABAD_CENTRE.lat, HYDERABAD_CENTRE.lng, far.lat, far.lng) / 5) * 5,
        direction: direction(HYDERABAD_CENTRE.lat, HYDERABAD_CENTRE.lng, far.lat, far.lng),
      };
    }
  }
  const otherCity =
    pins.length === 0 && !offMap && !/\b(hyderabad|telangana)\b/i.test(text)
      ? OTHER_CITIES.find((c) => new RegExp(`\\b${c}\\b`, c === 'UP' ? '' : 'i').test(input.headline)) ?? null
      : null;

  const generic = places.filter((p) => p.generic).map((p) => p.name);
  const scope: VisualFacts['scope'] =
    pins.length === 0 && !offMap && !otherCity
      ? generic.includes('Hyderabad')
        ? 'CITY'
        : generic.includes('Telangana')
          ? 'STATE'
          : /\b(india|india['’]s|indian|nationwide|national|centre|union government)\b/i.test(input.headline)
            ? 'NATION'
            : null
      : null;

  const infraLike = input.category === 'INFRASTRUCTURE' || /\b(flyover|metro|corridor|ring road|expressway|highway|airport|railway|underpass|bridge)\b/i.test(input.headline);
  return {
    fact: keyFact(text, authorities),
    pins,
    offMap,
    otherCity: otherCity ? CITY_ALIAS[otherCity] ?? otherCity : null,
    stage: infraLike ? projectStage(input.headline) : null,
    tag: tagFor(input.category, input.sentiment, authorities),
    scope,
  };
}
