/**
 * Reads a floor-plan image or PDF with Claude and returns where each room
 * sits on a 3×3 grid of the drawing, which side north is on (if the plan
 * shows a compass), which side the main door is on, and whether the scan was
 * clear enough to read. The buyer confirms or corrects everything before the
 * Vastu report is built; nothing here is stored.
 *
 * Needs ANTHROPIC_API_KEY. Server-only.
 */
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

const MODEL = "claude-opus-5-5";

const Side = z.enum(["top", "right", "bottom", "left"]);
const PlanRead = z.object({
  readQuality: z.enum(["good", "poor"]).describe("poor when the scan is too blurry, cropped or small to place rooms reliably"),
  qualityNote: z.string().describe("one short sentence on what limited the reading, or empty"),
  isFloorPlan: z.boolean().describe("false if the image is not an apartment or house floor plan"),
  northSide: Side.nullable().describe("the side of the drawing the north arrow points to; null if the plan shows no compass"),
  entranceSide: Side.nullable().describe("the side of the drawing the main entrance door is on; null if unclear"),
  rooms: z.array(z.object({
    type: z.enum(["kitchen", "master_bedroom", "bedroom", "pooja", "living", "dining", "toilet", "staircase", "balcony"]),
    row: z.number().int().min(0).max(2).describe("grid row of the room's centre: 0 top, 1 middle, 2 bottom"),
    col: z.number().int().min(0).max(2).describe("grid column of the room's centre: 0 left, 1 middle, 2 right"),
    labelOnPlan: z.string().describe("the room's label as written on the plan"),
  })),
});
export type PlanReadResult = z.infer<typeof PlanRead>;

const PROMPT = `This is a floor plan a home buyer uploaded. Read it so we can check the layout against common Vastu placement guidelines.

Divide the drawing of the home (the outer walls, not the page) into a 3×3 grid. For each room, give the grid cell its centre falls in. Use these types: kitchen, master_bedroom (the largest bedroom, or one labelled master), bedroom (other bedrooms), pooja, living (living, drawing, family or hall), dining, toilet (any toilet, bath or WC — list each one), staircase, balcony (balcony, sit-out, utility balcony). Skip foyers, passages, store rooms and anything else.

If the plan shows a north arrow or compass, give the side of the drawing north points to; otherwise null — never guess north from text or orientation. Give the side the main entrance door is on if you can see it.

If the image is too blurry, cropped or small to place rooms with confidence, set readQuality to "poor". If it isn't a home floor plan, set isFloorPlan to false and leave rooms empty.`;

export type ReadOutcome =
  | { ok: true; plan: PlanReadResult }
  | { ok: false; reason: "unavailable" | "refused" | "unreadable" | "error"; message: string };

export function planReaderAvailable(): boolean {
  const key = process.env.ANTHROPIC_API_KEY?.trim() ?? "";
  // Older local setups use a "mock-…" placeholder key; treat that as switched off.
  return !!key && !/mock/i.test(key);
}

export async function readPlan(file: { data: Buffer; mediaType: "image/png" | "image/jpeg" | "image/webp" | "application/pdf" }): Promise<ReadOutcome> {
  if (!planReaderAvailable()) return { ok: false, reason: "unavailable", message: "Plan reading isn't switched on. Mark the rooms yourself instead." };
  const client = new Anthropic();
  const b64 = file.data.toString("base64");
  const media: Anthropic.ContentBlockParam =
    file.mediaType === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } }
      : { type: "image", source: { type: "base64", media_type: file.mediaType, data: b64 } };
  try {
    const res = await client.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort: "medium", format: zodOutputFormat(PlanRead) },
      messages: [{ role: "user", content: [media, { type: "text", text: PROMPT }] }],
    });
    if (res.stop_reason === "refusal") return { ok: false, reason: "refused", message: "We couldn't read this file. Mark the rooms yourself instead." };
    if (!res.parsed_output) return { ok: false, reason: "unreadable", message: "We couldn't read this plan. Mark the rooms yourself instead." };
    return { ok: true, plan: res.parsed_output };
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return { ok: false, reason: "error", message: "The plan reader is busy. Try again in a minute, or mark the rooms yourself." };
    if (err instanceof Anthropic.APIError) {
      console.error(`[vastu] plan read failed: ${err.status} ${err.message}`);
      return { ok: false, reason: "error", message: "Something went wrong reading the plan. Mark the rooms yourself instead." };
    }
    console.error("[vastu] plan read failed:", err);
    return { ok: false, reason: "error", message: "Something went wrong reading the plan. Mark the rooms yourself instead." };
  }
}
