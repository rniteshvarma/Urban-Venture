"use client";

import React, { useState, useEffect } from "react";
import { 
  MessageSquare, 
  Send, 
  Trash2, 
  Plus, 
  RefreshCw, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Sparkles,
  ToggleLeft,
  ToggleRight,
  ChevronRight,
  X
} from "lucide-react";

interface Template {
  id: string;
  name: string;
  trigger: string;
  message: string;
  isActive: boolean;
  sentCount: number;
  createdAt: string;
}

interface Log {
  id: string;
  message: string;
  status: string;
  waMessageId: string | null;
  createdAt: string;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  lead: {
    name: string;
    phone: string;
  };
  template: {
    name: string;
  } | null;
}

const TRIGGER_LABELS: Record<string, string> = {
  LEAD_CREATED: "Lead Created (Auto)",
  STAGE_INITIAL_CONTACT: "Initial Contact Roadmap Stage",
  STAGE_NEEDS_ASSESSMENT: "Needs Assessment Roadmap Stage",
  SITE_VISIT_REMINDER: "Site Visit Scheduled Reminder",
  SITE_VISIT_FOLLOWUP: "Site Visit Completed Followup",
  PROPOSAL_SENT: "Proposal Dispatched",
  NEGOTIATION_START: "Negotiation Begun",
  STALE_LEAD_7DAYS: "Inactivity Stale (7 Days)",
  STALE_LEAD_14DAYS: "Inactivity Stale (14 Days)",
  PROJECT_MATCH_FOUND: "Hot Project Match Identified",
  CUSTOM: "Manual Template Dispatch"
};

export default function AdminWhatsAppPage() {
  const [activeTab, setActiveTab] = useState<"templates" | "logs">("templates");
  
  const [templates, setTemplates] = useState<Template[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal / Form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateTrigger, setNewTemplateTrigger] = useState("CUSTOM");
  const [newTemplateMessage, setNewTemplateMessage] = useState("");

  const [isSaving, setIsSaving] = useState(false);

  async function loadTemplates() {
    try {
      const res = await fetch("/api/admin/whatsapp/templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function loadLogs() {
    try {
      const res = await fetch("/api/admin/whatsapp/logs");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function loadAllData() {
    setIsLoading(true);
    await Promise.all([loadTemplates(), loadLogs()]);
    setIsLoading(false);
  }

  useEffect(() => {
    loadAllData();
  }, []);

  const handleToggleActive = async (template: Template) => {
    try {
      const res = await fetch(`/api/admin/whatsapp/templates/${template.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !template.isActive }),
      });
      if (res.ok) {
        setTemplates((prev) =>
          prev.map((t) => (t.id === template.id ? { ...t, isActive: !template.isActive } : t))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    try {
      const res = await fetch(`/api/admin/whatsapp/templates/${templateId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setTemplates((prev) => prev.filter((t) => t.id !== templateId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim() || !newTemplateMessage.trim()) return;

    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/whatsapp/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTemplateName,
          trigger: newTemplateTrigger,
          message: newTemplateMessage,
          isActive: true
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setNewTemplateName("");
        setNewTemplateMessage("");
        setNewTemplateTrigger("CUSTOM");
        loadTemplates();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(`Failed to create template: ${errData.error || "Failed to create template."}${errData.details ? " - " + errData.details : ""}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Error creating template: ${err.message || "Connection failed"}`);
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case "READ":
        return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800"><CheckCircle2 size={10} /> Read</span>;
      case "DELIVERED":
        return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800"><CheckCircle2 size={10} /> Delivered</span>;
      case "SENT":
        return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700"><Clock size={10} /> Sent</span>;
      case "FAILED":
        return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800"><AlertTriangle size={10} /> Failed</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">Pending</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 flex-grow flex flex-col animate-fade-in w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#F0EDFA]">
        <div>
          <span className="text-[11px] text-[#5B4FE0] font-bold uppercase tracking-widest block mb-1">
            Communications Engine
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#1A1A2E]">
            WhatsApp Control Panel
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadAllData}
            className="crm-btn-secondary text-xs p-2.5"
            title="Refresh logs & templates"
          >
            <RefreshCw size={14} className="text-[#5B4FE0]" />
          </button>
          
          <button
            onClick={() => setShowAddModal(true)}
            className="crm-btn-primary text-xs"
          >
            <Plus size={14} /> Add Template
          </button>
        </div>
      </div>

      {/* Top pill navigation bar */}
      <div className="flex items-center gap-3">
        <div className="crm-pill-nav">
          <button
            onClick={() => setActiveTab("templates")}
            className={activeTab === "templates" ? "crm-pill-tab crm-pill-tab-active" : "crm-pill-tab"}
          >
            <FileText size={14} className="inline mr-1.5" /> Message Templates ({templates.length})
          </button>
          
          <button
            onClick={() => setActiveTab("logs")}
            className={activeTab === "logs" ? "crm-pill-tab crm-pill-tab-active" : "crm-pill-tab"}
          >
            <Send size={14} className="inline mr-1.5" /> Delivery Logs History ({logs.length})
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      <div className="flex-grow">
        {isLoading ? (
          <div className="flex items-center justify-center p-16 text-[#8A8A9E] animate-pulse text-xs">
            Loading Communications datasets...
          </div>
        ) : activeTab === "templates" ? (
          /* Templates Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {templates.map((t) => (
              <div 
                key={t.id}
                className="crm-card p-6 sm:p-7 flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex justify-between items-start pb-3 border-b border-[#F5F3FB]">
                    <div>
                      <h3 className="font-bold text-base text-[#1A1A2E]">{t.name}</h3>
                      <span className="text-[10px] text-[#5B4FE0] font-bold uppercase tracking-wider block mt-0.5">
                        {TRIGGER_LABELS[t.trigger] || t.trigger}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleToggleActive(t)}
                        className="text-[#8A8A9E] hover:text-[#1A1A2E] transition-colors focus:outline-none"
                      >
                        {t.isActive ? (
                          <ToggleRight className="w-8 h-8 text-emerald-500" />
                        ) : (
                          <ToggleLeft className="w-8 h-8 text-[#8A8A9E]" />
                        )}
                      </button>
                      <ChevronRight size={16} className="text-[#8A8A9E]" />
                    </div>
                  </div>

                  <p className="mt-4 text-xs text-[#1A1A2E] font-mono leading-relaxed bg-[#F9F8FD] p-4 rounded-xl border border-[#F0EDFA] whitespace-pre-line text-[11px]">
                    {t.message}
                  </p>
                </div>

                <div className="flex justify-between items-center text-xs border-t border-[#F5F3FB] pt-3 text-[#8A8A9E]">
                  <span>Dispatched: <strong className="text-[#1A1A2E] font-bold">{t.sentCount}</strong> times</span>
                  
                  <button
                    onClick={() => handleDeleteTemplate(t.id)}
                    className="crm-btn-ghost text-rose-600 text-xs px-3 py-1.5"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Logs Panel */
          <div className="crm-card p-0 overflow-hidden">
            {logs.length === 0 ? (
              <p className="text-xs text-[#8A8A9E] py-12 text-center italic">No message logs registered yet.</p>
            ) : (
              <table className="crm-table text-xs w-full">
                <thead>
                  <tr>
                    <th>Recipient</th>
                    <th>Template</th>
                    <th>Message Dispatched</th>
                    <th>Status</th>
                    <th>Sent Timestamp</th>
                    <th className="text-right">Receipts</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td className="font-bold text-[#1A1A2E]">
                        {log.lead.name}
                        <span className="block text-[10px] text-[#8A8A9E] font-normal mt-0.5">{log.lead.phone}</span>
                      </td>
                      <td className="text-[#1A1A2E] font-semibold">
                        {log.template?.name || "Custom manual Message"}
                      </td>
                      <td className="max-w-[240px] truncate text-[11px] text-[#6E6D8A] font-mono" title={log.message}>
                        {log.message}
                      </td>
                      <td>{getStatusBadge(log.status)}</td>
                      <td className="text-[#8A8A9E]">{new Date(log.createdAt).toLocaleString("en-IN")}</td>
                      <td className="text-right text-[10px] text-[#8A8A9E] space-y-0.5">
                        {log.deliveredAt && (
                          <div className="flex items-center justify-end gap-1 text-[#5B4FE0] font-semibold">
                            ✓ Delivered: {new Date(log.deliveredAt).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                        {log.readAt && (
                          <div className="flex items-center justify-end gap-1 text-emerald-600 font-semibold">
                            ✓✓ Read: {new Date(log.readAt).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                        {!log.deliveredAt && !log.readAt && <span>-</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Add Template Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[#1A1A2E]/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="crm-card bg-white w-full max-w-lg shadow-2xl p-6 space-y-5 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0EDFA]">
              <h2 className="font-display font-bold text-[#1A1A2E] text-base">Add Message Template</h2>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-[#8A8A9E] hover:text-[#1A1A2E] p-1 rounded-full hover:bg-[#F4F0FF]"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleCreateTemplate} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="block font-bold text-[#8A8A9E] uppercase tracking-wider text-[10px]">Template Name</label>
                <input
                  type="text"
                  placeholder="e.g. Welcome Introduction"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  className="w-full bg-[#F9F8FD] border border-[#E8E5F5] rounded-full px-4 py-2.5 text-xs text-[#1A1A2E] focus:outline-none focus:border-[#5B4FE0]"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold text-[#8A8A9E] uppercase tracking-wider text-[10px]">Trigger Source</label>
                <select
                  value={newTemplateTrigger}
                  onChange={(e) => setNewTemplateTrigger(e.target.value)}
                  className="w-full bg-[#F9F8FD] border border-[#E8E5F5] rounded-full px-4 py-2.5 text-xs text-[#1A1A2E] focus:outline-none focus:border-[#5B4FE0]"
                >
                  {Object.entries(TRIGGER_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold text-[#8A8A9E] uppercase tracking-wider text-[10px]">Message Content</label>
                <textarea
                  placeholder="Hi {{lead_name}}, thank you for registering your interest in Hyderabad real estate..."
                  value={newTemplateMessage}
                  onChange={(e) => setNewTemplateMessage(e.target.value)}
                  rows={5}
                  className="w-full bg-[#F9F8FD] border border-[#E8E5F5] rounded-2xl p-4 text-xs text-[#1A1A2E] focus:outline-none focus:border-[#5B4FE0] resize-none"
                  required
                />
                
                <div className="crm-insight-box mt-2 flex flex-col gap-1.5">
                  <span className="font-bold flex items-center gap-1 text-xs"><Sparkles size={13} /> Supported Merge Tags:</span>
                  <div className="flex flex-wrap gap-2 font-mono text-[10px]">
                    <span className="bg-white border border-[#E4DCFF] px-2 py-0.5 rounded-full text-[#1A1A2E]">{"{{lead_name}}"}</span>
                    <span className="bg-white border border-[#E4DCFF] px-2 py-0.5 rounded-full text-[#1A1A2E]">{"{{budget}}"}</span>
                    <span className="bg-white border border-[#E4DCFF] px-2 py-0.5 rounded-full text-[#1A1A2E]">{"{{horizon}}"}</span>
                    <span className="bg-white border border-[#E4DCFF] px-2 py-0.5 rounded-full text-[#1A1A2E]">{"{{city}}"}</span>
                    <span className="bg-white border border-[#E4DCFF] px-2 py-0.5 rounded-full text-[#1A1A2E]">{"{{agent_name}}"}</span>
                    <span className="bg-white border border-[#E4DCFF] px-2 py-0.5 rounded-full text-[#1A1A2E]">{"{{project_name}}"}</span>
                    <span className="bg-white border border-[#E4DCFF] px-2 py-0.5 rounded-full text-[#1A1A2E]">{"{{project_price}}"}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="crm-btn-secondary px-5 py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="crm-btn-primary px-5 py-2 text-xs"
                >
                  {isSaving ? "Saving..." : "Save Template"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
