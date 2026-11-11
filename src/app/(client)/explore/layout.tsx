import { pageMeta } from "@/lib/site";

// The page itself is a client component, so its title and description live here.
export const metadata = pageMeta("/explore", "Hyderabad property map — projects, plots and land | Property Tiger", "Every listing on one map: RERA projects, plotted layouts and land around Hyderabad, with prices, nearby hospitals, schools, stations and ORR exits.");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
