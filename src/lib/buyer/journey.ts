/**
 * The eight steps of buying with Property Tiger. Every "we do" line is a
 * service the business confirmed it provides (Nov 2026); change this file,
 * not page copy, if that changes.
 */
export interface JourneyStep {
  id: string;
  n: number;
  title: string;
  we: string;
  you: string;
  link?: { href: string; label: string };
}

export const JOURNEY: JourneyStep[] = [
  { id: "think", n: 1, title: "Think it through", we: "A call with our team about your budget, the areas that fit, your loan and your timeline.", you: "A clear brief: budget, areas and type of home.", link: { href: "/research", label: "Where your budget fits" } },
  { id: "shortlist", n: 2, title: "Shortlist", we: "We shortlist projects that fit, each with its Property Tiger Score, TG-RERA record and builder's delivery history.", you: "Three to five homes worth seeing.", link: { href: "/projects", label: "Browse scored listings" } },
  { id: "visits", n: 3, title: "Site visits", we: "We plan the visits and go with you, with a checklist of what to ask and look at on site.", you: "Visits on your schedule, with someone on your side." },
  { id: "negotiate", n: 4, title: "Negotiate and book", we: "We negotiate the price and terms with the builder, using the area's measured prices and the government guidance value.", you: "A better deal, in writing, before you pay the booking amount.", link: { href: "/market", label: "Area prices" } },
  { id: "loan", n: 5, title: "Home loan", we: "We compare lenders for the property you pick and follow up on the paperwork with the bank.", you: "The loan sanctioned without chasing.", link: { href: "/emi-calculator", label: "EMI calculator" } },
  { id: "legal", n: 6, title: "Legal checks", we: "A property lawyer checks the title and reads the sale agreement before you sign.", you: "No surprises in the documents.", link: { href: "/market/legal", label: "Checks before you buy" } },
  { id: "snag", n: 7, title: "Snag check", we: "An inspection of the home before you accept handover, with a list for the builder to fix.", you: "Defects fixed before you move in." },
  { id: "keys", n: 8, title: "Keys and interiors", we: "Handover day, and interior designers we work with if you want the home done up.", you: "A home ready to live in.", link: { href: "/vastu", label: "Free Vastu check" } },
];

export const JOURNEY_IDS = JOURNEY.map((s) => s.id);
