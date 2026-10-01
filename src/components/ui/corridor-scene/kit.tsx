/**
 * Illustration kit for corridor scenes — flat "travel poster" style on a
 * 640×360 canvas. Every primitive is deterministic (seeded) so a corridor
 * always renders the same picture.
 */
import React from "react";

export const W = 640;
export const H = 360;

export interface Palette {
  sky: [string, string, string]; // top → horizon
  sun: string;
  far: string; // distant hills (lightest)
  mid: string;
  near: string; // silhouettes
  ground: string;
  lights: string; // lit windows / lamps
  glass: [string, string]; // tower glass gradient
  stars?: boolean;
}

export const PALETTES: Record<string, Palette> = {
  golden: {
    sky: ["#E8894A", "#F6B866", "#FFE3A6"],
    sun: "#FFF4D6",
    far: "#D69A6A",
    mid: "#A86E4A",
    near: "#4A2E24",
    ground: "#3A241C",
    lights: "#FFE9A8",
    glass: ["#FFD08A", "#6B3E2A"],
  },
  sunset: {
    sky: ["#3D1F4A", "#C2466B", "#F7A65A"],
    sun: "#FFD08A",
    far: "#A4506F",
    mid: "#6B2E55",
    near: "#2E1530",
    ground: "#221026",
    lights: "#FFD27A",
    glass: ["#F79A6A", "#4A1F45"],
  },
  dusk: {
    sky: ["#0B1433", "#33447F", "#E58A6A"],
    sun: "#FFB38A",
    far: "#4B5688",
    mid: "#2E3663",
    near: "#161B38",
    ground: "#10142B",
    lights: "#FFCF6B",
    glass: ["#6F7FC4", "#1C2250"],
    stars: true,
  },
  morning: {
    sky: ["#5AA8DE", "#A9D8EE", "#FFEBC4"],
    sun: "#FFF6D8",
    far: "#A7CBC9",
    mid: "#6E9E9A",
    near: "#2F5559",
    ground: "#35604A",
    lights: "#FFE08A",
    glass: ["#CDEBF5", "#3E6F7E"],
  },
  dawn: {
    sky: ["#16404F", "#5E9E9A", "#F5C89A"],
    sun: "#FFEBD0",
    far: "#6E9F9C",
    mid: "#3F7078",
    near: "#16323C",
    ground: "#122A32",
    lights: "#FFD9A0",
    glass: ["#A8D8D2", "#1E4450"],
  },
};

/** Mulberry32 — tiny seeded PRNG. */
export function rng(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Atmosphere ───────────────────────────────────────────────────────────────

export function Sky({ id, p, sunX, sunY, rand }: { id: string; p: Palette; sunX: number; sunY: number; rand: () => number }) {
  const stars = p.stars ? Array.from({ length: 40 }, () => [rand() * W, rand() * H * 0.45, rand() * 1.1 + 0.3] as const) : [];
  return (
    <>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.sky[0]} />
          <stop offset="0.62" stopColor={p.sky[1]} />
          <stop offset="1" stopColor={p.sky[2]} />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx={sunX / W} cy={sunY / H} r="0.55" gradientUnits="objectBoundingBox">
          <stop offset="0" stopColor={p.sun} stopOpacity="0.75" />
          <stop offset="0.25" stopColor={p.sun} stopOpacity="0.25" />
          <stop offset="1" stopColor={p.sun} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${id}-sky)`} />
      {stars.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="#fff" opacity={0.35 + (i % 5) * 0.1} />
      ))}
      <rect width={W} height={H} fill={`url(#${id}-glow)`} />
      <circle cx={sunX} cy={sunY} r={26} fill={p.sun} />
    </>
  );
}

export function Clouds({ p, rand, y = 70 }: { p: Palette; rand: () => number; y?: number }) {
  return (
    <g opacity={0.35} fill={p.sun}>
      {Array.from({ length: 3 }, (_, i) => {
        const x = 60 + rand() * 520;
        const yy = y + rand() * 50;
        const w = 60 + rand() * 70;
        return <rect key={i} x={x} y={yy} width={w} height={5} rx={2.5} />;
      })}
    </g>
  );
}

/** Smooth rolling ridge from `y` down to the bottom. */
export function Ridge({ y, amp, color, rand, freq = 3, opacity = 1 }: { y: number; amp: number; color: string; rand: () => number; freq?: number; opacity?: number }) {
  const phase = rand() * Math.PI * 2;
  const pts: string[] = [];
  for (let x = 0; x <= W; x += 16) {
    const yy = y - amp * (0.55 * Math.sin((x / W) * Math.PI * freq + phase) + 0.45 * Math.sin((x / W) * Math.PI * freq * 2.3 + phase * 1.7));
    pts.push(`${x},${yy.toFixed(1)}`);
  }
  return <path d={`M0,${H} L${pts.join(" L")} L${W},${H} Z`} fill={color} opacity={opacity} />;
}

/** Deccan granite boulder clusters — the Hyderabad signature on the horizon. */
export function Boulders({ baseY, color, rand, count = 3 }: { baseY: number; color: string; rand: () => number; count?: number }) {
  return (
    <g fill={color}>
      {Array.from({ length: count }, (_, c) => {
        const cx = 40 + rand() * 560;
        return (
          <g key={c}>
            <ellipse cx={cx} cy={baseY - 8} rx={22 + rand() * 10} ry={12} />
            <ellipse cx={cx + 16} cy={baseY - 18} rx={14} ry={11} />
            <ellipse cx={cx - 10} cy={baseY - 24} rx={11} ry={10} />
            <ellipse cx={cx + 4} cy={baseY - 34} rx={8} ry={7} />
          </g>
        );
      })}
    </g>
  );
}

// ── Built forms ──────────────────────────────────────────────────────────────

function Windows({ x, y, w, h, color, rand, density = 0.45, cell = 7 }: { x: number; y: number; w: number; h: number; color: string; rand: () => number; density?: number; cell?: number }) {
  const out: React.ReactNode[] = [];
  for (let yy = y + 6; yy < y + h - 4; yy += cell) {
    for (let xx = x + 4; xx < x + w - 4; xx += cell - 1) {
      if (rand() < density) out.push(<rect key={`${xx}-${yy}`} x={xx} y={yy} width={2.6} height={3.2} fill={color} opacity={0.55 + rand() * 0.45} />);
    }
  }
  return <>{out}</>;
}

export function Tower({ id, x, baseY, w, h, p, rand, glass = true, spire = false }: { id: string; x: number; baseY: number; w: number; h: number; p: Palette; rand: () => number; glass?: boolean; spire?: boolean }) {
  const gid = `${id}-glass`;
  return (
    <g>
      <rect x={x} y={baseY - h} width={w} height={h} fill={glass ? `url(#${gid})` : p.near} />
      <rect x={x} y={baseY - h} width={w * 0.18} height={h} fill="#000" opacity={0.18} />
      <Windows x={x} y={baseY - h} w={w} h={h} color={p.lights} rand={rand} density={glass ? 0.28 : 0.45} />
      {spire && <rect x={x + w / 2 - 1} y={baseY - h - 18} width={2} height={18} fill={p.near} />}
      {spire && <circle cx={x + w / 2} cy={baseY - h - 18} r={1.8} fill="#FF6B6B" />}
    </g>
  );
}

export function GlassDefs({ id, p }: { id: string; p: Palette }) {
  return (
    <defs>
      <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={p.glass[0]} stopOpacity="0.95" />
        <stop offset="1" stopColor={p.glass[1]} />
      </linearGradient>
      <linearGradient id={`${id}-fade`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#000" stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity="0.45" />
      </linearGradient>
    </defs>
  );
}

export function Crane({ x, baseY, h, color }: { x: number; baseY: number; h: number; color: string }) {
  return (
    <g stroke={color} strokeWidth={2} fill="none">
      <line x1={x} y1={baseY} x2={x} y2={baseY - h} />
      <line x1={x - 18} y1={baseY - h} x2={x + 58} y2={baseY - h} />
      <line x1={x} y1={baseY - h - 10} x2={x + 58} y2={baseY - h} strokeWidth={1} />
      <line x1={x} y1={baseY - h - 10} x2={x - 18} y2={baseY - h} strokeWidth={1} />
      <line x1={x + 44} y1={baseY - h} x2={x + 44} y2={baseY - h + 22} strokeWidth={1} />
      <rect x={x - 18} y={baseY - h} width={8} height={6} fill={color} />
    </g>
  );
}

export function Plane({ x, y, s = 1, angle = -12, color }: { x: number; y: number; s?: number; angle?: number; color: string }) {
  return (
    <g transform={`translate(${x},${y}) rotate(${angle}) scale(${s})`} fill={color}>
      <path d="M-34,0 C-30,-3 20,-4 30,-2 C36,-1 38,1 30,2 C20,4 -30,3 -34,0 Z" />
      <path d="M-4,-1 L-18,-20 L-10,-20 L10,-1 Z" />
      <path d="M-4,1 L-14,14 L-8,14 L8,1 Z" />
      <path d="M-30,-1 L-36,-11 L-31,-11 L-24,-1 Z" />
    </g>
  );
}

export function ControlTower({ x, baseY, color, lights }: { x: number; baseY: number; color: string; lights: string }) {
  return (
    <g>
      <path d={`M${x - 7},${baseY} L${x - 4},${baseY - 92} L${x + 4},${baseY - 92} L${x + 7},${baseY} Z`} fill={color} />
      <path d={`M${x - 20},${baseY - 92} L${x + 20},${baseY - 92} L${x + 15},${baseY - 112} L${x - 15},${baseY - 112} Z`} fill={color} />
      <rect x={x - 16} y={baseY - 108} width={32} height={9} fill={lights} opacity={0.85} />
      <rect x={x - 12} y={baseY - 120} width={24} height={8} fill={color} />
      <line x1={x} y1={baseY - 120} x2={x} y2={baseY - 134} stroke={color} strokeWidth={2} />
      <circle cx={x} cy={baseY - 135} r={2.2} fill="#FF6B6B" />
    </g>
  );
}

export function Hangar({ x, baseY, w, color, lights }: { x: number; baseY: number; w: number; color: string; lights: string }) {
  return (
    <g>
      <path d={`M${x},${baseY} L${x},${baseY - 26} Q${x + w / 2},${baseY - 58} ${x + w},${baseY - 26} L${x + w},${baseY} Z`} fill={color} />
      <rect x={x + w * 0.2} y={baseY - 22} width={w * 0.6} height={22} fill={lights} opacity={0.22} />
      {Array.from({ length: 5 }, (_, i) => (
        <line key={i} x1={x + w * 0.2 + (i * w * 0.6) / 4} y1={baseY - 22} x2={x + w * 0.2 + (i * w * 0.6) / 4} y2={baseY} stroke={color} strokeWidth={1.5} />
      ))}
    </g>
  );
}

export function Campus({ x, baseY, w, h, p, rand }: { x: number; baseY: number; w: number; h: number; p: Palette; rand: () => number }) {
  return (
    <g>
      <rect x={x} y={baseY - h} width={w} height={h} fill={p.near} />
      {Array.from({ length: Math.floor(h / 9) }, (_, r) => (
        <rect key={r} x={x + 4} y={baseY - h + 6 + r * 9} width={w - 8} height={3} fill={p.lights} opacity={0.25 + rand() * 0.5} />
      ))}
    </g>
  );
}

export function Factory({ x, baseY, w, p }: { x: number; baseY: number; w: number; p: Palette }) {
  const teeth = Math.max(3, Math.round(w / 22));
  const tw = w / teeth;
  let d = `M${x},${baseY} L${x},${baseY - 30}`;
  for (let i = 0; i < teeth; i++) d += ` L${x + i * tw + tw},${baseY - 46} L${x + i * tw + tw},${baseY - 30}`;
  d += ` L${x + w},${baseY} Z`;
  return (
    <g>
      <rect x={x + w * 0.72} y={baseY - 86} width={9} height={60} fill={p.near} />
      <ellipse cx={x + w * 0.72 + 6} cy={baseY - 96} rx={12} ry={6} fill={p.far} opacity={0.5} />
      <ellipse cx={x + w * 0.72 + 18} cy={baseY - 108} rx={16} ry={7} fill={p.far} opacity={0.3} />
      <path d={d} fill={p.near} />
      {Array.from({ length: teeth }, (_, i) => (
        <rect key={i} x={x + i * tw + tw - 6} y={baseY - 42} width={4} height={10} fill={p.lights} opacity={0.6} />
      ))}
    </g>
  );
}

export function Warehouse({ x, baseY, w, h, p }: { x: number; baseY: number; w: number; h: number; p: Palette }) {
  return (
    <g>
      <path d={`M${x},${baseY} L${x},${baseY - h} L${x + w / 2},${baseY - h - 10} L${x + w},${baseY - h} L${x + w},${baseY} Z`} fill={p.near} />
      {Array.from({ length: Math.max(2, Math.floor(w / 26)) }, (_, i) => (
        <rect key={i} x={x + 8 + i * 26} y={baseY - 16} width={16} height={16} fill={p.lights} opacity={0.35} />
      ))}
    </g>
  );
}

export function Villa({ x, baseY, s = 1, p }: { x: number; baseY: number; s?: number; p: Palette }) {
  return (
    <g transform={`translate(${x},${baseY}) scale(${s})`}>
      <rect x={0} y={-30} width={46} height={30} fill={p.near} />
      <rect x={30} y={-46} width={30} height={46} fill={p.near} />
      <path d="M-4,-30 L23,-46 L50,-30 Z" fill={p.near} />
      <rect x={-2} y={-32} width={50} height={3} fill={p.lights} opacity={0.2} />
      <rect x={6} y={-22} width={10} height={12} fill={p.lights} opacity={0.85} />
      <rect x={22} y={-22} width={6} height={12} fill={p.lights} opacity={0.6} />
      <rect x={36} y={-40} width={18} height={10} fill={p.lights} opacity={0.75} />
      <rect x={36} y={-22} width={18} height={14} fill={p.lights} opacity={0.5} />
    </g>
  );
}

export function Palm({ x, baseY, h, color }: { x: number; baseY: number; h: number; color: string }) {
  const top = baseY - h;
  return (
    <g fill={color} stroke={color}>
      <path d={`M${x},${baseY} Q${x + 6},${baseY - h / 2} ${x + 3},${top}`} fill="none" strokeWidth={3} />
      {[-150, -110, -60, -20, 20].map((a) => (
        <path key={a} d={`M${x + 3},${top} q${Math.cos((a * Math.PI) / 180) * 12},${Math.sin((a * Math.PI) / 180) * 6 - 6} ${Math.cos((a * Math.PI) / 180) * 24},${Math.sin((a * Math.PI) / 180) * 12 + 4}`} fill="none" strokeWidth={3} strokeLinecap="round" />
      ))}
    </g>
  );
}

export function Tree({ x, baseY, r, color }: { x: number; baseY: number; r: number; color: string }) {
  return (
    <g fill={color}>
      <rect x={x - 1.5} y={baseY - r} width={3} height={r} />
      <circle cx={x} cy={baseY - r - r * 0.6} r={r} />
      <circle cx={x - r * 0.6} cy={baseY - r - r * 0.2} r={r * 0.7} />
      <circle cx={x + r * 0.6} cy={baseY - r - r * 0.2} r={r * 0.7} />
    </g>
  );
}

export function Train({ x, y, cars, p }: { x: number; y: number; cars: number; p: Palette }) {
  return (
    <g>
      {Array.from({ length: cars }, (_, i) => (
        <g key={i}>
          <rect x={x + i * 58} y={y - 16} width={54} height={16} rx={i === 0 ? 6 : 2} fill={p.near} />
          {Array.from({ length: 6 }, (_, w) => (
            <rect key={w} x={x + i * 58 + 5 + w * 8} y={y - 12} width={5} height={5} fill={p.lights} opacity={0.9} />
          ))}
        </g>
      ))}
      <rect x={x - 20} y={y} width={cars * 58 + 60} height={3} fill={p.near} />
    </g>
  );
}

export function Viaduct({ y, p }: { y: number; p: Palette }) {
  return (
    <g fill={p.near}>
      <rect x={0} y={y} width={W} height={6} />
      {Array.from({ length: 9 }, (_, i) => (
        <rect key={i} x={20 + i * 76} y={y + 6} width={8} height={H - y} />
      ))}
    </g>
  );
}

export function Truck({ x, y, s = 1, p }: { x: number; y: number; s?: number; p: Palette }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <rect x={0} y={-16} width={34} height={16} fill={p.near} />
      <path d="M34,-12 L44,-12 L48,-5 L48,0 L34,0 Z" fill={p.near} />
      <rect x={37} y={-10} width={6} height={4} fill={p.lights} opacity={0.8} />
      <circle cx={48} cy={-3} r={1.6} fill={p.lights} />
    </g>
  );
}

/** Perspective highway with lane dashes and light trails. */
export function Highway({ id, p, horizonY, vx = W / 2 }: { id: string; p: Palette; horizonY: number; vx?: number }) {
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-road`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.near} />
          <stop offset="1" stopColor="#0b0b12" />
        </linearGradient>
      </defs>
      <path d={`M${vx - 6},${horizonY} L${vx + 6},${horizonY} L${W * 0.86},${H} L${W * 0.14},${H} Z`} fill={`url(#${id}-road)`} />
      {Array.from({ length: 7 }, (_, i) => {
        const t0 = (i / 7) ** 1.8;
        const t1 = ((i + 0.45) / 7) ** 1.8;
        const y0 = horizonY + (H - horizonY) * t0;
        const y1 = horizonY + (H - horizonY) * t1;
        return <path key={i} d={`M${vx - 0.6 - t0 * 3},${y0} L${vx + 0.6 + t0 * 3},${y0} L${vx + 0.6 + t1 * 3},${y1} L${vx - 0.6 - t1 * 3},${y1} Z`} fill={p.lights} opacity={0.75} />;
      })}
      <path d={`M${vx - 3},${horizonY} Q${W * 0.3},${horizonY + 60} ${W * 0.2},${H}`} stroke="#FF5A5A" strokeWidth={2} fill="none" opacity={0.75} />
      <path d={`M${vx + 3},${horizonY} Q${W * 0.7},${horizonY + 60} ${W * 0.8},${H}`} stroke={p.lights} strokeWidth={2.4} fill="none" opacity={0.8} />
    </g>
  );
}

/** Perspective farmland / plotted-layout rows — the land-first motif. */
export function Fields({ p, horizonY, color }: { p: Palette; horizonY: number; color?: string }) {
  const c = color ?? p.ground;
  return (
    <g>
      <rect x={0} y={horizonY} width={W} height={H - horizonY} fill={c} />
      {Array.from({ length: 13 }, (_, i) => {
        const x = -W * 0.6 + (i * W * 2.2) / 12;
        return <line key={i} x1={W / 2} y1={horizonY} x2={x} y2={H} stroke={p.far} strokeWidth={1} opacity={0.35} />;
      })}
      {Array.from({ length: 6 }, (_, i) => {
        const y = horizonY + (H - horizonY) * ((i + 1) / 6) ** 1.7;
        return <line key={i} x1={0} y1={y} x2={W} y2={y} stroke={p.far} strokeWidth={1} opacity={0.28} />;
      })}
    </g>
  );
}

export function Water({ id, y, p }: { id: string; y: number; p: Palette }) {
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-water`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.sky[2]} stopOpacity="0.85" />
          <stop offset="1" stopColor={p.sky[0]} />
        </linearGradient>
      </defs>
      <rect x={0} y={y} width={W} height={H - y} fill={`url(#${id}-water)`} />
      {Array.from({ length: 10 }, (_, i) => (
        <rect key={i} x={80 + ((i * 97) % 480)} y={y + 10 + i * 9} width={40 + ((i * 37) % 60)} height={1.6} fill={p.sun} opacity={0.35} />
      ))}
    </g>
  );
}

export function Dome({ x, baseY, w, p }: { x: number; baseY: number; w: number; p: Palette }) {
  return (
    <g>
      <path d={`M${x},${baseY} Q${x + w / 2},${baseY - w * 0.55} ${x + w},${baseY} Z`} fill={p.near} />
      {[0.25, 0.5, 0.75].map((t) => (
        <path key={t} d={`M${x + w * t},${baseY} Q${x + w / 2},${baseY - w * 0.5} ${x + w * (1 - t) + 0.01},${baseY}`} stroke={p.lights} strokeWidth={1} fill="none" opacity={0.45} />
      ))}
      <ellipse cx={x + w / 2} cy={baseY - 2} rx={w / 2} ry={4} fill={p.lights} opacity={0.35} />
    </g>
  );
}

export function SolarRows({ y, p, rows = 3 }: { y: number; p: Palette; rows?: number }) {
  return (
    <g>
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: 10 }, (_, i) => (
          <path key={`${r}-${i}`} d={`M${30 + i * 62 - r * 8},${y + r * 18} l40,0 l-6,12 l-40,0 Z`} fill={p.glass[1]} stroke={p.glass[0]} strokeWidth={0.8} opacity={0.9} />
        )),
      )}
    </g>
  );
}

export function Fort({ x, baseY, p }: { x: number; baseY: number; p: Palette }) {
  // Bhongir: a single monolithic egg-shaped rock with the fort crowning it.
  return (
    <g>
      <path d={`M${x - 120},${baseY} C${x - 110},${baseY - 110} ${x - 40},${baseY - 150} ${x + 10},${baseY - 148} C${x + 70},${baseY - 146} ${x + 118},${baseY - 90} ${x + 130},${baseY} Z`} fill={p.mid} />
      <path d={`M${x - 60},${baseY - 110} C${x - 30},${baseY - 140} ${x + 30},${baseY - 144} ${x + 60},${baseY - 118}`} stroke={p.far} strokeWidth={3} fill="none" opacity={0.5} />
      <g fill={p.near}>
        <rect x={x - 38} y={baseY - 168} width={80} height={22} />
        {Array.from({ length: 8 }, (_, i) => (
          <rect key={i} x={x - 38 + i * 10} y={baseY - 174} width={6} height={6} />
        ))}
        <rect x={x - 48} y={baseY - 180} width={14} height={34} />
        <rect x={x + 38} y={baseY - 184} width={14} height={38} />
        <rect x={x - 4} y={baseY - 196} width={16} height={28} />
        <path d={`M${x - 6},${baseY - 196} L${x + 4},${baseY - 210} L${x + 14},${baseY - 196} Z`} />
      </g>
      <rect x={x - 30} y={baseY - 162} width={5} height={6} fill={p.lights} opacity={0.8} />
      <rect x={x + 18} y={baseY - 162} width={5} height={6} fill={p.lights} opacity={0.8} />
    </g>
  );
}

export function Lab({ x, baseY, w, h, p, rand }: { x: number; baseY: number; w: number; h: number; p: Palette; rand: () => number }) {
  return (
    <g>
      <rect x={x} y={baseY - h} width={w} height={h} fill={p.near} />
      <rect x={x + w * 0.62} y={baseY - h - 24} width={w * 0.3} height={24} rx={4} fill={p.near} />
      <Windows x={x} y={baseY - h} w={w} h={h} color={p.lights} rand={rand} density={0.5} cell={8} />
      {/* molecule motif on the facade */}
      <g stroke={p.lights} strokeWidth={1.4} fill={p.lights} opacity={0.85}>
        <line x1={x + 14} y1={baseY - h + 14} x2={x + 26} y2={baseY - h + 22} />
        <line x1={x + 26} y1={baseY - h + 22} x2={x + 38} y2={baseY - h + 14} />
        <circle cx={x + 14} cy={baseY - h + 14} r={3} />
        <circle cx={x + 26} cy={baseY - h + 22} r={3} />
        <circle cx={x + 38} cy={baseY - h + 14} r={3} />
      </g>
    </g>
  );
}

/** Soft vignette + film grain so flat shapes feel printed. */
export function Finish({ id }: { id: string }) {
  return (
    <>
      <defs>
        <radialGradient id={`${id}-vig`} cx="0.5" cy="0.45" r="0.75">
          <stop offset="0.6" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.35" />
        </radialGradient>
        <filter id={`${id}-grain`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.07" />
          </feComponentTransfer>
        </filter>
      </defs>
      <rect width={W} height={H} filter={`url(#${id}-grain)`} />
      <rect width={W} height={H} fill={`url(#${id}-vig)`} />
    </>
  );
}
