/**
 * Proof we can stand behind: figures computed from our own data, plus the
 * RERA agent number and Google rating when the business has set them
 * (src/lib/proof.ts). Server component.
 */
import React from "react";
import { BadgeCheck, Star } from "lucide-react";
import prisma from "@/lib/prisma";
import { PUBLIC_PROJECT } from "@/lib/site";
import { publicProof, TG_RERA_SITE } from "@/lib/proof";

export default async function ProofStrip() {
  const proof = publicProof();
  const [scored, builders, orders] = await Promise.all([
    prisma.project.count({ where: { ...PUBLIC_PROJECT, tigerScore: { not: null } } }).catch(() => 0),
    prisma.developer.count().catch(() => 0),
    prisma.regulatoryOrder.count().catch(() => 0),
  ]);
  const tile = "rounded-xl p-4 bg-white border border-[var(--color-line)]";
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      <div className={tile}><div className="text-2xl font-black text-text-primary">{scored.toLocaleString("en-IN")}</div><div className="text-xs text-text-secondary">Hyderabad listings scored on eight lenses</div></div>
      <div className={tile}><div className="text-2xl font-black text-text-primary">{builders.toLocaleString("en-IN")}</div><div className="text-xs text-text-secondary">builders with a public delivery record</div></div>
      <div className={tile}><div className="text-2xl font-black text-text-primary">{orders.toLocaleString("en-IN")}</div><div className="text-xs text-text-secondary">TG-RERA orders read and matched</div></div>
      {proof.reraAgentNumber && (
        <div className={tile}>
          <div className="text-sm font-black text-text-primary flex items-center gap-1.5"><BadgeCheck size={16} className="text-growth" /> TG-RERA registered</div>
          <div className="text-xs text-text-secondary mt-1">Agent no. <span className="font-mono">{proof.reraAgentNumber}</span> · <a href={TG_RERA_SITE} target="_blank" rel="noopener noreferrer" className="underline">verify</a></div>
        </div>
      )}
      {proof.google && (
        <div className={tile}>
          <div className="text-2xl font-black text-text-primary flex items-center gap-1">{proof.google.rating.toFixed(1)} <Star size={18} className="text-amber-500" fill="currentColor" /></div>
          <div className="text-xs text-text-secondary">
            from {proof.google.reviews.toLocaleString("en-IN")} Google reviews{proof.google.url ? <> · <a href={proof.google.url} target="_blank" rel="noopener noreferrer" className="underline">read them</a></> : null}
          </div>
        </div>
      )}
    </div>
  );
}
