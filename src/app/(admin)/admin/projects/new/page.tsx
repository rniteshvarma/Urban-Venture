"use client";

import React from "react";
import ProjectForm from "@/components/admin/ProjectForm";
import Link from "next/link";

export default function AdminNewProjectPage() {
  return (
    <div className="space-y-6 flex-grow flex flex-col items-center">
      <div className="w-full max-w-3xl flex justify-start">
        <Link 
          href="/admin/projects"
          className="text-xs font-bold text-primary hover:text-accent border border-luxury px-3 py-1.5 rounded-tag bg-surface uppercase tracking-wider transition-colors"
        >
          ← Back to Projects
        </Link>
      </div>

      <ProjectForm />
    </div>
  );
}
