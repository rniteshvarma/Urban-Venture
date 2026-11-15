import React from "react";
import Link from "next/link";
import { Info, ShieldCheck } from "lucide-react";

/** The stored Property Tiger Score breakdown (src/lib/score/lenses.ts, TigerScore). */
export interface TigerScoreData {
  version: string;
  score: number | null;
  band: string | null;
  measured: number;
  lenses: { key: string; label: string; weight: number; score: number | null; status: "measured" | "no-data" | "not-applicable"; note: string; source: string }[];
  caps: string[];
}

/** Colour by score: strong green, good saffron, fair amber, weak red. Text stays dark enough to read on light backgrounds. */
export function scoreTone(score: number): { fg: string; bg: string } {
  if (score >= 7.5) return { fg: "#0B6B3A", bg: "#E3F4EA" };
  if (score >= 6) return { fg: "#7A5200", bg: "#FFF4D6" };
  if (score >= 5) return { fg: "#8A4B00", bg: "#FDEBD3" };
  return { fg: "#A12D22", bg: "#FBE4E1" };
}

/** Compact pill for cards and lists: "7.4 /10". Renders nothing without a score. */
export function TigerScoreBadge({ score, label = true, size = "sm" }: { score: number | null | undefined; label?: boolean; size?: "sm" | "md" }) {
  if (score == null) return null;
  const t = scoreTone(score);
  return (
    <span
      title="Property Tiger Score: eight lenses, same rules for every listing"
      style={{ display: "inline-flex", alignItems: "baseline", gap: 4, background: t.bg, color: t.fg, borderRadius: 999, padding: size === "md" ? "4px 12px" : "3px 9px", fontWeight: 800, fontSize: size === "md" ? "0.875rem" : "0.6875rem", whiteSpace: "nowrap" }}
    >
      {score.toFixed(1)}
      <span style={{ fontWeight: 600, opacity: 0.8 }}>/10{label ? " Tiger Score" : ""}</span>
    </span>
  );
}

/** Full eight-lens scorecard for a listing page. */
export function TigerScorecard({ data }: { data: TigerScoreData | null | undefined }) {
  if (!data) return null;
  const t = data.score != null ? scoreTone(data.score) : null;
  return (
    <section className="card-premium space-y-5 !p-8 border-t-4 border-t-saffron" aria-labelledby="tiger-score-heading">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 id="tiger-score-heading" className="section-header text-xl flex items-center gap-2">
            <ShieldCheck size={18} className="text-saffron-deep" /> Property Tiger Score
          </h2>
          <p className="text-xs text-text-secondary mt-1">
            Eight lenses, the same rules for every listing.{" "}
            {data.score != null ? `Based on ${data.measured} of 8 lenses.` : `Only ${data.measured} of 8 lenses have data, so there's no overall score yet.`}
          </p>
        </div>
        {data.score != null && t ? (
          <div className="text-right">
            <span className="font-display text-4xl font-bold" style={{ color: t.fg }}>
              {data.score.toFixed(1)}
              <span className="text-base text-text-secondary font-semibold"> /10</span>
            </span>
            <div className="text-xs font-bold mt-0.5" style={{ color: t.fg }}>{data.band}</div>
          </div>
        ) : (
          <span className="text-sm font-semibold text-text-secondary">Not scored yet</span>
        )}
      </div>

      <ul className="space-y-4">
        {data.lenses.map((l) => (
          <li key={l.key}>
            <div className="flex justify-between gap-3 text-xs font-semibold text-text-primary">
              <span>{l.label}</span>
              <span className="font-mono" style={{ color: l.score == null ? "var(--color-text-lo)" : undefined }}>
                {l.score != null ? `${l.score}/100` : l.status === "not-applicable" ? "Doesn't apply" : "Not enough data"}
              </span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 mt-1.5 overflow-hidden" aria-hidden>
              {l.score != null && <div className="h-full rounded-full" style={{ width: `${l.score}%`, background: "var(--color-saffron)" }} />}
            </div>
            <div className="text-[11px] text-text-secondary mt-1">{l.note}</div>
            <div className="text-[10px] text-text-secondary/80 mt-0.5">Source: {l.source}</div>
          </li>
        ))}
      </ul>

      {data.caps.length > 0 && (
        <div className="rounded-lg p-3 text-xs" style={{ background: "#FDEBD3", color: "#8A4B00" }}>
          {data.caps.map((c) => <p key={c}>{c}</p>)}
        </div>
      )}

      <p className="text-[11px] text-text-secondary flex items-start gap-1.5">
        <Info size={12} className="shrink-0 mt-0.5" />
        <span>
          Computed from records and prices we hold. A lens without enough data is left out rather than guessed. Builders can&apos;t pay to change a score.
          Not investment advice. <Link href="/how-we-score" className="underline font-semibold">How the score works</Link>
        </span>
      </p>
    </section>
  );
}
