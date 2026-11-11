import { pageMeta } from "@/lib/site";

// The page itself is a client component, so its title and description live here.
export const metadata = pageMeta("/research", "Where your budget fits in Hyderabad — free area shortlist | Property Tiger", "Enter your budget and how long you plan to hold. Get a shortlist of Hyderabad areas matched on measured entry prices, infrastructure timelines and builders' delivery records.");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
