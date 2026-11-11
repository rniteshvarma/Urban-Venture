import { pageMeta } from "@/lib/site";

// The page itself is a client component, so its title and description live here.
export const metadata = pageMeta("/market/approvals", "TG-RERA project directory — Hyderabad | Property Tiger", "Hyderabad projects with their TG-RERA registration numbers, approval authority and dates, with links to verify each one on the official portal.");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
