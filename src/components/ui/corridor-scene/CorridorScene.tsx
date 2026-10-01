/**
 * Illustrated landmark scene for a corridor card. Each corridor is drawn
 * around its real anchor — Kokapet's glass skyline, RGIA's control tower,
 * Bhongir's rock fort — in one consistent travel-poster style. New corridors
 * are matched to a scene from keywords in their name / drivers.
 *
 * Pure SVG: instant, no network, and clearly an illustration (labelled).
 */
import React, { useId } from "react";
import {
  Boulders, Campus, Clouds, Crane, ControlTower, Dome, Factory, Fields, Finish, Fort, GlassDefs, Hangar, Highway, Lab,
  Palm, PALETTES, Plane, Ridge, rng, Sky, SolarRows, Tower, Train, Tree, Truck, Viaduct, Villa, Warehouse, Water, H, W,
  type Palette,
} from "./kit";

export type SceneKind =
  | "skyline"
  | "aerospace"
  | "airport"
  | "future-city"
  | "pharma"
  | "highway"
  | "industrial"
  | "villas"
  | "lakeside"
  | "logistics"
  | "rail"
  | "fort";

/** Known corridors → scene + time of day (varied so the grid doesn't repeat). */
const KNOWN: Record<string, { scene: SceneKind; palette: keyof typeof PALETTES }> = {
  "kokapet-neopolis": { scene: "skyline", palette: "dusk" },
  adibatla: { scene: "aerospace", palette: "golden" },
  shadnagar: { scene: "highway", palette: "morning" },
  "tukkuguda-shamshabad": { scene: "airport", palette: "sunset" },
  "sangareddy-industrial": { scene: "industrial", palette: "dawn" },
  "kadthal-fcda": { scene: "future-city", palette: "morning" },
  "ghatkesar-peerzadiguda": { scene: "rail", palette: "dusk" },
  "kompally-bachupally": { scene: "lakeside", palette: "golden" },
  "shankarpally-mokila": { scene: "villas", palette: "dawn" },
  "medchal-dundigal": { scene: "logistics", palette: "sunset" },
  "bibinagar-bhongir": { scene: "fort", palette: "golden" },
  "maheshwaram-pharma-city": { scene: "pharma", palette: "morning" },
};

const KEYWORDS: [RegExp, SceneKind][] = [
  [/\b(airport|rgia|shamshabad|aviation)\b/i, "airport"],
  [/\b(aerospace|aircraft|defence)\b/i, "aerospace"],
  [/\b(future city|fourth city|fcda|smart city|sports hub)\b/i, "future-city"],
  [/\b(pharma|biotech|genome|life sciences)\b/i, "pharma"],
  [/\b(fort|temple|heritage|yadadri|bhongir)\b/i, "fort"],
  [/\b(mmts|railway|rail|metro)\b/i, "rail"],
  [/\b(logistics|warehous|dry port|freight)\b/i, "logistics"],
  [/\b(industrial|manufactur|tsiic|tgiic|factory)\b/i, "industrial"],
  [/\b(lake|reservoir|waterfront)\b/i, "lakeside"],
  [/\b(villa|farmhouse|gated|green)\b/i, "villas"],
  [/\b(it |sez|financial district|neopolis|hitec|tech)\b/i, "skyline"],
  [/\b(nh-?\d+|highway|expressway|rrr|ring road)\b/i, "highway"],
];

export function resolveScene(slug: string, text: string): { scene: SceneKind; palette: Palette; paletteName: string } {
  const known = KNOWN[slug];
  if (known) return { scene: known.scene, palette: PALETTES[known.palette], paletteName: known.palette };
  const scene = KEYWORDS.find(([re]) => re.test(text))?.[1] ?? "highway";
  const names = Object.keys(PALETTES);
  const paletteName = names[Math.abs([...slug].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)) % names.length];
  return { scene, palette: PALETTES[paletteName], paletteName };
}

// ── Scenes ───────────────────────────────────────────────────────────────────

type SceneProps = { id: string; p: Palette; r: () => number };

function Skyline({ id, p, r }: SceneProps) {
  const base = 270;
  // Back row: lighter, hazier towers for depth.
  const back = [[20, 30, 130], [70, 26, 160], [150, 30, 185], [230, 28, 150], [300, 26, 205], [370, 30, 175], [470, 28, 190], [560, 30, 150]] as const;
  // Front row: fewer, taller, with gaps — the Financial District / Neopolis silhouette.
  const front = [[46, 38, 150], [118, 34, 215], [190, 42, 175], [262, 32, 255], [330, 46, 205], [420, 36, 240], [500, 40, 170], [590, 34, 120]] as const;
  return (
    <>
      <Sky id={id} p={p} sunX={520} sunY={116} rand={r} />
      <Ridge y={250} amp={10} color={p.far} rand={r} opacity={0.8} />
      <Boulders baseY={252} color={p.far} rand={r} count={2} />
      <GlassDefs id={id} p={p} />
      <g opacity={0.45}>
        {back.map(([x, w, h], i) => (
          <rect key={`b${i}`} x={x} y={base - h} width={w} height={h} fill={p.far} />
        ))}
      </g>
      {front.map(([x, w, h], i) => (
        <Tower key={i} id={id} x={x} baseY={base} w={w} h={h} p={p} rand={r} spire={i === 3 || i === 5} />
      ))}
      <Crane x={372} baseY={base - 150} h={46} color={p.near} />
      <Water id={id} y={base} p={p} />
      {front.map(([x, w, h], i) => (
        <rect key={`r${i}`} x={x} y={base + 1} width={w} height={h * 0.4} fill={p.glass[0]} opacity={0.14} />
      ))}
    </>
  );
}

function Aerospace({ id, p, r }: SceneProps) {
  return (
    <>
      <Sky id={id} p={p} sunX={150} sunY={150} rand={r} />
      <Clouds p={p} rand={r} y={60} />
      <Ridge y={240} amp={14} color={p.far} rand={r} />
      <Boulders baseY={245} color={p.mid} rand={r} count={2} />
      <Plane x={420} y={96} s={1.9} angle={-16} color={p.near} />
      <Hangar x={60} baseY={290} w={170} color={p.near} lights={p.lights} />
      <Hangar x={250} baseY={290} w={120} color={p.near} lights={p.lights} />
      <Campus x={400} baseY={290} w={90} h={70} p={p} rand={r} />
      <Campus x={500} baseY={290} w={110} h={96} p={p} rand={r} />
      <rect x={0} y={290} width={W} height={H - 290} fill={p.ground} />
      <rect x={0} y={318} width={W} height={10} fill={p.near} />
      {Array.from({ length: 16 }, (_, i) => (
        <rect key={i} x={10 + i * 40} y={322} width={18} height={2} fill={p.lights} opacity={0.8} />
      ))}
    </>
  );
}

function Airport({ id, p, r }: SceneProps) {
  return (
    <>
      <Sky id={id} p={p} sunX={120} sunY={200} rand={r} />
      <Clouds p={p} rand={r} y={80} />
      <Ridge y={250} amp={10} color={p.far} rand={r} />
      <Plane x={330} y={120} s={2.2} angle={8} color={p.near} />
      <ControlTower x={470} baseY={280} color={p.near} lights={p.lights} />
      <path d={`M40,280 L40,256 Q140,232 260,250 L260,280 Z`} fill={p.near} />
      {Array.from({ length: 14 }, (_, i) => (
        <rect key={i} x={50 + i * 14} y={262} width={8} height={10} fill={p.lights} opacity={0.5} />
      ))}
      <rect x={0} y={280} width={W} height={H - 280} fill={p.ground} />
      <path d={`M${W / 2 - 40},280 L${W / 2 + 40},280 L${W},${H} L0,${H} Z`} fill={p.near} opacity={0.9} />
      {Array.from({ length: 8 }, (_, i) => {
        const t = (i + 1) / 9;
        const y = 280 + (H - 280) * t * t;
        const half = 40 + (W / 2 - 40) * t * t;
        return (
          <g key={i}>
            <circle cx={W / 2 - half} cy={y} r={1.2 + t * 2} fill={p.lights} />
            <circle cx={W / 2 + half} cy={y} r={1.2 + t * 2} fill={p.lights} />
            <rect x={W / 2 - 1 - t * 2} y={y} width={2 + t * 4} height={4 + t * 6} fill="#fff" opacity={0.7} />
          </g>
        );
      })}
    </>
  );
}

function FutureCity({ id, p, r }: SceneProps) {
  return (
    <>
      <Sky id={id} p={p} sunX={320} sunY={170} rand={r} />
      <Ridge y={236} amp={12} color={p.far} rand={r} />
      <Boulders baseY={240} color={p.far} rand={r} count={3} />
      <GlassDefs id={id} p={p} />
      <Dome x={70} baseY={262} w={150} p={p} />
      {[[250, 30, 180], [290, 26, 230], [322, 34, 200], [364, 24, 250], [396, 32, 170], [440, 28, 140]].map(([x, w, h], i) => (
        <g key={i}>
          <Tower id={id} x={x} baseY={262} w={w} h={h} p={p} rand={r} spire={i === 3} />
          <path d={`M${x},${262 - h} q${w / 2},-14 ${w},0`} fill={p.glass[0]} opacity={0.6} />
        </g>
      ))}
      <path d="M470,262 C520,200 560,200 600,262" stroke={p.lights} strokeWidth={2} fill="none" opacity={0.5} />
      <rect x={0} y={262} width={W} height={H - 262} fill={p.ground} />
      <SolarRows y={286} p={p} rows={3} />
    </>
  );
}

function Pharma({ id, p, r }: SceneProps) {
  return (
    <>
      <Sky id={id} p={p} sunX={520} sunY={90} rand={r} />
      <Clouds p={p} rand={r} y={50} />
      <Ridge y={230} amp={16} color={p.far} rand={r} />
      <Boulders baseY={236} color={p.mid} rand={r} count={3} />
      <Ridge y={262} amp={6} color={p.mid} rand={r} />
      <Lab x={90} baseY={288} w={170} h={82} p={p} rand={r} />
      <Lab x={290} baseY={288} w={130} h={110} p={p} rand={r} />
      <Campus x={450} baseY={288} w={120} h={60} p={p} rand={r} />
      {[70, 272, 432, 590].map((x) => <Tree key={x} x={x} baseY={292} r={10} color={p.near} />)}
      <rect x={0} y={288} width={W} height={H - 288} fill={p.ground} />
      <path d={`M0,${H} Q${W / 2},300 ${W},${H}`} fill={p.near} opacity={0.35} />
    </>
  );
}

function HighwayScene({ id, p, r }: SceneProps) {
  return (
    <>
      <Sky id={id} p={p} sunX={320} sunY={196} rand={r} />
      <Clouds p={p} rand={r} y={70} />
      <Ridge y={214} amp={10} color={p.far} rand={r} />
      <Boulders baseY={218} color={p.far} rand={r} count={3} />
      <Fields p={p} horizonY={216} />
      <Factory x={40} baseY={222} w={90} p={p} />
      <Warehouse x={500} baseY={222} w={100} h={16} p={p} />
      <Highway id={id} p={p} horizonY={216} />
      <Truck x={352} y={262} s={0.9} p={p} />
      <Truck x={240} y={300} s={1.3} p={p} />
      <g fill={p.near}>
        <rect x={98} y={150} width={3} height={70} />
        <rect x={540} y={150} width={3} height={70} />
      </g>
    </>
  );
}

function Industrial({ id, p, r }: SceneProps) {
  return (
    <>
      <Sky id={id} p={p} sunX={440} sunY={150} rand={r} />
      <Ridge y={230} amp={12} color={p.far} rand={r} />
      <Boulders baseY={234} color={p.far} rand={r} count={2} />
      <Factory x={40} baseY={284} w={180} p={p} />
      <Factory x={250} baseY={284} w={130} p={p} />
      <Warehouse x={410} baseY={284} w={200} h={34} p={p} />
      <rect x={0} y={284} width={W} height={H - 284} fill={p.ground} />
      <rect x={0} y={306} width={W} height={24} fill={p.near} />
      {Array.from({ length: 12 }, (_, i) => (
        <rect key={i} x={i * 56} y={317} width={26} height={2} fill={p.lights} opacity={0.7} />
      ))}
      <Truck x={120} y={312} s={1.1} p={p} />
      <Truck x={420} y={326} s={1.2} p={p} />
    </>
  );
}

function Villas({ id, p, r }: SceneProps) {
  return (
    <>
      <Sky id={id} p={p} sunX={120} sunY={96} rand={r} />
      <Clouds p={p} rand={r} y={50} />
      <Ridge y={222} amp={18} color={p.far} rand={r} />
      <Boulders baseY={226} color={p.mid} rand={r} count={3} />
      <Ridge y={258} amp={8} color={p.mid} rand={r} opacity={0.8} />
      {[50, 205, 360, 505].map((x, i) => (
        <Villa key={x} x={x} baseY={298 - (i % 2) * 8} s={1.55 + (i % 2) * 0.15} p={p} />
      ))}
      {[30, 180, 335, 480, 615].map((x, i) => <Palm key={x} x={x} baseY={302} h={78 + (i % 3) * 14} color={p.near} />)}
      <rect x={0} y={296} width={W} height={H - 296} fill={p.ground} />
      <rect x={0} y={296} width={W} height={4} fill={p.near} />
      {[100, 230, 350, 470, 590].map((x) => <Tree key={x} x={x} baseY={332} r={9} color={p.near} />)}
    </>
  );
}

function Lakeside({ id, p, r }: SceneProps) {
  const base = 250;
  return (
    <>
      <Sky id={id} p={p} sunX={420} sunY={150} rand={r} />
      <Ridge y={228} amp={10} color={p.far} rand={r} />
      <Boulders baseY={232} color={p.far} rand={r} count={2} />
      <GlassDefs id={id} p={p} />
      {[[60, 40, 110], [110, 36, 140], [156, 42, 120], [300, 38, 150], [346, 44, 128], [520, 40, 118], [566, 36, 96]].map(([x, w, h], i) => (
        <Tower key={i} id={id} x={x} baseY={base} w={w} h={h} p={p} rand={r} glass={false} />
      ))}
      {[220, 250, 450, 480].map((x) => <Tree key={x} x={x} baseY={base} r={12} color={p.near} />)}
      <Water id={id} y={base} p={p} />
      {[[60, 40, 110], [110, 36, 140], [156, 42, 120], [300, 38, 150], [346, 44, 128], [520, 40, 118], [566, 36, 96]].map(([x, w, h], i) => (
        <rect key={`rf${i}`} x={x} y={base + 2} width={w} height={h * 0.45} fill={p.near} opacity={0.25} />
      ))}
    </>
  );
}

function Logistics({ id, p, r }: SceneProps) {
  return (
    <>
      <Sky id={id} p={p} sunX={120} sunY={160} rand={r} />
      <Ridge y={232} amp={10} color={p.far} rand={r} />
      <Boulders baseY={236} color={p.far} rand={r} count={2} />
      <Warehouse x={30} baseY={276} w={200} h={40} p={p} />
      <Warehouse x={250} baseY={276} w={160} h={34} p={p} />
      <Warehouse x={430} baseY={276} w={190} h={44} p={p} />
      <rect x={0} y={276} width={W} height={H - 276} fill={p.ground} />
      {Array.from({ length: 6 }, (_, i) => (
        <rect key={i} x={40 + i * 100} y={296} width={70} height={18} fill={i % 2 ? p.mid : p.near} />
      ))}
      <rect x={0} y={318} width={W} height={3} fill={p.near} />
      <Train x={60} y={336} cars={7} p={p} />
    </>
  );
}

function Rail({ id, p, r }: SceneProps) {
  return (
    <>
      <Sky id={id} p={p} sunX={500} sunY={170} rand={r} />
      <Ridge y={236} amp={10} color={p.far} rand={r} />
      <GlassDefs id={id} p={p} />
      {[[30, 44, 110], [84, 40, 140], [134, 46, 100], [430, 40, 130], [480, 46, 160], [536, 42, 120], [588, 40, 100]].map(([x, w, h], i) => (
        <Tower key={i} id={id} x={x} baseY={250} w={w} h={h} p={p} rand={r} glass={false} />
      ))}
      <Viaduct y={250} p={p} />
      <Train x={170} y={250} cars={4} p={p} />
      <rect x={0} y={300} width={W} height={H - 300} fill={p.ground} />
      {[60, 180, 330, 470, 600].map((x) => <Tree key={x} x={x} baseY={330} r={11} color={p.near} />)}
    </>
  );
}

function FortScene({ id, p, r }: SceneProps) {
  return (
    <>
      <Sky id={id} p={p} sunX={500} sunY={120} rand={r} />
      <Clouds p={p} rand={r} y={60} />
      <Ridge y={250} amp={10} color={p.far} rand={r} />
      <Boulders baseY={254} color={p.far} rand={r} count={3} />
      <Fort x={300} baseY={290} p={p} />
      <Fields p={p} horizonY={288} />
      {[60, 110, 520, 580].map((x) => <Palm key={x} x={x} baseY={300} h={56} color={p.near} />)}
    </>
  );
}

const SCENES: Record<SceneKind, (props: SceneProps) => React.ReactElement> = {
  skyline: Skyline,
  aerospace: Aerospace,
  airport: Airport,
  "future-city": FutureCity,
  pharma: Pharma,
  highway: HighwayScene,
  industrial: Industrial,
  villas: Villas,
  lakeside: Lakeside,
  logistics: Logistics,
  rail: Rail,
  fort: FortScene,
};

export const SCENE_ALT: Record<SceneKind, string> = {
  skyline: "glass office towers and a construction crane",
  aerospace: "an aircraft climbing over aerospace hangars and an IT campus",
  airport: "an airport control tower and a plane on approach",
  "future-city": "futuristic towers, a stadium dome and solar fields",
  pharma: "a modern pharma and research campus",
  highway: "a national highway with trucks running through farmland",
  industrial: "an industrial park beside a highway",
  villas: "gated villas among palms and greenery",
  lakeside: "apartments beside a lake",
  logistics: "logistics warehouses and a freight train",
  rail: "a suburban train on an elevated track past apartments",
  fort: "Bhongir Fort on its monolithic rock above farmland",
};

export default function CorridorScene({ slug, name, hints = "" }: { slug: string; name: string; hints?: string }) {
  const rawId = useId();
  // Slug + React id: unique even across separately rendered trees (gradient ids are global in a page).
  const id = `cs-${slug.replace(/[^a-zA-Z0-9]/g, "")}-${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const { scene, palette } = resolveScene(slug, `${name} ${hints}`);
  const Scene = SCENES[scene];
  const r = rng(slug);
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      width="100%"
      height="100%"
      role="img"
      aria-label={`Illustration of ${name}: ${SCENE_ALT[scene]}`}
      style={{ position: "absolute", inset: 0, display: "block" }}
    >
      <Scene id={id} p={palette} r={r} />
      <Finish id={id} />
    </svg>
  );
}
