import { pageMeta } from "@/lib/site";

// The page itself is a client component, so its title and description live here.
export const metadata = pageMeta("/calculator", "Hyderabad property ROI calculator — price-growth scenarios | Property Tiger", "See what an amount could be worth in a Hyderabad area under conservative and optimistic price-growth scenarios from published figures, beside a fixed deposit, gold and the Nifty.");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
