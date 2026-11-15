"use client";

import Link from "next/link";
import React, { useState } from "react";
import { ArrowRight } from "lucide-react";
import ListingTile from "./ListingTile";
import type { HomeCard } from "@/lib/home/v3-data";

export interface PickTab {
  id: string;
  label: string;
  href: string;
  cards: HomeCard[];
}

export default function PicksRail({ tabs }: { tabs: PickTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id);
  const tab = tabs.find((t) => t.id === active) ?? tabs[0];
  if (!tab) return null;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div role="tablist" aria-label="Picks" className="v3-scroller" style={{ gap: 6, padding: 0, flex: 1 }}>
          {tabs.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={t.id === tab.id} className="v3-tab" style={t.id === tab.id ? undefined : { border: "1px solid var(--v3-line)", background: "#fff" }} onClick={() => setActive(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        <Link href={tab.href} className="hidden sm:inline-flex" style={{ alignItems: "center", gap: 6, fontWeight: 700, fontSize: "0.875rem", color: "var(--v3-accent-text)", whiteSpace: "nowrap" }}>
          See all <ArrowRight size={16} aria-hidden />
        </Link>
      </div>
      <div role="tabpanel" className="v3-scroller">
        {tab.cards.map((c) => <ListingTile key={c.id} c={c} />)}
        <Link href={tab.href} className="v3-card" style={{ width: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, fontWeight: 800, color: "var(--v3-accent-text)", background: "var(--v3-accent-wash)", border: "1px dashed var(--v3-accent)" }}>
          <ArrowRight size={26} aria-hidden />
          See all
        </Link>
      </div>
    </div>
  );
}
