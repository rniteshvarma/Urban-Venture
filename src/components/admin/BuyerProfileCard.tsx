"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { LISTING_TYPE_LABELS, PURPOSE_LABELS, personaMeta } from "@/lib/personas";

type Lead = {
  purpose?: "INVESTMENT" | "OWN_USE" | "BOTH" | null;
  wantedTypes?: string[];
  preferredAreas?: string[];
  budgetMinLakh?: number | null;
  budget?: number;
  horizon?: number;
  timeline?: string | null;
  isNri?: boolean;
  requirements?: string | null;
  persona?: string | null;
  personaReason?: string | null;
  conversations?: Array<{ id: string; state: string; channel: string; updatedAt: string; reportUrl: string | null }>;
};

const TIMELINE: Record<string, string> = { READY: "Ready to move", WITHIN_1Y: "Within a year", LATER: "2–3 years is fine" };
const prettyArea = (slug: string) => slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

/** The buyer profile the WhatsApp concierge captured — shown only when there is one. */
export default function BuyerProfileCard({ lead }: { lead: Lead }) {
  const hasProfile = !!lead.purpose || !!lead.wantedTypes?.length || !!lead.preferredAreas?.length || !!lead.requirements;
  const convs = lead.conversations ?? [];
  if (!hasProfile && !convs.length) return null;
  const persona = personaMeta(lead.persona);

  const rows: Array<[string, string]> = [
    ["Purpose", lead.purpose ? PURPOSE_LABELS[lead.purpose] : "—"],
    ["Looking for", lead.wantedTypes?.length ? lead.wantedTypes.map((t) => LISTING_TYPE_LABELS[t as keyof typeof LISTING_TYPE_LABELS] ?? t).join(", ") : "Not sure yet"],
    ["Areas", lead.preferredAreas?.length ? lead.preferredAreas.map(prettyArea).join(", ") : "Open to suggestions"],
    [lead.purpose === "OWN_USE" ? "Move-in" : "Holding period", lead.purpose === "OWN_USE" ? TIMELINE[lead.timeline ?? ""] ?? "—" : lead.horizon ? `~${lead.horizon} years` : "—"],
  ];
  if (lead.isNri) rows.push(["Location", "Outside India (NRI)"]);
  if (lead.requirements) rows.push(["Other needs", lead.requirements]);

  return (
    <div className="pt-4 border-t border-luxury/40 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="text-[10px] text-text-secondary uppercase font-semibold tracking-wider">Buyer profile</span>
        {persona && (
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${persona.tw.bg} ${persona.tw.text} ${persona.tw.border}`} title={lead.personaReason ?? persona.description}>
            {persona.icon} {persona.label}
          </span>
        )}
      </div>
      <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 text-xs">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt className="text-[10px] text-text-secondary uppercase">{k}</dt>
            <dd className="font-semibold text-text-primary mt-0.5">{v}</dd>
          </div>
        ))}
      </dl>
      {lead.personaReason && <p className="text-[11px] text-text-secondary">{lead.personaReason}</p>}
      {convs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {convs.map((c) => (
            <Link key={c.id} href={`/admin/concierge?c=${c.id}`} className="inline-flex items-center gap-1.5 rounded-full bg-[#EEEDF7] text-[#5B4FE0] px-3 py-1.5 text-[11px] font-semibold hover:bg-[#E4DCFF]">
              <MessageCircle size={12} /> {c.channel === "SIMULATOR" ? "Simulator chat" : "WhatsApp chat"} · {c.state.toLowerCase()}
            </Link>
          ))}
          {convs[0]?.reportUrl && (
            <a href={convs[0].reportUrl} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-full border border-[#E8E5F5] px-3 py-1.5 text-[11px] font-semibold text-text-secondary hover:text-[#5B4FE0]">
              Report sent ↗
            </a>
          )}
        </div>
      )}
    </div>
  );
}
