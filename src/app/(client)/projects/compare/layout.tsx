import { pageMeta } from "@/lib/site";

// The page itself is a client component, so its title and description live here.
export const metadata = pageMeta("/projects/compare", "Compare projects | Property Tiger", "Put Hyderabad projects side by side: price, size, possession, TG-RERA status and rating.", { noindex: true });

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
