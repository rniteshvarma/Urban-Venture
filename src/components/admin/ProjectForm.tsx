"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

interface ProjectFormProps {
  initialData?: {
    id?: string;
    name: string;
    developer: string;
    corridor: string;
    city: string;
    minBudgetLakhs: number;
    maxBudgetLakhs: number;
    minHorizonYears: number;
    maxHorizonYears: number;
    riskLevel: "LOW" | "MEDIUM" | "HIGH";
    propertyType: string;
    infraHighlights: string[];
    exitOpportunities: string[];
    comparables: string[];
    description: string;
    brochureUrl: string | null;
    imageUrls: string[];
    status: "ACTIVE" | "SOLD_OUT" | "UPCOMING" | "ARCHIVED";
  };
  isEdit?: boolean;
}

export default function ProjectForm({ initialData, isEdit = false }: ProjectFormProps) {
  const router = useRouter();
  
  // Fields state
  const [name, setName] = useState(initialData?.name || "");
  const [developer, setDeveloper] = useState(initialData?.developer || "");
  const [corridor, setCorridor] = useState(initialData?.corridor || "Shadnagar Corridor");
  const [city, setCity] = useState(initialData?.city || "Hyderabad");
  const [minBudget, setMinBudget] = useState(initialData?.minBudgetLakhs || 20);
  const [maxBudget, setMaxBudget] = useState(initialData?.maxBudgetLakhs || 50);
  const [minHorizon, setMinHorizon] = useState(initialData?.minHorizonYears || 3);
  const [maxHorizon, setMaxHorizon] = useState(initialData?.maxHorizonYears || 7);
  const [riskLevel, setRiskLevel] = useState<"LOW" | "MEDIUM" | "HIGH">(initialData?.riskLevel || "MEDIUM");
  const [propertyType, setPropertyType] = useState(initialData?.propertyType || "Plots");
  
  // Tag input helpers
  const [infraText, setInfraText] = useState(initialData?.infraHighlights.join(", ") || "");
  const [exitText, setExitText] = useState(initialData?.exitOpportunities.join(", ") || "");
  const [comparablesText, setComparablesText] = useState(initialData?.comparables.join(", ") || "");
  
  const [description, setDescription] = useState(initialData?.description || "");
  const [status, setStatus] = useState<any>(initialData?.status || "ACTIVE");

  // Upload states
  const [brochureUrl, setBrochureUrl] = useState<string | null>(initialData?.brochureUrl || null);
  const [imageUrls, setImageUrls] = useState<string[]>(initialData?.imageUrls || []);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  // File Upload Helper
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "pdf") => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === "image") setIsUploadingImage(true);
    if (type === "pdf") setIsUploadingPdf(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (type === "image") {
          setImageUrls((prev) => [...prev, data.url]);
        } else {
          setBrochureUrl(data.url);
        }
      } else {
        alert("Upload failed.");
      }
    } catch (err) {
      console.error(err);
      alert("Error uploading file.");
    } finally {
      setIsUploadingImage(false);
      setIsUploadingPdf(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const payload = {
      name,
      developer,
      corridor,
      city,
      minBudgetLakhs: Number(minBudget),
      maxBudgetLakhs: Number(maxBudget),
      minHorizonYears: Number(minHorizon),
      maxHorizonYears: Number(maxHorizon),
      riskLevel,
      propertyType,
      infraHighlights: infraText.split(",").map((s) => s.trim()).filter(Boolean),
      exitOpportunities: exitText.split(",").map((s) => s.trim()).filter(Boolean),
      comparables: comparablesText.split(",").map((s) => s.trim()).filter(Boolean),
      description,
      brochureUrl,
      imageUrls,
      status,
    };

    try {
      const url = isEdit ? `/api/admin/projects/${initialData?.id}` : "/api/admin/projects";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        router.push("/admin/projects");
        router.refresh();
      } else {
        const errData = await res.json();
        alert(errData.error || "Failed to save project.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const corridors = [
    "Shadnagar Corridor",
    "Pharma City Influence Zone",
    "Sangareddy Industrial Belt",
    "Kokapet / Financial District Extension",
    "Shamshabad / Aerospace SEZ",
    "Yadadri / Outer Ring Road East",
    "Kompally / NH44 Corridor",
    "Adibatla IT Corridor"
  ];

  return (
    <form 
      onSubmit={handleSubmit} 
      className="bg-surface border border-luxury p-6 sm:p-8 rounded-card shadow-sm space-y-6 max-w-3xl w-full text-xs text-text-primary"
    >
      <div className="border-b border-luxury pb-3">
        <h2 className="font-display text-lg font-bold text-primary">
          {isEdit ? "Edit Mapped Project" : "Add New Target Project"}
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Name */}
        <div>
          <label className="block font-semibold uppercase tracking-wider text-text-secondary mb-1">
            Project Name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-luxury-bg border border-luxury px-3 py-2 rounded-input text-xs text-text-primary focus:outline-none focus:border-accent"
            placeholder="e.g. Prestige HighLine"
          />
        </div>

        {/* Developer */}
        <div>
          <label className="block font-semibold uppercase tracking-wider text-text-secondary mb-1">
            Developer Entity
          </label>
          <input
            type="text"
            required
            value={developer}
            onChange={(e) => setDeveloper(e.target.value)}
            className="w-full bg-luxury-bg border border-luxury px-3 py-2 rounded-input text-xs text-text-primary focus:outline-none focus:border-accent"
            placeholder="e.g. Prestige Group"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Corridor */}
        <div>
          <label className="block font-semibold uppercase tracking-wider text-text-secondary mb-1">
            Growth Corridor
          </label>
          <select
            value={corridor}
            onChange={(e) => setCorridor(e.target.value)}
            className="w-full bg-luxury-bg border border-luxury px-3 py-2 rounded-input text-xs text-text-primary focus:outline-none"
          >
            {corridors.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* City */}
        <div>
          <label className="block font-semibold uppercase tracking-wider text-text-secondary mb-1">
            Target City
          </label>
          <input
            type="text"
            required
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full bg-luxury-bg border border-luxury px-3 py-2 rounded-input text-xs text-text-primary focus:outline-none focus:border-accent"
          />
        </div>

        {/* Property Type */}
        <div>
          <label className="block font-semibold uppercase tracking-wider text-text-secondary mb-1">
            Property Type
          </label>
          <select
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
            className="w-full bg-luxury-bg border border-luxury px-3 py-2 rounded-input text-xs text-text-primary focus:outline-none"
          >
            <option value="Plots">Plots</option>
            <option value="Residential">Residential</option>
            <option value="Villa">Villa</option>
            <option value="Commercial">Commercial</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {/* Min Budget */}
        <div>
          <label className="block font-semibold uppercase tracking-wider text-text-secondary mb-1">
            Min Budget (₹ Lakhs)
          </label>
          <input
            type="number"
            required
            value={minBudget}
            onChange={(e) => setMinBudget(Number(e.target.value))}
            className="w-full bg-luxury-bg border border-luxury px-3 py-2 rounded-input text-xs text-text-primary focus:outline-none focus:border-accent"
          />
        </div>

        {/* Max Budget */}
        <div>
          <label className="block font-semibold uppercase tracking-wider text-text-secondary mb-1">
            Max Budget (₹ Lakhs)
          </label>
          <input
            type="number"
            required
            value={maxBudget}
            onChange={(e) => setMaxBudget(Number(e.target.value))}
            className="w-full bg-luxury-bg border border-luxury px-3 py-2 rounded-input text-xs text-text-primary focus:outline-none focus:border-accent"
          />
        </div>

        {/* Min Horizon */}
        <div>
          <label className="block font-semibold uppercase tracking-wider text-text-secondary mb-1">
            Min Horizon (Years)
          </label>
          <input
            type="number"
            required
            value={minHorizon}
            onChange={(e) => setMinHorizon(Number(e.target.value))}
            className="w-full bg-luxury-bg border border-luxury px-3 py-2 rounded-input text-xs text-text-primary focus:outline-none focus:border-accent"
          />
        </div>

        {/* Max Horizon */}
        <div>
          <label className="block font-semibold uppercase tracking-wider text-text-secondary mb-1">
            Max Horizon (Years)
          </label>
          <input
            type="number"
            required
            value={maxHorizon}
            onChange={(e) => setMaxHorizon(Number(e.target.value))}
            className="w-full bg-luxury-bg border border-luxury px-3 py-2 rounded-input text-xs text-text-primary focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Risk Level */}
        <div>
          <label className="block font-semibold uppercase tracking-wider text-text-secondary mb-1">
            Risk Assessment Level
          </label>
          <select
            value={riskLevel}
            onChange={(e) => setRiskLevel(e.target.value as any)}
            className="w-full bg-luxury-bg border border-luxury px-3 py-2 rounded-input text-xs text-text-primary focus:outline-none"
          >
            <option value="LOW">LOW Risk</option>
            <option value="MEDIUM">MEDIUM Risk</option>
            <option value="HIGH">HIGH Risk</option>
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="block font-semibold uppercase tracking-wider text-text-secondary mb-1">
            Project Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full bg-luxury-bg border border-luxury px-3 py-2 rounded-input text-xs text-text-primary focus:outline-none"
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="SOLD_OUT">SOLD OUT</option>
            <option value="UPCOMING">UPCOMING</option>
            <option value="ARCHIVED">ARCHIVED / SOFT-DELETE</option>
          </select>
        </div>
      </div>

      {/* Comma separated listings helpers */}
      <div className="space-y-4">
        <div>
          <label className="block font-semibold uppercase tracking-wider text-text-secondary mb-1">
            Infrastructure Highlights (Comma Separated)
          </label>
          <input
            type="text"
            value={infraText}
            onChange={(e) => setInfraText(e.target.value)}
            className="w-full bg-luxury-bg border border-luxury px-3 py-2 rounded-input text-xs text-text-primary focus:outline-none focus:border-accent"
            placeholder="e.g. Regional Ring Road, MMTS Extension, Metro Line 2"
          />
        </div>

        <div>
          <label className="block font-semibold uppercase tracking-wider text-text-secondary mb-1">
            Exit Opportunities (Comma Separated)
          </label>
          <input
            type="text"
            value={exitText}
            onChange={(e) => setExitText(e.target.value)}
            className="w-full bg-luxury-bg border border-luxury px-3 py-2 rounded-input text-xs text-text-primary focus:outline-none focus:border-accent"
            placeholder="e.g. Corporate Lease, NRI Resale, Plot Subdivision"
          />
        </div>

        <div>
          <label className="block font-semibold uppercase tracking-wider text-text-secondary mb-1">
            Comparable Local Projects (Comma Separated)
          </label>
          <input
            type="text"
            value={comparablesText}
            onChange={(e) => setComparablesText(e.target.value)}
            className="w-full bg-luxury-bg border border-luxury px-3 py-2 rounded-input text-xs text-text-primary focus:outline-none focus:border-accent"
            placeholder="e.g. My Home Avatar, Rajapushpa Summit"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block font-semibold uppercase tracking-wider text-text-secondary mb-1">
          Detailed Description
        </label>
        <textarea
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="w-full bg-luxury-bg border border-luxury p-3 rounded-input text-xs text-text-primary focus:outline-none focus:border-accent resize-y"
          placeholder="Enter project specifications, plot size options, distances to airport or SEZs..."
        />
      </div>

      {/* Uploads Panel */}
      <div className="border-t border-luxury pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Brochure PDF */}
        <div className="border border-luxury p-4 rounded-card bg-luxury-bg/20 space-y-2">
          <label className="block font-semibold uppercase tracking-wider text-text-secondary">
            Brochure PDF Layouts
          </label>
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => handleFileUpload(e, "pdf")}
              className="text-xs text-text-secondary cursor-pointer"
            />
            {isUploadingPdf && <span className="text-[10px] animate-pulse">Uploading...</span>}
          </div>
          {brochureUrl && (
            <p className="text-[10px] text-green-700 font-semibold truncate">
              ✔ Loaded: {brochureUrl}
            </p>
          )}
        </div>

        {/* Project Images */}
        <div className="border border-luxury p-4 rounded-card bg-luxury-bg/20 space-y-2">
          <label className="block font-semibold uppercase tracking-wider text-text-secondary">
            Project Showcase Image
          </label>
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileUpload(e, "image")}
              className="text-xs text-text-secondary cursor-pointer"
            />
            {isUploadingImage && <span className="text-[10px] animate-pulse">Uploading...</span>}
          </div>
          {imageUrls.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {imageUrls.map((url, i) => (
                <span key={i} className="text-[9px] bg-primary text-accent px-2 py-0.5 rounded-tag truncate max-w-[150px]">
                  Image {i+1}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Buttons */}
      <div className="border-t border-luxury pt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => router.push("/admin/projects")}
          className="px-4 py-2 border border-luxury bg-surface hover:bg-luxury-bg text-text-secondary font-semibold rounded-tag"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2 bg-primary hover:bg-primary-light text-surface font-semibold rounded-[4px] disabled:opacity-50"
        >
          {isLoading ? "Saving..." : "Save Project"}
        </button>
      </div>
    </form>
  );
}
