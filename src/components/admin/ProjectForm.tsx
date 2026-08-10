"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Building2, 
  SlidersHorizontal, 
  Sparkles, 
  UploadCloud, 
  CheckCircle2, 
  ArrowLeft, 
  FileText, 
  Image as ImageIcon, 
  Loader2, 
  ChevronDown,
  Layers,
  ShieldCheck,
  Building,
  DollarSign,
  Clock,
  Trash2
} from "lucide-react";

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
        const errData = await res.json().catch(() => ({}));
        alert(`Upload failed: ${errData.error || "Server error"}${errData.details ? " - " + errData.details : ""}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Error uploading file: ${err.message || "Connection failed"}`);
    } finally {
      setIsUploadingImage(false);
      setIsUploadingPdf(false);
    }
  };

  const removeImage = (indexToRemove: number) => {
    setImageUrls((prev) => prev.filter((_, idx) => idx !== indexToRemove));
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
        const errData = await res.json().catch(() => ({}));
        alert(`Failed to save project: ${errData.error || "Failed to save project."}${errData.details ? " - " + errData.details : ""}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`An error occurred: ${err.message || "Connection failed"}`);
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
    <div className="w-full max-w-4xl mx-auto space-y-6">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-[20px] shadow-sm border border-[#EBE7F5]">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#F4F0FF] text-[#5B4FE0] flex items-center justify-center shrink-0">
            <Building2 size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1A1A2E] tracking-tight">
              {isEdit ? "Edit Mapped Project" : "Add New Target Project"}
            </h1>
            <p className="text-xs text-[#8A8A9E] mt-0.5">
              Map property inventory to growth corridors, risk indexes, and AI matching rules.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => router.push("/admin/projects")}
          className="crm-btn-secondary text-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <ArrowLeft size={14} /> Back to Projects
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* SECTION 1: BASIC DETAILS */}
        <div className="bg-white p-6 sm:p-8 rounded-[20px] shadow-sm border border-[#EBE7F5] space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-[#F5F3FB]">
            <Building className="text-[#5B4FE0]" size={18} />
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#1A1A2E]">
              1. Basic Project Identity
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Project Name */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8A8A9E] mb-1.5">
                Project Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="crm-input"
                placeholder="e.g. Prestige HighLine"
              />
            </div>

            {/* Developer */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8A8A9E] mb-1.5">
                Developer Entity <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={developer}
                onChange={(e) => setDeveloper(e.target.value)}
                className="crm-input"
                placeholder="e.g. Prestige Group"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Growth Corridor */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8A8A9E] mb-1.5">
                Growth Corridor
              </label>
              <div className="relative">
                <select
                  value={corridor}
                  onChange={(e) => setCorridor(e.target.value)}
                  className="crm-input appearance-none pr-8 cursor-pointer"
                >
                  {corridors.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-3 text-[#8A8A9E] pointer-events-none" size={14} />
              </div>
            </div>

            {/* Target City */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8A8A9E] mb-1.5">
                Target City
              </label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="crm-input"
                placeholder="e.g. Hyderabad"
              />
            </div>

            {/* Property Type */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8A8A9E] mb-1.5">
                Property Type
              </label>
              <div className="relative">
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  className="crm-input appearance-none pr-8 cursor-pointer"
                >
                  <option value="Plots">Plots</option>
                  <option value="Residential">Residential</option>
                  <option value="Villa">Villa</option>
                  <option value="Commercial">Commercial</option>
                </select>
                <ChevronDown className="absolute right-3 top-3 text-[#8A8A9E] pointer-events-none" size={14} />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: FINANCIAL & HORIZON PARAMETERS */}
        <div className="bg-white p-6 sm:p-8 rounded-[20px] shadow-sm border border-[#EBE7F5] space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-[#F5F3FB]">
            <SlidersHorizontal className="text-[#5B4FE0]" size={18} />
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#1A1A2E]">
              2. Investment & Risk Parameters
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {/* Min Budget */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8A8A9E] mb-1.5">
                Min Budget (₹ Lakhs)
              </label>
              <input
                type="number"
                required
                value={minBudget}
                onChange={(e) => setMinBudget(Number(e.target.value))}
                className="crm-input"
                placeholder="20"
              />
            </div>

            {/* Max Budget */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8A8A9E] mb-1.5">
                Max Budget (₹ Lakhs)
              </label>
              <input
                type="number"
                required
                value={maxBudget}
                onChange={(e) => setMaxBudget(Number(e.target.value))}
                className="crm-input"
                placeholder="50"
              />
            </div>

            {/* Min Horizon */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8A8A9E] mb-1.5">
                Min Horizon (Yrs)
              </label>
              <input
                type="number"
                required
                value={minHorizon}
                onChange={(e) => setMinHorizon(Number(e.target.value))}
                className="crm-input"
                placeholder="3"
              />
            </div>

            {/* Max Horizon */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8A8A9E] mb-1.5">
                Max Horizon (Yrs)
              </label>
              <input
                type="number"
                required
                value={maxHorizon}
                onChange={(e) => setMaxHorizon(Number(e.target.value))}
                className="crm-input"
                placeholder="7"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
            {/* Risk Assessment Level */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8A8A9E] mb-1.5">
                Risk Assessment Level
              </label>
              <div className="relative">
                <select
                  value={riskLevel}
                  onChange={(e) => setRiskLevel(e.target.value as any)}
                  className="crm-input appearance-none pr-8 cursor-pointer"
                >
                  <option value="LOW">LOW Risk</option>
                  <option value="MEDIUM">MEDIUM Risk</option>
                  <option value="HIGH">HIGH Risk</option>
                </select>
                <ChevronDown className="absolute right-3 top-3 text-[#8A8A9E] pointer-events-none" size={14} />
              </div>
            </div>

            {/* Project Status */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8A8A9E] mb-1.5">
                Project Status
              </label>
              <div className="relative">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="crm-input appearance-none pr-8 cursor-pointer"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="SOLD_OUT">SOLD OUT</option>
                  <option value="UPCOMING">UPCOMING</option>
                  <option value="ARCHIVED">ARCHIVED / SOFT-DELETE</option>
                </select>
                <ChevronDown className="absolute right-3 top-3 text-[#8A8A9E] pointer-events-none" size={14} />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: CATALYSTS & HIGHLIGHTS */}
        <div className="bg-white p-6 sm:p-8 rounded-[20px] shadow-sm border border-[#EBE7F5] space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-[#F5F3FB]">
            <Sparkles className="text-[#5B4FE0]" size={18} />
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#1A1A2E]">
              3. Highlights, Exit Routes & Description
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8A8A9E] mb-1.5">
                Infrastructure Highlights (Comma Separated)
              </label>
              <input
                type="text"
                value={infraText}
                onChange={(e) => setInfraText(e.target.value)}
                className="crm-input"
                placeholder="e.g. Regional Ring Road, MMTS Extension, Metro Line 2"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8A8A9E] mb-1.5">
                Exit Opportunities (Comma Separated)
              </label>
              <input
                type="text"
                value={exitText}
                onChange={(e) => setExitText(e.target.value)}
                className="crm-input"
                placeholder="e.g. Corporate Lease, NRI Resale, Plot Subdivision"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8A8A9E] mb-1.5">
                Comparable Local Projects (Comma Separated)
              </label>
              <input
                type="text"
                value={comparablesText}
                onChange={(e) => setComparablesText(e.target.value)}
                className="crm-input"
                placeholder="e.g. My Home Avatar, Rajapushpa Summit"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8A8A9E] mb-1.5">
                Detailed Description <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="crm-input resize-y"
                placeholder="Enter project specifications, plot size options, distances to airport or SEZs..."
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: MEDIA & ATTACHMENTS */}
        <div className="bg-white p-6 sm:p-8 rounded-[20px] shadow-sm border border-[#EBE7F5] space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-[#F5F3FB]">
            <UploadCloud className="text-[#5B4FE0]" size={18} />
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#1A1A2E]">
              4. Media & Brochure Attachments
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Brochure PDF */}
            <div className="bg-[#F9F8FD] border border-dashed border-[#CBD5E1] hover:border-[#7C6EF5] p-5 rounded-2xl transition-all space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white text-[#5B4FE0] flex items-center justify-center shadow-sm">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#1A1A2E]">Brochure PDF Layout</h3>
                  <p className="text-[10px] text-[#8A8A9E]">Upload property masterplan or brochure PDF</p>
                </div>
              </div>

              <div className="pt-1">
                <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-[#EBE7F5] text-xs font-semibold text-[#5B4FE0] hover:bg-[#F4F0FF] cursor-pointer transition-all shadow-sm">
                  <UploadCloud size={14} />
                  <span>{isUploadingPdf ? "Uploading PDF..." : "Choose PDF File"}</span>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => handleFileUpload(e, "pdf")}
                    className="hidden"
                  />
                </label>
              </div>

              {brochureUrl && (
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-bold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 truncate">
                  <CheckCircle2 size={13} className="shrink-0" />
                  <span className="truncate">Loaded: {brochureUrl}</span>
                </div>
              )}
            </div>

            {/* Showcase Images */}
            <div className="bg-[#F9F8FD] border border-dashed border-[#CBD5E1] hover:border-[#7C6EF5] p-5 rounded-2xl transition-all space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white text-[#5B4FE0] flex items-center justify-center shadow-sm">
                  <ImageIcon size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#1A1A2E]">Showcase Gallery Images</h3>
                  <p className="text-[10px] text-[#8A8A9E]">Upload high-res property rendering photos</p>
                </div>
              </div>

              <div className="pt-1">
                <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-[#EBE7F5] text-xs font-semibold text-[#5B4FE0] hover:bg-[#F4F0FF] cursor-pointer transition-all shadow-sm">
                  <UploadCloud size={14} />
                  <span>{isUploadingImage ? "Uploading Image..." : "Add Image File"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, "image")}
                    className="hidden"
                  />
                </label>
              </div>

              {imageUrls.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {imageUrls.map((url, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-white border border-[#EBE7F5] px-2.5 py-1 rounded-lg shadow-sm text-[11px] text-[#1A1A2E] font-medium">
                      <span>Image #{i + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SUBMIT ACTIONS BAR */}
        <div className="bg-white p-5 rounded-[20px] shadow-sm border border-[#EBE7F5] flex items-center justify-between gap-4 sticky bottom-6 z-20 backdrop-blur-md">
          <button
            type="button"
            onClick={() => router.push("/admin/projects")}
            className="crm-btn-secondary text-xs px-6 py-2.5"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isLoading}
            className="crm-btn-primary text-xs px-8 py-2.5 font-bold shadow-md flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" size={15} /> Saving Project...
              </>
            ) : (
              <>
                <CheckCircle2 size={15} /> Save Target Project
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}
