// POST /api/admin/whatsapp/test — send a test template (or text) to a number
// the admin types in. Goes through the normal send path, so it is logged,
// validated and priced like any other send.
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { sendTemplateMessage, sendTextMessage } from "@/lib/whatsapp/send";

export const dynamic = "force-dynamic";

const schema = z.object({
  to: z.string().min(8),
  templateName: z.string().trim().optional(),
  languageCode: z.string().trim().optional(),
  bodyParams: z.array(z.string()).optional(),
  buttonParams: z.array(z.object({ subType: z.enum(["url", "quick_reply"]), index: z.number().int().min(0), value: z.string() })).optional(),
  category: z.enum(["MARKETING", "UTILITY", "AUTHENTICATION"]).optional(),
  text: z.string().optional(),
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  const p = parsed.data;
  if (!p.templateName && !p.text) return NextResponse.json({ error: "Give a template name or a text message" }, { status: 400 });

  // Each click is a deliberate new send, so the context is unique per request.
  const ctx = { feature: "test" as const, contextId: `test:${auth.userId}:${Date.now()}`, userId: auth.userId };
  const outcome = p.templateName
    ? await sendTemplateMessage({
        ...ctx,
        to: p.to,
        templateName: p.templateName,
        languageCode: p.languageCode || "en",
        bodyParams: p.bodyParams?.length ? p.bodyParams : undefined,
        buttonParams: p.buttonParams?.length ? p.buttonParams : undefined,
        category: p.category ?? "UTILITY",
      })
    : await sendTextMessage({ ...ctx, to: p.to, text: p.text! });

  return NextResponse.json(outcome, { status: outcome.ok ? 200 : 422 });
}
