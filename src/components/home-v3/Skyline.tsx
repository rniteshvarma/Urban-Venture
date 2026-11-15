/** Hyderabad at dusk, old and new: Charminar, the HITEC City towers and the metro. Decorative; drawn for the ink hero. */
export default function Skyline({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const towers = [
    { x: 372, w: 46, h: 210, c: "#2c2b38" },
    { x: 424, w: 38, h: 260, c: "#23222e" },
    { x: 468, w: 52, h: 190, c: "#333241" },
    { x: 524, w: 34, h: 236, c: "#28273a" },
  ];
  const ground = 330;
  return (
    <svg viewBox="0 0 600 400" className={className} style={style} aria-hidden role="presentation">
      <defs>
        <linearGradient id="v3-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1c1a24" />
          <stop offset="1" stopColor="#3a2a1c" />
        </linearGradient>
        <linearGradient id="v3-stone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffc94d" />
          <stop offset="1" stopColor="#e09600" />
        </linearGradient>
        <linearGradient id="v3-glass" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0.16" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="600" height="400" rx="28" fill="url(#v3-sky)" stroke="#2a2a35" />
      <circle cx="300" cy="150" r="96" fill="#ffb400" opacity="0.12" />
      <circle cx="300" cy="150" r="62" fill="#ffb400" opacity="0.22" />

      {/* far skyline */}
      <path d={`M0 ${ground} V250 h40 v-30 h26 v40 h30 v-18 h22 v58 h40 v-44 h18 v44 H600 V${ground} Z`} fill="#2a2733" opacity="0.9" />

      {/* HITEC City towers */}
      {towers.map((t, i) => (
        <g key={i}>
          <rect x={t.x} y={ground - t.h} width={t.w} height={t.h} rx="3" fill={t.c} />
          <rect x={t.x} y={ground - t.h} width={t.w / 2} height={t.h} fill="url(#v3-glass)" />
          {Array.from({ length: Math.floor(t.h / 16) }).map((_, r) => (
            <rect key={r} x={t.x + 6} y={ground - t.h + 10 + r * 16} width={t.w - 12} height="3" rx="1.5" fill="#ffb400" opacity={(r + i) % 3 === 0 ? 0.75 : 0.14} />
          ))}
        </g>
      ))}

      {/* Charminar */}
      <g fill="url(#v3-stone)">
        {[176, 300].map((x) => (
          <g key={x}>
            <rect x={x} y="150" width="22" height={ground - 150} rx="2" />
            <rect x={x - 4} y="196" width="30" height="6" rx="2" />
            <rect x={x - 4} y="236" width="30" height="6" rx="2" />
            <rect x={x - 3} y="150" width="28" height="7" rx="2" />
            <path d={`M${x - 1} 150 Q${x + 11} 112 ${x + 23} 150 Z`} />
            <rect x={x + 10} y="104" width="2" height="12" />
          </g>
        ))}
        <rect x="196" y="220" width="106" height={ground - 220} />
        <rect x="192" y="210" width="114" height="12" rx="2" />
        <path d="M222 236 Q249 200 276 236 Z" fill="#ffd27a" />
      </g>
      <path d={`M226 ${ground} V262 Q249 222 272 262 V${ground} Z`} fill="#1c1a24" />
      {[200, 214, 284, 298].map((x) => <path key={x} d={`M${x} 214 v-6 q4 -6 8 0 v6 z`} fill="#1c1a24" opacity="0.8" />)}

      {/* metro viaduct */}
      <rect x="0" y="292" width="600" height="8" fill="#4a4858" />
      {[40, 130, 340, 440, 540].map((x) => <rect key={x} x={x} y="300" width="10" height={ground - 300} fill="#4a4858" />)}
      <g>
        <rect x="380" y="276" width="150" height="17" rx="8" fill="#f4f1ea" stroke="#4a4858" />
        <rect x="380" y="286" width="150" height="3" fill="#ffb400" />
        {[396, 422, 448, 474, 500].map((x) => <rect key={x} x={x} y="280" width="16" height="5" rx="1.5" fill="#ffb400" opacity="0.85" />)}
      </g>

      {/* ground + trees */}
      <rect x="0" y={ground} width="600" height={400 - ground} fill="#15141b" />
      {[30, 70, 118, 352, 572].map((x, i) => (
        <g key={x}>
          <rect x={x - 2} y={ground - 22} width="4" height="22" fill="#3a2c20" />
          <circle cx={x} cy={ground - 28} r={i % 2 ? 13 : 16} fill="#1f5a3f" opacity="0.95" />
        </g>
      ))}
      <path d={`M0 ${ground + 26} C 160 ${ground + 12}, 380 ${ground + 44}, 600 ${ground + 24}`} stroke="#25232d" strokeWidth="10" fill="none" />
    </svg>
  );
}
