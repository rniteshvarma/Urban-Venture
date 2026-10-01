// Hyderabad micro-market zones for developer inventory.
//
// A project's `corridor` is the zone it sits in, so the Projects page can filter
// real inventory by the markets buyers actually search ("Kokapet", "Tellapur",
// "Kompally"...). A locality name match wins; otherwise the nearest zone anchor
// by distance. Anchors are approximate zone centres, used only for assignment —
// never to position a property pin.

import { haversineKm } from "./rating";

export interface Zone {
  name: string;
  lat: number;
  lng: number;
  keywords: string[];
}

export const ZONES: Zone[] = [
  { name: "Financial District / Kokapet / Narsingi", lat: 17.405, lng: 78.335, keywords: ["kokapet", "financial district", "nanakramguda", "narsingi", "puppalaguda", "manikonda", "khajaguda", "gandipet", "neopolis", "wipro", "kokapeta", "neknampur", "alkapur"] },
  { name: "Gachibowli / HITEC City / Kondapur", lat: 17.448, lng: 78.37, keywords: ["gachibowli", "hitec", "hi-tech", "hitech", "madhapur", "kondapur", "kothaguda", "raidurg", "hafeezpet", "serilingampally", "masjid banda", "gowlidoddi", "lanco hills"] },
  { name: "Tellapur / Nallagandla / Kollur", lat: 17.465, lng: 78.285, keywords: ["tellapur", "nallagandla", "gopanpally", "kollur", "osman nagar", "osmannagar", "velimela", "vattinagulapally", "nagulapalli", "nagulapally"] },
  { name: "Miyapur / Bachupally / Nizampet", lat: 17.52, lng: 78.37, keywords: ["miyapur", "bachupally", "bachupalli", "nizampet", "pragathi nagar", "chandanagar", "ameenpur", "beeramguda", "bowrampet", "gajularamaram", "kukatpally", "kphb", "hydernagar", "mallampet", "lingampally", "allwyn colony", "jagathgiri", "bollaram"] },
  { name: "Kompally / Medchal / NH44 North", lat: 17.55, lng: 78.48, keywords: ["kompally", "medchal", "gundlapochampally", "dulapally", "suchitra", "dundigal", "kandlakoya", "shamirpet", "jeedimetla", "quthbullapur", "petbasheerabad", "gowdavalli", "athvelly", "kistapur"] },
  { name: "Secunderabad / Alwal / ECIL", lat: 17.49, lng: 78.54, keywords: ["alwal", "kowkur", "sainikpuri", "ecil", "kapra", "yapral", "bolarum", "malkajgiri", "secunderabad", "trimulgherry", "neredmet", "nagaram", "dammaiguda", "a s rao nagar", "as rao nagar", "cherlapally", "kushaiguda", "bowenpally"] },
  { name: "Uppal / Pocharam / Ghatkesar", lat: 17.42, lng: 78.64, keywords: ["uppal", "ghatkesar", "pocharam", "peerzadiguda", "boduppal", "medipally", "narapally", "annojiguda", "chengicherla", "keesara", "habsiguda", "tarnaka", "ramanthapur", "nacharam", "mallapur", "korremula", "kachavanisingaram", "yamnampet", "pratap singaram", "rampally"] },
  { name: "LB Nagar / Hayathnagar / Nagole", lat: 17.34, lng: 78.57, keywords: ["lb nagar", "l b nagar", "hayathnagar", "hayatnagar", "vanasthalipuram", "nagole", "kothapet", "dilsukhnagar", "saroornagar", "karmanghat", "pedda amberpet", "abdullapurmet", "bn reddy", "b n reddy", "champapet", "meerpet", "badangpet", "almasguda", "balapur", "turkayamjal"] },
  { name: "Adibatla / Kongara Kalan / Ibrahimpatnam", lat: 17.235, lng: 78.58, keywords: ["adibatla", "kongara", "ibrahimpatnam", "mangalpally", "bongulur", "nadergul"] },
  { name: "Future City / Kandukur / Maheshwaram", lat: 17.16, lng: 78.53, keywords: ["kandukur", "maheshwaram", "kadthal", "tummaloor", "srisailam highway", "raviryal", "pharma city", "future city", "fab city", "mucherla", "amangal"] },
  { name: "Shamshabad / Tukkuguda / Airport", lat: 17.245, lng: 78.43, keywords: ["shamshabad", "tukkuguda", "mamidipally", "pahadi shareef", "jalpally", "kothwalguda", "airport", "srinagar colony shamshabad", "gaganpahad", "satamrai"] },
  { name: "Attapur / Rajendranagar / Bandlaguda", lat: 17.355, lng: 78.41, keywords: ["attapur", "rajendranagar", "bandlaguda", "kismatpur", "budvel", "upparpally", "hyderguda", "appa junction", "himayat sagar", "himayatsagar", "peeramcheru", "tolichowki", "mehdipatnam", "langar houz", "shaikpet"] },
  { name: "Central Hyderabad", lat: 17.41, lng: 78.465, keywords: ["banjara hills", "jubilee hills", "begumpet", "ameerpet", "somajiguda", "himayatnagar", "khairatabad", "film nagar", "masab tank", "punjagutta", "erragadda", "sanath nagar", "sanathnagar", "balkampet", "sr nagar", "amberpet", "barkatpura"] },
  { name: "Mokila / Shankarpally / Moinabad", lat: 17.38, lng: 78.23, keywords: ["mokila", "shankarpally", "shankarpalli", "janwada", "chevella", "moinabad", "proddutur", "kondakal", "mominpet", "aziz nagar", "chilkur"] },
  { name: "Patancheru / Isnapur / Sangareddy", lat: 17.53, lng: 78.24, keywords: ["patancheru", "patancheruvu", "isnapur", "sangareddy", "ramachandrapuram", "rc puram", "bhel", "muthangi", "pashamylaram", "rudraram", "kandi", "indresham"] },
  { name: "Shadnagar / Kothur / NH44 South", lat: 17.07, lng: 78.2, keywords: ["shadnagar", "kothur", "thimmapur", "farooqnagar", "nandigama", "kottur", "jadcherla"] },
  { name: "Bibinagar / Bhongir / Yadadri", lat: 17.47, lng: 78.8, keywords: ["bibinagar", "bhongir", "bhuvanagiri", "yadadri", "yadagirigutta", "choutuppal", "pochampally"] },
];

/** Hyderabad city centre (Charminar–Abids) and the "in and around Hyderabad" radius. */
export const CITY_CENTRE = { lat: 17.385, lng: 78.4867 };
export const MAX_RADIUS_KM = 75;

export function withinHyderabad(lat: number, lng: number): boolean {
  return haversineKm({ lat, lng }, CITY_CENTRE) <= MAX_RADIUS_KM;
}

/** Zone for a project: locality keyword first, then nearest anchor (if coordinates are known). */
export function zoneFor(locality: string | null | undefined, lat?: number | null, lng?: number | null): string | null {
  const loc = (locality ?? "").toLowerCase();
  if (loc) {
    // Whole-word match: "Ameerpet" must not match the "meerpet" keyword.
    const has = (k: string) => new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(loc);
    for (const z of ZONES) if (z.keywords.some(has)) return z.name;
  }
  if (lat == null || lng == null) return null;
  let best: Zone | null = null;
  let bestKm = Infinity;
  for (const z of ZONES) {
    const d = haversineKm({ lat, lng }, z);
    if (d < bestKm) { bestKm = d; best = z; }
  }
  return best?.name ?? null;
}
