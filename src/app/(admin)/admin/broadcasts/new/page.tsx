"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft,
  Users,
  Compass,
  MessageSquare,
  Mail,
  Eye,
  Send,
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Megaphone
} from "lucide-react";

interface LeadPreview {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

interface TemplateOption {
  id: string;
  name: string;
  message?: string;
  subject?: string;
  body?: string;
}

export default function NewBroadcastWizardPage() {
  const router = useRouter();
  
  // Wizard steps: 1 (Audience), 2 (Channel), 3 (Message), 4 (Confirm & Dispatch), 5 (Live sending progress)
  const [step, setStep] = useState(1);
  
  // State for Step 1: Audience
  const [groupType, setGroupType] = useState<string>("ALL_LEADS");
  const [filters, setFilters] = useState({
    persona: "",
    status: "",
    stageKey: "",
    grade: "",
    corridor: "",
    minBudget: "",
    maxBudget: "",
    leadIds: "",
  });

  // Preview data
  const [previewLoading, setPreviewLoading] = useState(false);
  const [totalLeads, setTotalLeads] = useState(0);
  const [skippedOptOut, setSkippedOptOut] = useState(0);
  const [skippedMissingContact, setSkippedMissingContact] = useState(0);
  const [recipientCount, setRecipientCount] = useState(0);
  const [sampleLead, setSampleLead] = useState<any>(null);
  const [leadsList, setLeadsList] = useState<LeadPreview[]>([]);

  // State for Step 2: Channel
  const [channel, setChannel] = useState<"WHATSAPP" | "EMAIL" | "BOTH">("BOTH");

  // State for Step 3: Message & Template
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [whatsappMessage, setWhatsappMessage] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [templatesLoading, setTemplatesLoading] = useState(false);

  // State for Step 4: Campaign Details & Timing
  const [campaignName, setCampaignName] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdBroadcastId, setCreatedBroadcastId] = useState<string | null>(null);

  // State for Step 5: Live sending progress
  const [progressStatus, setProgressStatus] = useState<string>("SENDING");
  const [recipientsStatusList, setRecipientsStatusList] = useState<any[]>([]);
  const [sendingStats, setSendingStats] = useState<any>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize query parameters if redirected from shortcuts
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const paramGroupType = searchParams.get("groupType");
    const paramLeadIds = searchParams.get("leadIds");
    const paramPersona = searchParams.get("persona");
    const paramCorridor = searchParams.get("corridor");

    if (paramGroupType) {
      setGroupType(paramGroupType);
    }
    if (paramLeadIds || paramPersona || paramCorridor) {
      setFilters(prev => ({
        ...prev,
        leadIds: paramLeadIds || "",
        persona: paramPersona || "",
        corridor: paramCorridor || "",
      }));
    }
  }, []);

  // Fetch preview count whenever filters or channel changes
  useEffect(() => {
    if (step === 1 || step === 2) {
      fetchPreview();
    }
  }, [groupType, filters, channel]);

  // Fetch templates when channel changes or when moving to Step 3
  useEffect(() => {
    if (step === 3) {
      fetchTemplates();
    }
  }, [step, channel]);

  const fetchPreview = async () => {
    setPreviewLoading(true);
    try {
      const queryParams = new URLSearchParams({
        groupType,
        channel,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v !== "")
        )
      });
      const res = await fetch(`/api/admin/broadcasts/groups/preview?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTotalLeads(data.totalLeads || 0);
        setSkippedOptOut(data.skippedOptOut || 0);
        setSkippedMissingContact(data.skippedMissingContact || 0);
        setRecipientCount(data.recipientCount || 0);
        setSampleLead(data.sampleLead || null);
        setLeadsList(data.leadsList || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPreviewLoading(false);
    }
  };

  const fetchTemplates = async () => {
    setTemplatesLoading(true);
    try {
      const endpoint = channel === "EMAIL" 
        ? "/api/admin/broadcasts/templates/email"
        : "/api/admin/broadcasts/templates/whatsapp";

      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTemplatesLoading(false);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) {
      setWhatsappMessage("");
      setEmailSubject("");
      setEmailBody("");
      return;
    }

    const t = templates.find(item => item.id === templateId);
    if (!t) return;

    if (channel === "EMAIL") {
      setEmailSubject(t.subject || "");
      setEmailBody(t.body || "");
    } else {
      setWhatsappMessage(t.message || "");
    }
  };

  // Helper client-side tag interpolation for live preview
  const getPreviewText = (text: string) => {
    if (!text) return "";
    const name = sampleLead?.name || "John Doe";
    const budget = sampleLead?.budget ? `₹${sampleLead.budget.toLocaleString()}` : "₹1.5 Cr";
    
    return text
      .replace(/\{\{lead_name\}\}/g, name)
      .replace(/\{\{budget\}\}/g, budget)
      .replace(/\{\{horizon\}\}/g, "Immediate")
      .replace(/\{\{city\}\}/g, "Whitefield, Bangalore")
      .replace(/\{\{agent_name\}\}/g, "Sravan")
      .replace(/\{\{project_name\}\}/g, "Urban Prime Towers")
      .replace(/\{\{project_price\}\}/g, "₹1.85 Cr");
  };

  const handleFilterChange = (field: string, val: string) => {
    setFilters(prev => ({ ...prev, [field]: val }));
  };

  const handleCreateBroadcast = async () => {
    if (!campaignName.trim()) {
      alert("Please name this campaign.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: campaignName,
        channel,
        templateId: selectedTemplateId || null,
        emailSubject: channel !== "WHATSAPP" ? emailSubject : null,
        emailBody: channel !== "WHATSAPP" ? emailBody : null,
        whatsappMessage: channel !== "EMAIL" ? whatsappMessage : null,
        groupType,
        groupFilters: filters,
        leadsList,
        scheduledAt: scheduleTime ? new Date(scheduleTime).toISOString() : null
      };

      const res = await fetch("/api/admin/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        setCreatedBroadcastId(data.broadcastId);
        
        if (scheduleTime) {
          // If scheduled, redirect to history page
          router.push("/admin/broadcasts/history");
        } else {
          // If sending now, go to live progress screen
          setStep(5);
          startProgressPolling(data.broadcastId);
        }
      } else {
        const data = await res.json();
        alert(`Failed to create campaign: ${data.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred during submission.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const startProgressPolling = (broadcastId: string) => {
    // Poll immediately
    pollStatus(broadcastId);
    
    // Poll every 2 seconds
    pollIntervalRef.current = setInterval(() => {
      pollStatus(broadcastId);
    }, 2000);
  };

  const pollStatus = async (broadcastId: string) => {
    try {
      const [statusRes, recipientsRes] = await Promise.all([
        fetch(`/api/admin/broadcasts/${broadcastId}`),
        fetch(`/api/admin/broadcasts/${broadcastId}/recipients`)
      ]);

      if (statusRes.ok && recipientsRes.ok) {
        const statusData = await statusRes.json();
        const recipientsData = await recipientsRes.json();
        
        setSendingStats(statusData.stats);
        setProgressStatus(statusData.broadcast.status);
        setRecipientsStatusList(recipientsData.recipients || []);

        // Stop polling if complete or failed
        if (statusData.broadcast.status === "SENT" || statusData.broadcast.status === "FAILED") {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
          }
        }
      }
    } catch (err) {
      console.error("Polling error", err);
    }
  };

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Compute validation
  const canNext = () => {
    if (step === 1) return recipientCount > 0 && !previewLoading;
    if (step === 2) return true;
    if (step === 3) {
      if (channel === "WHATSAPP") return whatsappMessage.trim().length > 0;
      if (channel === "EMAIL") return emailSubject.trim().length > 0 && emailBody.trim().length > 0;
      return whatsappMessage.trim().length > 0 && emailSubject.trim().length > 0 && emailBody.trim().length > 0;
    }
    return true;
  };

  // Live progress helpers
  const getProcessedCount = () => {
    if (!recipientsStatusList.length) return 0;
    return recipientsStatusList.filter(r => {
      const isWaOk = channel !== "EMAIL" ? (r.whatsappStatus !== "PENDING" && r.whatsappStatus !== null) : true;
      const isEmailOk = channel !== "WHATSAPP" ? (r.emailStatus !== "PENDING" && r.emailStatus !== null) : true;
      return isWaOk && isEmailOk;
    }).length;
  };

  const getSuccessCount = () => {
    if (!recipientsStatusList.length) return 0;
    return recipientsStatusList.filter(r => {
      const isWaOk = channel !== "EMAIL" ? r.whatsappStatus === "SENT" || r.whatsappStatus === "DELIVERED" || r.whatsappStatus === "READ" : true;
      const isEmailOk = channel !== "WHATSAPP" ? r.emailStatus === "SENT" || r.emailStatus === "DELIVERED" || r.emailStatus === "OPENED" || r.emailStatus === "CLICKED" : true;
      return isWaOk && isEmailOk;
    }).length;
  };

  const getFailedCount = () => {
    if (!recipientsStatusList.length) return 0;
    return recipientsStatusList.filter(r => {
      const isWaFailed = channel !== "EMAIL" ? r.whatsappStatus === "FAILED" : false;
      const isEmailFailed = channel !== "WHATSAPP" ? r.emailStatus === "FAILED" || r.emailStatus === "BOUNCED" : false;
      return isWaFailed || isEmailFailed;
    }).length;
  };

  const getProgressPercentage = () => {
    if (recipientCount === 0) return 0;
    return Math.min(100, Math.round((getProcessedCount() / recipientCount) * 100));
  };

  return (
    <div className="space-y-6 flex-grow flex flex-col max-w-4xl mx-auto w-full">
      {/* Navigation Headers */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/admin/broadcasts" className="hover:text-primary transition-colors flex items-center gap-1">
          <ArrowLeft size={12} /> Broadcast Center
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-semibold">New Campaign</span>
      </div>

      {step < 5 && (
        <div className="flex justify-between items-center bg-white border border-slate-200 px-6 py-4 rounded shadow-sm">
          <h1 className="font-display text-lg font-bold text-slate-900">
            Create Bulk Broadcast Campaign
          </h1>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span className={`px-2 py-0.5 rounded ${step === 1 ? "bg-blue-100 text-blue-700" : "bg-slate-100"}`}>1. Target</span>
            <span className={`px-2 py-0.5 rounded ${step === 2 ? "bg-blue-100 text-blue-700" : "bg-slate-100"}`}>2. Channel</span>
            <span className={`px-2 py-0.5 rounded ${step === 3 ? "bg-blue-100 text-blue-700" : "bg-slate-100"}`}>3. Content</span>
            <span className={`px-2 py-0.5 rounded ${step === 4 ? "bg-blue-100 text-blue-700" : "bg-slate-100"}`}>4. Dispatch</span>
          </div>
        </div>
      )}

      {/* STEP 1: Target Audience Selection */}
      {step === 1 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white border border-slate-200 p-6 rounded shadow-sm space-y-6">
            <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
              Step 1: Select Recipient Group
            </h2>

            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="block font-bold text-slate-500 uppercase tracking-wider">Group Type</label>
                <select
                  value={groupType}
                  onChange={(e) => {
                    setGroupType(e.target.value);
                    setFilters({
                      persona: "",
                      status: "",
                      stageKey: "",
                      grade: "",
                      corridor: "",
                      minBudget: "",
                      maxBudget: "",
                      leadIds: "",
                    });
                  }}
                  className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded text-xs focus:outline-none focus:border-blue-600"
                >
                  <option value="ALL_LEADS">All Leads (Everyone)</option>
                  <option value="PERSONA">By Buyer Persona</option>
                  <option value="LEAD_STATUS">By CRM Lead Status</option>
                  <option value="PIPELINE_STAGE">By Active Pipeline Stage</option>
                  <option value="SCORE_GRADE">By Lead Score Grade</option>
                  <option value="CORRIDOR_INTEREST">By Corridor Interest</option>
                  <option value="BUDGET_RANGE">By Budget Range</option>
                  <option value="MANUAL_PICK">Manual Pick (Comma Separated IDs)</option>
                </select>
              </div>

              {/* Dynamic Filter Selectors */}
              {groupType === "PERSONA" && (
                <div className="space-y-1">
                  <label className="block font-bold text-slate-500 uppercase tracking-wider">Select Persona</label>
                  <select
                    value={filters.persona}
                    onChange={(e) => handleFilterChange("persona", e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded text-xs focus:outline-none focus:border-blue-600"
                  >
                    <option value="">-- Select Persona --</option>
                    <option value="SELECTIVE_NRI">Selective NRI</option>
                    <option value="HIGH_YIELD_SEEKER">High Yield Seeker</option>
                    <option value="FIRST_TIME_BUYER">First Time Buyer</option>
                    <option value="DIVERSIFIED_ALLOCATOR">Diversified Allocator</option>
                    <option value="LEGACY_PLANNER">Legacy Planner</option>
                  </select>
                </div>
              )}

              {groupType === "LEAD_STATUS" && (
                <div className="space-y-1">
                  <label className="block font-bold text-slate-500 uppercase tracking-wider">Select Lead Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange("status", e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded text-xs focus:outline-none focus:border-blue-600"
                  >
                    <option value="">-- Select Status --</option>
                    <option value="NEW">New</option>
                    <option value="CONTACTED">Contacted</option>
                    <option value="QUALIFIED">Qualified</option>
                    <option value="PROPOSAL_SENT">Proposal Dispatched</option>
                    <option value="NEGOTIATING">Negotiation</option>
                    <option value="WON">Won (Customer)</option>
                    <option value="LOST">Lost</option>
                  </select>
                </div>
              )}

              {groupType === "PIPELINE_STAGE" && (
                <div className="space-y-1">
                  <label className="block font-bold text-slate-500 uppercase tracking-wider">Select active roadmap stage</label>
                  <select
                    value={filters.stageKey}
                    onChange={(e) => handleFilterChange("stageKey", e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded text-xs focus:outline-none focus:border-blue-600"
                  >
                    <option value="">-- Select Roadmap Stage --</option>
                    <option value="INITIAL_CONTACT">Initial Contact</option>
                    <option value="NEEDS_ASSESSMENT">Needs Assessment</option>
                    <option value="PROJECT_MATCHING">Project Matching</option>
                    <option value="SITE_VISIT">Site Visit</option>
                    <option value="PROPOSAL_N_NEGOTIATION">Proposal & Negotiation</option>
                    <option value="CLOSING">Closing</option>
                  </select>
                </div>
              )}

              {groupType === "SCORE_GRADE" && (
                <div className="space-y-1">
                  <label className="block font-bold text-slate-500 uppercase tracking-wider">Select Score Grade</label>
                  <select
                    value={filters.grade}
                    onChange={(e) => handleFilterChange("grade", e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded text-xs focus:outline-none focus:border-blue-600"
                  >
                    <option value="">-- Select Grade --</option>
                    <option value="A">Grade A (Hot Lead)</option>
                    <option value="B">Grade B (Warm Lead)</option>
                    <option value="C">Grade C (Cool Lead)</option>
                    <option value="D">Grade D (Low Priority)</option>
                  </select>
                </div>
              )}

              {groupType === "CORRIDOR_INTEREST" && (
                <div className="space-y-1">
                  <label className="block font-bold text-slate-500 uppercase tracking-wider">Search/Type Corridor Interest</label>
                  <select
                    value={filters.corridor}
                    onChange={(e) => handleFilterChange("corridor", e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded text-xs focus:outline-none focus:border-blue-600"
                  >
                    <option value="">-- Select Corridor --</option>
                    <option value="North Bangalore">North Bangalore (Hebbal, Devanahalli)</option>
                    <option value="East Bangalore">East Bangalore (Whitefield, Varthur)</option>
                    <option value="Sarjapur Road">Sarjapur Road / ORR</option>
                    <option value="South Bangalore">South Bangalore (Kanakapura, JP Nagar)</option>
                  </select>
                </div>
              )}

              {groupType === "BUDGET_RANGE" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-500 uppercase tracking-wider">Min Budget (₹ Cr)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 1.0"
                      value={filters.minBudget}
                      onChange={(e) => handleFilterChange("minBudget", e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2 rounded text-xs focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-500 uppercase tracking-wider">Max Budget (₹ Cr)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 3.0"
                      value={filters.maxBudget}
                      onChange={(e) => handleFilterChange("maxBudget", e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2 rounded text-xs focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {groupType === "MANUAL_PICK" && (
                <div className="space-y-1">
                  <label className="block font-bold text-slate-500 uppercase tracking-wider">Comma Separated Lead IDs</label>
                  <textarea
                    placeholder="e.g. clh378y1d00003b6g7hjkw9ls, clh378y1d00013b6g8qjkw9la"
                    value={filters.leadIds}
                    onChange={(e) => handleFilterChange("leadIds", e.target.value)}
                    rows={4}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded text-xs font-mono focus:outline-none"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right Preview Side panel */}
          <div className="bg-white border border-slate-200 p-6 rounded shadow-sm space-y-6 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                Live Group Preview
              </h3>

              {previewLoading ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-500 space-y-2">
                  <Loader2 size={24} className="animate-spin text-blue-600" />
                  <span className="text-[10px] uppercase font-bold tracking-wider">Calculating segment...</span>
                </div>
              ) : (
                <div className="py-4 space-y-4 text-xs">
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-55">
                    <span className="text-slate-500 font-medium">Total Matches:</span>
                    <strong className="text-slate-800">{totalLeads} leads</strong>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-slate-55 text-red-600">
                    <span className="font-medium flex items-center gap-1">Opted Out:</span>
                    <span className="font-semibold">-{skippedOptOut}</span>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-slate-55 text-orange-600">
                    <span className="font-medium flex items-center gap-1">Missing Contact Details:</span>
                    <span className="font-semibold">-{skippedMissingContact}</span>
                  </div>

                  <div className="flex justify-between items-center py-3 bg-blue-50/50 px-3 rounded border border-blue-100/50 mt-4 text-sm">
                    <span className="text-blue-900 font-bold uppercase tracking-wider text-[10px]">Ready to Broadcast:</span>
                    <strong className="text-blue-700 text-lg">{recipientCount}</strong>
                  </div>

                  {sampleLead && (
                    <div className="mt-4 p-3 bg-slate-50 rounded border border-slate-200/50 text-[10px] space-y-1">
                      <span className="font-bold text-slate-500 block uppercase tracking-wider">Sample Recipient:</span>
                      <div className="text-slate-800 font-semibold">{sampleLead.name}</div>
                      <div className="text-slate-500">{sampleLead.email || "No email"} | {sampleLead.phone || "No phone"}</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!canNext()}
              className="w-full flex items-center justify-center gap-1 px-4 py-2.5 bg-[#2563EB] disabled:opacity-40 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded transition-all shadow-sm"
            >
              Continue to Channel <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Channel Selection */}
      {step === 2 && (
        <div className="bg-white border border-slate-200 p-6 rounded shadow-sm space-y-6">
          <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
            Step 2: Select Communication Channels
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button
              onClick={() => setChannel("BOTH")}
              className={`p-6 border-2 rounded text-left flex flex-col justify-between space-y-4 transition-all ${
                channel === "BOTH" 
                  ? "border-blue-600 bg-blue-50/30" 
                  : "border-slate-200 hover:border-slate-350"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="p-2 bg-blue-100 text-blue-700 rounded"><Megaphone size={20} /></span>
                <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${channel === "BOTH" ? "border-blue-600 bg-blue-600" : "border-slate-300"}`}>
                  {channel === "BOTH" && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                </span>
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-800">Email & WhatsApp Campaign</h3>
                <p className="text-xs text-slate-500 mt-1">Simultaneously dispatch to email addresses and phone numbers. Reaches leads everywhere.</p>
              </div>
            </button>

            <button
              onClick={() => setChannel("WHATSAPP")}
              className={`p-6 border-2 rounded text-left flex flex-col justify-between space-y-4 transition-all ${
                channel === "WHATSAPP" 
                  ? "border-blue-600 bg-blue-50/30" 
                  : "border-slate-200 hover:border-slate-350"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="p-2 bg-green-100 text-green-700 rounded"><MessageSquare size={20} /></span>
                <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${channel === "WHATSAPP" ? "border-blue-600 bg-blue-600" : "border-slate-300"}`}>
                  {channel === "WHATSAPP" && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                </span>
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-800">WhatsApp Only</h3>
                <p className="text-xs text-slate-500 mt-1">Send a direct message via WhatsApp (requires phone number). Ideal for immediate engagement.</p>
              </div>
            </button>

            <button
              onClick={() => setChannel("EMAIL")}
              className={`p-6 border-2 rounded text-left flex flex-col justify-between space-y-4 transition-all ${
                channel === "EMAIL" 
                  ? "border-blue-600 bg-blue-50/30" 
                  : "border-slate-200 hover:border-slate-350"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="p-2 bg-purple-100 text-purple-700 rounded"><Mail size={20} /></span>
                <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${channel === "EMAIL" ? "border-blue-600 bg-blue-600" : "border-slate-300"}`}>
                  {channel === "EMAIL" && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                </span>
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-800">Email Only</h3>
                <p className="text-xs text-slate-500 mt-1">Deliver email campaigns to registered mailboxes. Perfect for announcements or newsletters.</p>
              </div>
            </button>
          </div>

          {(skippedOptOut > 0 || skippedMissingContact > 0) && (
            <div className="bg-orange-50 border border-orange-200 p-4 rounded text-xs text-orange-800 flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-bold">Contact Segment Constraints Notice:</span>
                <p className="mt-0.5 leading-relaxed">
                  Based on your channel selection, some leads will be skipped:
                  {skippedOptOut > 0 && <span className="block mt-1">• {skippedOptOut} leads chose to opt-out of these campaign channels.</span>}
                  {skippedMissingContact > 0 && <span className="block mt-0.5">• {skippedMissingContact} leads are missing valid contact info matching this choice.</span>}
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-6 border-t border-slate-100">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-1 px-4 py-2 border border-slate-200 rounded text-xs font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-50"
            >
              <ChevronLeft size={14} /> Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!canNext()}
              className="flex items-center gap-1 px-5 py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded transition-colors"
            >
              Continue to Content <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Message & Template Selection */}
      {step === 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white border border-slate-200 p-6 rounded shadow-sm space-y-6">
            <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
              Step 3: Setup Campaign Content
            </h2>

            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="block font-bold text-slate-500 uppercase tracking-wider">Choose Existing Template (Optional)</label>
                {templatesLoading ? (
                  <div className="h-9 bg-slate-50 border border-slate-200 rounded animate-pulse" />
                ) : (
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => handleTemplateSelect(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded text-xs focus:outline-none focus:border-blue-600"
                  >
                    <option value="">-- Choose Template or Write Custom --</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {(channel === "WHATSAPP" || channel === "BOTH") && (
                <div className="space-y-1 border-t border-slate-100 pt-4">
                  <label className="block font-bold text-slate-500 uppercase tracking-wider">WhatsApp Message Body</label>
                  <textarea
                    placeholder="Hi {{lead_name}}, this is custom WhatsApp content..."
                    value={whatsappMessage}
                    onChange={(e) => setWhatsappMessage(e.target.value)}
                    rows={5}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded text-xs font-mono focus:outline-none"
                    required
                  />
                  <p className="text-[10px] text-slate-400">Supports merge tags: {"{{lead_name}}"}, {"{{budget}}"}, {"{{project_name}}"}, etc.</p>
                </div>
              )}

              {(channel === "EMAIL" || channel === "BOTH") && (
                <div className="space-y-3 border-t border-slate-100 pt-4">
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-500 uppercase tracking-wider">Email Subject</label>
                    <input
                      type="text"
                      placeholder=" Bangalore Investment Opportunities"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2 rounded text-xs focus:outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-bold text-slate-500 uppercase tracking-wider">Email Body (HTML format)</label>
                    <textarea
                      placeholder="<p>Dear {{lead_name}},</p><p>Check out our Bangalore listings...</p>"
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      rows={6}
                      className="w-full bg-slate-50 border border-slate-200 p-3 rounded text-xs font-mono focus:outline-none"
                      required
                    />
                    <p className="text-[10px] text-slate-400">Supports HTML tags and merge tags.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Live Preview Side panel */}
          <div className="bg-white border border-slate-200 p-6 rounded shadow-sm flex flex-col justify-between space-y-6">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1">
                <Eye size={12} /> Live Render Preview
              </h3>

              <div className="py-4 space-y-4 max-h-[400px] overflow-y-auto pr-1">
                {channel !== "EMAIL" && (
                  <div className="space-y-1 text-xs">
                    <span className="font-bold text-slate-500 block uppercase tracking-wider text-[9px]">WhatsApp Template Render:</span>
                    <div className="p-3 bg-green-50/50 rounded border border-green-200/50 font-mono text-[10px] whitespace-pre-line text-slate-800 shadow-inner">
                      {whatsappMessage ? getPreviewText(whatsappMessage) : <span className="text-slate-400 italic">No WhatsApp text entered.</span>}
                    </div>
                  </div>
                )}

                {channel !== "WHATSAPP" && (
                  <div className="space-y-2 text-xs">
                    <span className="font-bold text-slate-500 block uppercase tracking-wider text-[9px]">Email Template Render:</span>
                    <div className="p-3 bg-purple-50/50 rounded border border-purple-200/50 text-[10px] text-slate-800 space-y-2 shadow-inner">
                      <div className="border-b border-slate-200 pb-1.5 font-bold">
                        Subject: <span className="font-normal font-sans text-slate-700">{emailSubject ? getPreviewText(emailSubject) : <span className="text-slate-400 italic">No subject.</span>}</span>
                      </div>
                      <div className="font-mono text-[9px] max-h-36 overflow-y-auto whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: emailBody ? getPreviewText(emailBody) : "<span class='text-slate-400 italic'>No body content.</span>" }} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep(2)}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 border border-slate-200 rounded text-xs font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-50"
              >
                Back
              </button>
              <button
                onClick={() => setStep(4)}
                disabled={!canNext()}
                className="flex-1 flex items-center justify-center gap-1 px-4 py-2.5 bg-[#2563EB] disabled:opacity-40 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded transition-all shadow-sm"
              >
                Continue <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: Summary & Dispatch */}
      {step === 4 && (
        <div className="bg-white border border-slate-200 p-6 rounded shadow-sm space-y-6">
          <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
            Step 4: Campaign Details & Execution
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="block font-bold text-slate-500 uppercase tracking-wider">Campaign Name</label>
                <input
                  type="text"
                  placeholder="e.g. Bangalore Investors Newsletter - Q3"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded text-xs focus:outline-none focus:border-blue-600 font-semibold"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Calendar size={12} /> Schedule Send Time (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded text-xs focus:outline-none"
                />
                <p className="text-[10px] text-slate-400">Leave blank to dispatch immediately.</p>
              </div>
            </div>

            <div className="bg-slate-50 p-5 border border-slate-200 rounded space-y-3">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[9px] block">Broadcast Configuration Summary</span>
              
              <div className="flex justify-between py-1 border-b border-slate-200/50">
                <span className="text-slate-500">Target Group:</span>
                <span className="font-semibold text-slate-800 uppercase tracking-wider text-[10px]">{groupType.replace(/_/g, " ")}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/50">
                <span className="text-slate-500">Recipient Count:</span>
                <span className="font-semibold text-slate-800">{recipientCount} leads</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/50">
                <span className="text-slate-500">Channel:</span>
                <span className="font-semibold text-blue-600 font-sans tracking-wide">{channel}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Timing:</span>
                <span className="font-semibold text-slate-800">
                  {scheduleTime ? `Scheduled at ${new Date(scheduleTime).toLocaleString()}` : "Immediate (Send Now)"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-6 border-t border-slate-100">
            <button
              onClick={() => setStep(3)}
              className="flex items-center gap-1 px-4 py-2 border border-slate-200 rounded text-xs font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-50"
            >
              <ChevronLeft size={14} /> Back
            </button>
            
            <button
              onClick={handleCreateBroadcast}
              disabled={isSubmitting || !campaignName.trim()}
              className="flex items-center justify-center gap-1.5 px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded transition-colors shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Scheduling...
                </>
              ) : (
                <>
                  <Send size={14} /> {scheduleTime ? "Schedule Broadcast" : "Dispatch Campaign Now"}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: Real-time Dispatch Progress Screen */}
      {step === 5 && (
        <div className="bg-white border border-slate-200 p-6 rounded shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-slate-800">
                Campaign Dispatch Engine Active
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Campaign Name: <span className="font-semibold text-slate-700">{campaignName}</span></p>
            </div>
            
            <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
              progressStatus === "SENT" 
                ? "bg-green-100 text-green-700 border border-green-200"
                : progressStatus === "FAILED"
                ? "bg-red-100 text-red-700 border border-red-200"
                : "bg-blue-50 text-blue-700 border border-blue-200 animate-pulse"
            }`}>
              {progressStatus}
            </span>
          </div>

          {/* Progress Bar & Counter Cards */}
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-slate-500">Overall Delivery Completion:</span>
                <span className="text-blue-600">{getProgressPercentage()}% ({getProcessedCount()} / {recipientCount})</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200/50">
                <div 
                  className="bg-blue-600 h-full rounded-full transition-all duration-550 ease-out" 
                  style={{ width: `${getProgressPercentage()}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-slate-50 p-4 border border-slate-250 rounded">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Dispatched</span>
                <div className="text-xl font-bold text-slate-700 mt-1">{getProcessedCount()}</div>
              </div>
              <div className="bg-green-50/50 p-4 border border-green-200/50 rounded">
                <span className="text-[10px] text-green-600 font-bold uppercase tracking-wider">Succeeded</span>
                <div className="text-xl font-bold text-green-700 mt-1">{getSuccessCount()}</div>
              </div>
              <div className="bg-red-50/50 p-4 border border-red-200/50 rounded">
                <span className="text-[10px] text-red-600 font-bold uppercase tracking-wider">Failed</span>
                <div className="text-xl font-bold text-red-700 mt-1">{getFailedCount()}</div>
              </div>
            </div>
          </div>

          {/* Live Recipient Status Logs */}
          <div className="space-y-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Live Delivery Audit Logs</span>
            <div className="border border-slate-200 rounded max-h-60 overflow-y-auto divide-y divide-slate-100 bg-slate-50/50 font-mono text-[10px]">
              {recipientsStatusList.length === 0 ? (
                <div className="p-4 text-center text-slate-400 italic">Initiating recipient dispatches...</div>
              ) : (
                recipientsStatusList.map((r) => {
                  const isWaPending = r.whatsappStatus === "PENDING";
                  const isEmailPending = r.emailStatus === "PENDING";
                  
                  const isWaFailed = r.whatsappStatus === "FAILED";
                  const isEmailFailed = r.emailStatus === "FAILED" || r.emailStatus === "BOUNCED";

                  const failed = isWaFailed || isEmailFailed;
                  const pending = isWaPending || isEmailPending;

                  return (
                    <div key={r.id} className="p-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-2">
                        {failed ? (
                          <XCircle size={12} className="text-red-500 flex-shrink-0" />
                        ) : pending ? (
                          <Loader2 size={12} className="text-blue-500 animate-spin flex-shrink-0" />
                        ) : (
                          <CheckCircle2 size={12} className="text-green-500 flex-shrink-0" />
                        )}
                        <span className="font-semibold text-slate-700">{r.lead?.name || "Lead"}</span>
                      </div>
                      
                      <div className="flex items-center gap-3 text-[9px] text-slate-400">
                        {channel !== "EMAIL" && (
                          <span className={r.whatsappStatus === "SENT" ? "text-green-600 font-bold" : r.whatsappStatus === "FAILED" ? "text-red-500" : ""}>
                            WA: {r.whatsappStatus || "N/A"}
                          </span>
                        )}
                        {channel !== "WHATSAPP" && (
                          <span className={r.emailStatus === "SENT" ? "text-green-600 font-bold" : r.emailStatus === "FAILED" || r.emailStatus === "BOUNCED" ? "text-red-500" : ""}>
                            Email: {r.emailStatus || "N/A"}
                          </span>
                        )}
                        {r.errorMessage && <span className="text-red-500 max-w-[150px] truncate" title={r.errorMessage}>({r.errorMessage})</span>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            {(progressStatus === "SENT" || progressStatus === "FAILED") ? (
              <button
                onClick={() => router.push(`/admin/broadcasts/history/${createdBroadcastId}`)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded transition-colors"
              >
                View Campaign Report
              </button>
            ) : (
              <button
                onClick={() => router.push("/admin/broadcasts/history")}
                className="px-4 py-2 border border-slate-200 text-slate-650 hover:bg-slate-50 text-xs font-bold uppercase tracking-wider rounded transition-colors"
              >
                Exit to History List
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
