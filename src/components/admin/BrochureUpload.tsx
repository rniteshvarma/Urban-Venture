"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const IMAGE_ROLES = [
  ["BROCHURE_PAGE", "Brochure page"], ["PRICE_LIST", "Price list"], ["MASTER_PLAN", "Master plan"],
  ["FLOOR_PLAN", "Floor plan"], ["UNIT_PLAN", "Unit plan"], ["ELEVATION_RENDER", "Elevation / render"],
  ["AMENITY_LIST", "Amenity list"], ["SPECIFICATION", "Specification"], ["LOCATION_MAP", "Location map"],
  ["SITE_PHOTO", "Site photo"], ["LISTING_SCREENSHOT", "Listing screenshot"], ["OTHER", "Other"],
] as const;

const ACCEPT = "application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif";

interface Picked { file: File; role: string; }

export default function BrochureUpload() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Picked[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hints, setHints] = useState({ developer: "", corridor: "", city: "" });

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next = Array.from(list).map((file) => ({ file, role: file.type === "application/pdf" ? "" : "BROCHURE_PAGE" }));
    setItems((prev) => [...prev, ...next].slice(0, 15));
    setError("");
  }

  async function submit() {
    if (items.length === 0) return;
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      items.forEach((it) => fd.append("files", it.file));
      fd.append("roles", JSON.stringify(items.map((it) => it.role || null)));
      fd.append("developer", hints.developer);
      fd.append("corridor", hints.corridor);
      fd.append("city", hints.city);
      const res = await fetch("/api/admin/extraction/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Upload failed"); setBusy(false); return; }
      router.push(`/admin/projects/extract/${data.jobId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-2xl">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
        className="cursor-pointer rounded-xl border-2 border-dashed p-8 text-center"
        style={{ borderColor: "var(--color-saffron)", background: "var(--color-saffron-wash)" }}
      >
        <div className="text-3xl mb-2">📄</div>
        <div className="font-semibold text-text-primary">Upload brochure or images</div>
        <p className="text-sm text-text-secondary mt-1">Drop a PDF, or images — a brochure page, price list, layout plan, or screenshot. Multiple images = one project.</p>
        <p className="text-xs text-text-tertiary mt-2">PDF · JPG · PNG · WEBP · HEIC · Max 15 files, 40MB</p>
        <input ref={inputRef} type="file" accept={ACCEPT} multiple hidden onChange={(e) => addFiles(e.target.files)} />
      </div>

      {items.length > 0 && (
        <div className="mt-5 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-text-primary">{items.length} file{items.length > 1 ? "s" : ""} ready</span>
            <button onClick={() => inputRef.current?.click()} className="text-xs text-text-accent">+ Add more</button>
          </div>
          {items.map((it, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg border" style={{ borderColor: "var(--color-line)" }}>
              <span className="text-xs text-text-tertiary w-5">{i + 1}</span>
              <span className="flex-1 text-sm text-text-primary truncate">{it.file.name}</span>
              <span className="text-xs text-text-tertiary">{(it.file.size / 1024 / 1024).toFixed(1)}MB</span>
              {it.file.type !== "application/pdf" && (
                <select value={it.role} onChange={(e) => setItems((p) => p.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)))}
                  className="text-xs rounded border px-2 py-1" style={{ borderColor: "var(--color-line)", background: "var(--color-surface)" }}>
                  {IMAGE_ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              )}
              <button onClick={() => setItems((p) => p.filter((_, j) => j !== i))} className="text-text-tertiary hover:text-danger">🗑</button>
            </div>
          ))}

          <div className="grid grid-cols-3 gap-2 mt-3">
            <input placeholder="Developer (optional)" value={hints.developer} onChange={(e) => setHints({ ...hints, developer: e.target.value })} className="text-xs rounded border px-2 py-1.5" style={{ borderColor: "var(--color-line)" }} />
            <input placeholder="Corridor (optional)" value={hints.corridor} onChange={(e) => setHints({ ...hints, corridor: e.target.value })} className="text-xs rounded border px-2 py-1.5" style={{ borderColor: "var(--color-line)" }} />
            <input placeholder="City (optional)" value={hints.city} onChange={(e) => setHints({ ...hints, city: e.target.value })} className="text-xs rounded border px-2 py-1.5" style={{ borderColor: "var(--color-line)" }} />
          </div>

          {error && <p className="text-sm mt-2" style={{ color: "var(--color-danger)" }}>{error}</p>}

          <button onClick={submit} disabled={busy} className="uv-btn uv-btn-primary w-full mt-3" style={{ opacity: busy ? 0.7 : 1 }}>
            {busy ? "Uploading…" : `Extract from ${items.length} file${items.length > 1 ? "s" : ""} →`}
          </button>
        </div>
      )}
    </div>
  );
}
