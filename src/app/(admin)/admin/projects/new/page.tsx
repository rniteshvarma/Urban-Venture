"use client";

import React, { useState } from "react";
import ProjectForm from "@/components/admin/ProjectForm";
import BrochureUpload from "@/components/admin/BrochureUpload";

type Mode = "choose" | "upload" | "manual";

export default function AdminNewProjectPage() {
  const [mode, setMode] = useState<Mode>("choose");

  if (mode === "manual") {
    return (
      <div className="w-full flex flex-col items-center py-4">
        <button onClick={() => setMode("choose")} className="self-start text-sm text-text-secondary mb-2 ml-2">← Back</button>
        <ProjectForm />
      </div>
    );
  }

  if (mode === "upload") {
    return (
      <div className="w-full flex flex-col items-center py-4">
        <button onClick={() => setMode("choose")} className="self-start text-sm text-text-secondary mb-2 ml-2">← Back</button>
        <BrochureUpload />
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold text-text-primary mb-1">Add a project</h1>
      <p className="text-sm text-text-secondary mb-8">Upload a brochure or images and we&rsquo;ll read it, or enter the details yourself.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <button
          onClick={() => setMode("upload")}
          className="text-left p-6 rounded-xl border-2 border-dashed transition-all hover:shadow-md"
          style={{ borderColor: "var(--color-saffron)", background: "var(--color-saffron-wash)" }}
        >
          <div className="text-3xl mb-3">📄</div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-text-primary">Upload brochure or images</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--color-saffron)", color: "var(--color-ink)" }}>NEW</span>
          </div>
          <p className="text-sm text-text-secondary">Drop a PDF, or photos of a brochure, a price list, or a layout plan. Multiple images are read as one project. Review before publishing.</p>
        </button>

        <button
          onClick={() => setMode("manual")}
          className="text-left p-6 rounded-xl border transition-all hover:shadow-md"
          style={{ borderColor: "var(--color-line)", background: "var(--color-surface)" }}
        >
          <div className="text-3xl mb-3">✏️</div>
          <div className="font-semibold text-text-primary mb-1">Enter manually</div>
          <p className="text-sm text-text-secondary">Fill the project form yourself.</p>
        </button>
      </div>
    </div>
  );
}
