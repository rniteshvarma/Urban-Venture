/**
 * App-wide toast notifications. Call from any client code:
 *   toast.success("Saved"); toast.error("Couldn't save"); toast.info("…");
 *   toast.show(msg)  — picks the tone from the wording (used where alert() was).
 * Rendered by <Toaster/> (mounted once in the root layout). Non-blocking,
 * announced to screen readers, auto-dismissing.
 */
export type ToastTone = "success" | "error" | "info";

export interface ToastEventDetail {
  id: number;
  tone: ToastTone;
  message: string;
}

export const TOAST_EVENT = "uv:toast";
let seq = 0;

function emit(tone: ToastTone, message: unknown) {
  const text = typeof message === "string" ? message : message instanceof Error ? message.message : String(message ?? "");
  if (typeof window === "undefined" || !text) return;
  window.dispatchEvent(new CustomEvent<ToastEventDetail>(TOAST_EVENT, { detail: { id: ++seq, tone, message: text } }));
}

/** Infer a tone from the message text (for call sites migrated from alert()). */
export function toneOf(message: string): ToastTone {
  if (/\b(fail|failed|error|couldn'?t|could not|unable|invalid|denied|rejected|limit hit|missing|required|not found|expired)\b/i.test(message)) return "error";
  if (/\b(success|successful|successfully|saved|created|updated|deleted|removed|sent|copied|added|recomputed|approved|queued|done|complete)\b|✓|✅/i.test(message)) return "success";
  return "info";
}

export const toast = {
  success: (message: unknown) => emit("success", message),
  error: (message: unknown) => emit("error", message),
  info: (message: unknown) => emit("info", message),
  show: (message: unknown) => {
    const text = typeof message === "string" ? message : String(message ?? "");
    emit(toneOf(text), text);
  },
};
