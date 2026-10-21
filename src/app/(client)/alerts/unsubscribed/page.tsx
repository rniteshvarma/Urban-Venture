import Link from "next/link";

export const metadata = { title: "Alerts stopped | Property Tiger", robots: { index: false } };

export default async function AlertsUnsubscribed({ searchParams }: { searchParams: Promise<{ missing?: string }> }) {
  const { missing } = await searchParams;
  return (
    <div className="max-w-xl mx-auto px-6 py-24 text-center space-y-4">
      <h1 className="font-display text-2xl font-bold">{missing ? "That link has expired" : "Alerts stopped"}</h1>
      <p className="text-sm text-text-secondary">
        {missing ? "The saved search may have been removed already." : "You won't get emails for that saved search any more. Your other alerts are unchanged."}
      </p>
      <Link href="/dashboard" className="btn-primary inline-block text-sm">Manage alerts</Link>
    </div>
  );
}
