/**
 * /vastu — free Vastu check for a floor plan. Server shell: title, and
 * whether the AI plan reader is switched on (ANTHROPIC_API_KEY).
 */
import { pageMeta } from "@/lib/site";
import { planReaderAvailable } from "@/lib/vastu/read-plan";
import VastuCheck from "./VastuCheck";

export const metadata = pageMeta(
  "/vastu",
  "Free Vastu check for your floor plan | Property Tiger",
  "Check a flat or villa's floor plan against commonly followed Vastu guidelines: main door direction, kitchen, master bedroom, pooja room, toilets and more. Free, in a minute.",
);

const FACINGS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;

export default async function VastuPage({ searchParams }: { searchParams: Promise<{ facing?: string }> }) {
  const ai = planReaderAvailable();
  // The homepage search card can pre-pick the main-door direction (?facing=E).
  const f = (await searchParams).facing?.toUpperCase();
  const initialFacing = (FACINGS as readonly string[]).includes(f ?? "") ? (f as (typeof FACINGS)[number]) : null;
  return (
    <div className="max-w-6xl mx-auto px-4 pt-10 pb-16 space-y-8 w-full">
      <div className="text-center" style={{ background: "var(--color-ink)", borderRadius: "var(--radius-uv-lg)", padding: "clamp(2rem, 5vw, 3rem) 1.5rem" }}>
        <span className="text-[10px] font-mono uppercase tracking-wider px-3 py-1.5 rounded-full" style={{ background: "var(--color-ink-soft)", border: "1px solid var(--color-ink-line)", color: "var(--color-saffron)" }}>
          Free · no sign-up
        </span>
        <h1 className="mt-3 text-3xl sm:text-5xl tracking-tight" style={{ fontFamily: "var(--font-jakarta)", fontWeight: 800, color: "#fff" }}>Vastu check</h1>
        <p className="mt-3 text-sm max-w-2xl mx-auto" style={{ color: "var(--color-text-invert-mid)" }}>
          {ai ? "Upload the floor plan or mark the rooms yourself" : "Mark where each room is"} and see how the home lines up with commonly followed Vastu guidelines — the main door, kitchen, master bedroom, pooja room and toilets.
        </p>
      </div>
      <VastuCheck aiEnabled={ai} initialFacing={initialFacing} />
    </div>
  );
}
