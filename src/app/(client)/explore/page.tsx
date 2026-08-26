"use client";

// /explore — the full-viewport property map (Constraint 1: this renders the
// map itself; it must never redirect to the corridor deep dive).
//
// maplibre-gl is ~200KB gzipped and must stay out of the main bundle, so the
// whole map is dynamically imported with SSR off (Part 9.5).

import dynamic from "next/dynamic";
import MapSkeleton from "@/components/explore/MapSkeleton";

const ExploreMap = dynamic(() => import("@/components/explore/ExploreMap"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

export default function ExplorePage() {
  return (
    // Full viewport minus the 68px client nav; the page itself never scrolls.
    <div style={{ height: "calc(100vh - 68px)", overflow: "hidden", position: "relative" }}>
      <ExploreMap />
    </div>
  );
}
