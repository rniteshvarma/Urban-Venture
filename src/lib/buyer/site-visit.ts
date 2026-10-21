/** Validation for a site-visit request. Pure: tested in buyer.test.ts. */
export const SLOTS = { MORNING: "9 am – 12 pm", AFTERNOON: "12 – 3 pm", EVENING: "3 – 6 pm" } as const;
export type Slot = keyof typeof SLOTS;

export function validateVisitRequest(
  body: Record<string, unknown>,
  now: Date,
): { ok: true; value: { name: string; phone: string; email: string | null; date: Date; slot: Slot; note: string | null } } | { ok: false; error: string } {
  const name = String(body.name ?? "").trim();
  const phone = String(body.phone ?? "").replace(/[^\d+]/g, "");
  const email = body.email ? String(body.email).trim() : null;
  const slot = String(body.slot ?? "") as Slot;
  const note = body.note ? String(body.note).trim().slice(0, 500) : null;
  const date = new Date(`${String(body.date ?? "")}T00:00:00+05:30`);
  if (name.length < 2) return { ok: false, error: "Please enter your name." };
  if (phone.replace(/\D/g, "").length < 10) return { ok: false, error: "Please enter a valid phone number." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "That email address doesn't look right." };
  if (!(slot in SLOTS)) return { ok: false, error: "Pick a time of day." };
  if (Number.isNaN(date.getTime())) return { ok: false, error: "Pick a date." };
  const today = new Date(now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) + "T00:00:00+05:30");
  const days = (date.getTime() - today.getTime()) / 86_400_000;
  if (days < 1) return { ok: false, error: "Pick a date from tomorrow onwards." };
  if (days > 60) return { ok: false, error: "Pick a date within the next two months." };
  return { ok: true, value: { name, phone, email, date, slot, note } };
}
