/**
 * Vastu check: commonly followed Vastu Shastra placement guidelines applied
 * to a home's layout. Vastu is a traditional practice, not engineering; this
 * reports how a plan lines up with the guidelines most widely cited for
 * Indian homes, and never claims an effect on health, money or luck.
 *
 * The home is split into nine zones (eight directions + the centre,
 * Brahmasthan). Rooms are placed in zones; the main door is given by the
 * direction it faces.
 *
 * Pure: unit-tested in rules.test.ts.
 */

export type Zone = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW" | "C";
export type Dir8 = Exclude<Zone, "C">;
export type RoomType = "kitchen" | "master_bedroom" | "bedroom" | "pooja" | "living" | "dining" | "toilet" | "staircase" | "balcony";

export const ZONE_NAME: Record<Zone, string> = {
  N: "North", NE: "North-East", E: "East", SE: "South-East", S: "South", SW: "South-West", W: "West", NW: "North-West", C: "centre",
};

export const ROOM_LABEL: Record<RoomType, string> = {
  kitchen: "Kitchen", master_bedroom: "Master bedroom", bedroom: "Bedroom", pooja: "Pooja room", living: "Living room",
  dining: "Dining", toilet: "Toilet / bathroom", staircase: "Staircase", balcony: "Balcony",
};

/** Room types a plan can contain more than one of. */
export const MULTI: RoomType[] = ["bedroom", "toilet", "balcony"];

interface Rule { ideal: Zone[]; ok: Zone[]; attention: Zone[]; why: string }

/** The guideline for each room: where it traditionally belongs, where it's commonly accepted, and what's usually flagged. */
export const RULES: Record<RoomType, Rule> = {
  kitchen: { ideal: ["SE"], ok: ["NW", "E"], attention: ["NE", "SW", "C", "N"], why: "the South-East is the fire (Agni) corner" },
  master_bedroom: { ideal: ["SW"], ok: ["S", "W"], attention: ["NE", "SE", "C"], why: "the South-West is the stable, heaviest corner, meant for the head of the family" },
  bedroom: { ideal: ["W", "S", "NW"], ok: ["E", "N"], attention: ["NE", "C"], why: "the West, South and North-West suit bedrooms" },
  pooja: { ideal: ["NE"], ok: ["E", "N"], attention: ["S", "SW", "SE"], why: "the North-East (Ishanya) corner is the traditional place for prayer" },
  living: { ideal: ["N", "NE", "E"], ok: ["NW", "W"], attention: ["SW"], why: "the North and East are open, light-filled sides suited to gathering" },
  dining: { ideal: ["W", "E"], ok: ["N", "S", "NW"], attention: [], why: "the West and East suit dining" },
  toilet: { ideal: ["NW", "W"], ok: ["S", "SE"], attention: ["NE", "SW", "C"], why: "toilets are kept away from the North-East, the South-West and the centre" },
  staircase: { ideal: ["SW", "S", "W"], ok: ["NW", "SE"], attention: ["NE", "C"], why: "stairs belong in the heavier South and West" },
  balcony: { ideal: ["N", "E", "NE"], ok: ["NW", "W"], attention: ["SW"], why: "open space is preferred to the North and East" },
};

const DOOR: { ideal: Dir8[]; ok: Dir8[]; attention: Dir8[] } = { ideal: ["N", "NE", "E"], ok: ["W", "NW"], attention: ["S", "SW", "SE"] };

export interface Placement { type: RoomType; zone: Zone }

export interface Finding {
  type: RoomType | "entrance";
  label: string;
  zone: Zone | null;
  verdict: "follows" | "acceptable" | "attention" | "neutral";
  text: string;
}

export interface VastuReport {
  entrance: Finding | null;
  findings: Finding[];
  follows: number;
  acceptable: number;
  attention: number;
  summary: string;
}

function entranceFinding(facing: Dir8): Finding {
  const name = ZONE_NAME[facing];
  if (DOOR.ideal.includes(facing)) return { type: "entrance", label: "Main door", zone: facing, verdict: "follows", text: `${name}-facing — among the directions most commonly preferred for a main door.` };
  if (DOOR.ok.includes(facing)) return { type: "entrance", label: "Main door", zone: facing, verdict: "acceptable", text: `${name}-facing — commonly accepted.` };
  return { type: "entrance", label: "Main door", zone: facing, verdict: "attention", text: `${name}-facing — many Vastu guides ask for a closer look at which part of the wall the door sits in. A Vastu consultant can advise.` };
}

function roomFinding(p: Placement, nth: number): Finding {
  const r = RULES[p.type];
  const label = MULTI.includes(p.type) && nth > 1 ? `${ROOM_LABEL[p.type]} ${nth}` : ROOM_LABEL[p.type];
  const where = p.zone === "C" ? "the centre (Brahmasthan)" : `the ${ZONE_NAME[p.zone]}`;
  if (r.ideal.includes(p.zone)) return { type: p.type, label, zone: p.zone, verdict: "follows", text: `In ${where} — the traditional placement: ${r.why}.` };
  if (r.ok.includes(p.zone)) return { type: p.type, label, zone: p.zone, verdict: "acceptable", text: `In ${where} — commonly accepted (traditionally, ${r.why}).` };
  if (r.attention.includes(p.zone)) {
    const extra = p.zone === "C" ? " The centre is traditionally kept open and light." : "";
    return { type: p.type, label, zone: p.zone, verdict: "attention", text: `In ${where} — usually flagged in Vastu guides, because ${r.why}.${extra}` };
  }
  return { type: p.type, label, zone: p.zone, verdict: "neutral", text: `In ${where} — no strong guideline either way.` };
}

export function vastuReport(entranceFacing: Dir8 | null, rooms: Placement[]): VastuReport {
  const seen = new Map<RoomType, number>();
  const findings = rooms.map((p) => {
    const n = (seen.get(p.type) ?? 0) + 1;
    seen.set(p.type, n);
    return roomFinding(p, n);
  });
  const entrance = entranceFacing ? entranceFinding(entranceFacing) : null;
  const all = entrance ? [entrance, ...findings] : findings;
  const follows = all.filter((f) => f.verdict === "follows").length;
  const acceptable = all.filter((f) => f.verdict === "acceptable").length;
  const attention = all.filter((f) => f.verdict === "attention").length;
  const summary = !all.length
    ? "Mark the main door and at least one room to see the report."
    : !findings.length
      ? "Main door noted. Now mark where each room sits to see the full report."
      : attention === 0
      ? "A well-oriented plan: every room you marked follows or fits the common guidelines."
      : `A plan with ${attention} point${attention === 1 ? "" : "s"} worth a second look; ${follows + acceptable} of ${all.length} follow or fit the common guidelines.`;
  return { entrance, findings, follows, acceptable, attention, summary };
}

// ── Reading a drawing: image sides → compass directions ─────────────────────

export type Side = "top" | "right" | "bottom" | "left";
const SIDES: Side[] = ["top", "right", "bottom", "left"];
const CARDINAL: Dir8[] = ["N", "E", "S", "W"];

/** The compass direction each side of the drawing faces, given which side north is on. */
export function sideDirections(northSide: Side): Record<Side, Dir8> {
  const k = SIDES.indexOf(northSide);
  return Object.fromEntries(SIDES.map((s, i) => [s, CARDINAL[(i - k + 4) % 4]])) as Record<Side, Dir8>;
}

/** Zone of a 3×3 cell of the drawing (row 0 = top, col 0 = left). */
export function cellZone(row: number, col: number, northSide: Side): Zone {
  const d = sideDirections(northSide);
  const parts: Dir8[] = [];
  if (row === 0) parts.push(d.top);
  if (row === 2) parts.push(d.bottom);
  if (col === 0) parts.push(d.left);
  if (col === 2) parts.push(d.right);
  if (!parts.length) return "C";
  if (parts.length === 1) return parts[0];
  const ns = parts.find((p) => p === "N" || p === "S")!;
  const ew = parts.find((p) => p === "E" || p === "W")!;
  return `${ns}${ew}` as Zone;
}
