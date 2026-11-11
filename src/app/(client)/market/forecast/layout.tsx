import { pageMeta } from "@/lib/site";

// The page itself is a client component, so its title and description live here.
export const metadata = pageMeta("/market/forecast", "Hyderabad property price scenarios 2026–2036 | Property Tiger", "Ten-year price scenarios for each Hyderabad area, built from today's measured prices, published city growth figures and the area's infrastructure pipeline. Scenarios, not predictions.");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
