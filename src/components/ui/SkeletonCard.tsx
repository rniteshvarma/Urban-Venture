import React from "react";

interface SkeletonCardProps {
  variant?: "corridor" | "project" | "metric";
  className?: string;
}

function Bar({ w, h = 12, mt = 0 }: { w: string | number; h?: number; mt?: number }) {
  return <div className="uv-skeleton" style={{ width: w, height: h, marginTop: mt }} />;
}

/** Loading placeholder matched to each card shape — never a blank screen or spinner. */
export default function SkeletonCard({ variant = "corridor", className = "" }: SkeletonCardProps) {
  if (variant === "metric") {
    return (
      <div className={className} style={{ padding: "1rem 0" }}>
        <Bar w={120} h={28} />
        <Bar w={80} h={10} mt={10} />
      </div>
    );
  }

  const imgRatio = variant === "project" ? "75%" : "56.25%"; // 4:3 vs 16:9
  return (
    <div className={`uv-card ${className}`} style={{ overflow: "hidden" }}>
      <div style={{ position: "relative", width: "100%", paddingTop: imgRatio }}>
        <div className="uv-skeleton" style={{ position: "absolute", inset: 0, borderRadius: 0 }} />
      </div>
      <div style={{ padding: "1.1rem 1.25rem 1.35rem" }}>
        <Bar w="70%" h={16} />
        <Bar w="45%" h={11} mt={10} />
        <Bar w="55%" h={18} mt={16} />
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <Bar w={64} h={20} />
          <Bar w={54} h={20} />
          <Bar w={44} h={20} />
        </div>
      </div>
    </div>
  );
}
