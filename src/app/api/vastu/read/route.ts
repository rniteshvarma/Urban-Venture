// POST /api/vastu/read — read an uploaded floor plan (image or PDF) for the Vastu check.
// The file is passed to the AI reader and discarded; nothing is stored.
import { NextResponse } from "next/server";
import { readPlan, planReaderAvailable } from "@/lib/vastu/read-plan";
import { clientIp, hit, tooMany } from "@/lib/security/rate-limit";

export const maxDuration = 120;

const TYPES = ["image/png", "image/jpeg", "image/webp", "application/pdf"] as const;
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(req: Request) {
  if (!planReaderAvailable()) return NextResponse.json({ error: "Plan reading isn't switched on. Mark the rooms yourself instead." }, { status: 503 });
  const limited = await hit("vastuIp", clientIp(req.headers));
  if (!limited.ok) return tooMany(limited, "You've read several plans in the last hour. Try again later, or mark the rooms yourself.");

  const form = await req.formData().catch(() => null);
  const file = form?.get("plan");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a floor-plan image or PDF." }, { status: 400 });
  if (!TYPES.includes(file.type as (typeof TYPES)[number])) return NextResponse.json({ error: "Use a PNG, JPG, WebP or PDF file." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "That file is over 5 MB. Try a smaller image or a screenshot of the plan." }, { status: 400 });

  const out = await readPlan({ data: Buffer.from(await file.arrayBuffer()), mediaType: file.type as (typeof TYPES)[number] });
  if (!out.ok) return NextResponse.json({ error: out.message }, { status: out.reason === "unavailable" ? 503 : 422 });
  return NextResponse.json({ plan: out.plan });
}
