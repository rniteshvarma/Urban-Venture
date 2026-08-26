"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function PublishDraftButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function publish() {
    setBusy(true); setErr("");
    const res = await fetch(`/api/admin/projects/${projectId}/publish`, { method: "POST" });
    if (res.ok) { router.push("/admin/projects"); return; }
    const d = await res.json().catch(() => ({}));
    setErr(d.error || "Publish failed"); setBusy(false);
  }

  return (
    <div className="flex items-center gap-3">
      <button onClick={publish} disabled={busy} className="uv-btn uv-btn-primary" style={{ opacity: busy ? 0.7 : 1 }}>
        {busy ? "Publishing…" : "Publish project →"}
      </button>
      {err && <span className="text-sm" style={{ color: "var(--color-danger)" }}>{err}</span>}
    </div>
  );
}
