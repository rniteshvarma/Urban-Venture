import { pageMeta } from "@/lib/site";

// The page itself is a client component, so its title and description live here.
export const metadata = pageMeta("/market/compare", "Compare Hyderabad areas side by side | Property Tiger", "Compare Hyderabad areas on measured flat and plot prices, rental yield, infrastructure and RERA activity, side by side.");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
