"use client";

import React, { useState, useEffect, use } from "react";
import ProjectForm from "@/components/admin/ProjectForm";
import Link from "next/link";

export default function AdminEditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadProject() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/projects/${id}`);
        if (res.ok) {
          const data = await res.json();
          setProject(data);
        }
      } catch (err) {
        console.error("Failed to load project details for editing", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadProject();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex-grow flex flex-col justify-center items-center py-20 bg-luxury-bg animate-pulse">
        <div className="h-8 bg-luxury-border w-48 rounded mb-4" />
        <div className="h-64 bg-luxury-border w-full max-w-3xl rounded" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex-grow flex flex-col justify-center items-center py-20 text-center">
        <span className="text-2xl">⚠️</span>
        <h2 className="font-display text-xl font-bold text-primary mt-2">Project Not Found</h2>
        <p className="text-xs text-text-secondary mb-6">The project profile could not be loaded.</p>
        <Link href="/admin/projects" className="px-4 py-2 bg-primary text-surface text-xs font-semibold uppercase tracking-wider rounded-tag">
          Back to Projects
        </Link>
      </div>
    );
  }

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

      <ProjectForm initialData={project} isEdit={true} />
    </div>
  );
}
