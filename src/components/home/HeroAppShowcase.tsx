"use client";

/**
 * Hero app showcase — phone mockup with floating feature cards + connector dots,
 * layered over the banner video. Shown from lg (≥1024px) up; hidden on smaller
 * screens so the hero stays clean (no stacked duplicate).
 *
 * IMAGE: replace public/hero-app-mockup.png with the real bezel-framed phone
 * screenshot (portrait). Nothing else needs to change.
 */

import React from "react";
import { Map as MapIcon, TrendingUp, Sparkles } from "lucide-react";

const PHONE_IMG = "/hero-app-mockup.png";
const PHONE_W = 228;
const PHONE_H = 470;
const BOX_W = 480;

interface CardDef { Icon: typeof MapIcon; label: string; text: string; tint: string; tintBg: string; top: string }
const CARDS: CardDef[] = [
  { Icon: MapIcon, label: "EXPLORE MAP", text: "Growth corridors, live", tint: "var(--color-saffron-deep, #E09600)", tintBg: "var(--color-saffron-wash)", top: "2%" },
  { Icon: TrendingUp, label: "CORRIDOR SCORES", text: "Ranked by intelligence", tint: "var(--color-growth)", tintBg: "var(--color-growth-wash)", top: "40%" },
  { Icon: Sparkles, label: "AI RESEARCH", text: "AI shortlists your desired properties", tint: "var(--color-navy-ink)", tintBg: "var(--color-navy-wash)", top: "78%" },
];

function Card({ Icon, label, text, tint, tintBg }: CardDef) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", borderRadius: 13, padding: "10px 12px", boxShadow: "0 14px 34px rgba(0,0,0,0.20)", width: "100%" }}>
      <span style={{ width: 34, height: 34, borderRadius: 9, background: tintBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={17} color={tint} />
      </span>
      <div>
        <div style={{ fontFamily: "var(--font-mono, ui-monospace, monospace)", fontSize: "0.58rem", fontWeight: 700, letterSpacing: 1, color: tint, textTransform: "uppercase" }}>{label}</div>
        <div style={{ fontSize: "0.86rem", fontWeight: 600, color: "var(--color-ink)", lineHeight: 1.25 }}>{text}</div>
      </div>
    </div>
  );
}

export default function HeroAppShowcase() {
  return (
    <div className="hidden lg:block" style={{ position: "relative", width: BOX_W, height: PHONE_H + 8, flexShrink: 0 }}>
      {/* phone anchored right, with rings + soft glow */}
      <div style={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)" }}>
        <div style={{ position: "relative", zIndex: 2 }}>
          <div aria-hidden style={{ position: "absolute", inset: "-6% -30%", borderRadius: "50%", border: "1px solid rgba(255,255,255,0.10)" }} />
          <div aria-hidden style={{ position: "absolute", inset: "8% -10%", borderRadius: "50%", border: "1px solid rgba(255,255,255,0.07)" }} />
          <div aria-hidden style={{ position: "absolute", inset: "16% 2%", borderRadius: "50%", background: "radial-gradient(closest-side, rgba(255,255,255,0.14), transparent)" }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={PHONE_IMG}
            alt="Property Tiger app — plot discovery"
            width={PHONE_W}
            height={PHONE_H}
            style={{ position: "relative", display: "block", width: PHONE_W, height: PHONE_H, objectFit: "contain", borderRadius: 34, background: "linear-gradient(160deg,#20202A,#0D0D12)", filter: "drop-shadow(0 30px 60px rgba(0,0,0,0.55))" }}
          />
        </div>
      </div>

      {/* cards on the left with connector line + dot */}
      {CARDS.map((c, i) => (
        <div key={i} className="animate-fade-in-up" style={{ position: "absolute", left: 0, top: c.top, width: 210, display: "flex", alignItems: "center", animationDelay: `${0.25 + i * 0.15}s` }}>
          <div style={{ flex: 1 }}><Card {...c} /></div>
          <div style={{ width: 42, height: 1, background: "rgba(255,255,255,0.4)", flexShrink: 0 }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: c.tint, boxShadow: "0 0 0 3px rgba(255,255,255,0.18)", flexShrink: 0 }} />
        </div>
      ))}
    </div>
  );
}
