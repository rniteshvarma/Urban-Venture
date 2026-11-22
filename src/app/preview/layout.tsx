import type { Metadata } from "next";
import "./v3.css";

// Design samples under review: never indexed, never linked from the live site.
export const metadata: Metadata = {
  title: "Property Tiger — design sample",
  robots: { index: false, follow: false },
};

export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
