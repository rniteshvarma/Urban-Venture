/**
 * One-off clean-up of lead values that older code filled in on the buyer's
 * behalf. Dry run by default; pass --write to apply.
 *
 *   npx tsx --env-file=.env.local scripts/leads/clear-invented-values.ts [--write]
 *
 * What it clears (each only where the value is provably a default):
 *   - budget 0 / horizon 0                      → empty (0 was used for "unknown")
 *   - listing enquiries whose ListingEnquiry has no budget, with budget 50
 *                                               → empty (50 was the default)
 *   - site-visit leads with budget 50           → empty (that form never asked)
 *   - horizon on listing-enquiry and site-visit leads → empty (copied from the listing, never asked)
 * A persona set from those defaults is cleared too, so it can be re-derived.
 * Leads from the calculator and research tool are left alone — the visitor set those figures.
 */
import prisma from "../../src/lib/prisma";

async function main() {
  const write = process.argv.includes("--write");
  const leads = await prisma.lead.findMany({
    select: { id: true, source: true, budget: true, horizon: true, persona: true, purpose: true, wantedTypes: true },
  });
  const enquiries = await prisma.listingEnquiry.findMany({ where: { leadId: { not: null } }, select: { leadId: true, budgetLakh: true } });
  const statedBudget = new Set(enquiries.filter((e) => e.budgetLakh != null).map((e) => e.leadId as string));

  let budgets = 0, horizons = 0, personas = 0;
  for (const l of leads) {
    const data: { budget?: null; horizon?: null; persona?: null; personaScore?: null; personaReason?: null } = {};
    const fromListing = l.source === "listing_enquiry" || l.source === "site_visit";
    if (l.budget === 0) data.budget = null;
    else if (l.source === "listing_enquiry" && l.budget === 50 && !statedBudget.has(l.id)) data.budget = null;
    else if (l.source === "site_visit" && l.budget === 50) data.budget = null;
    if (l.horizon === 0 || (fromListing && l.horizon != null)) data.horizon = null;
    if (!("budget" in data) && !("horizon" in data)) continue;
    // The concierge's profile-based personas rest on what the buyer said — keep those.
    const profiled = !!l.purpose || l.wantedTypes.length > 0;
    if (l.persona && !profiled) { data.persona = null; data.personaScore = null; data.personaReason = null; personas++; }
    if ("budget" in data) budgets++;
    if ("horizon" in data) horizons++;
    if (write) await prisma.lead.update({ where: { id: l.id }, data });
  }
  console.log(`${write ? "Cleared" : "Would clear"}: ${budgets} invented budget(s), ${horizons} invented holding period(s), ${personas} persona(s) derived from them — of ${leads.length} leads.${write ? "" : " Re-run with --write to apply."}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
