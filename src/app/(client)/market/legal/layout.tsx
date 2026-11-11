import { pageMeta } from "@/lib/site";

// The page itself is a client component, so its title and description live here.
export const metadata = pageMeta("/market/legal", "Checks before buying property in Hyderabad | Property Tiger", "What to check before you pay for a flat, plot or farm land in Telangana: TG-RERA, title, encumbrance, Bhu Bharati records, layout approvals and conversion.");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
