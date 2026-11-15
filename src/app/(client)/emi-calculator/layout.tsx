import { pageMeta } from "@/lib/site";

// The page itself is a client component, so its title and description live here.
export const metadata = pageMeta(
  "/emi-calculator",
  "Home loan EMI calculator — Hyderabad | Property Tiger",
  "Work out your monthly EMI, total interest and year-by-year repayment, see what a prepayment saves, and the full cost of buying with Telangana stamp duty and registration.",
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
