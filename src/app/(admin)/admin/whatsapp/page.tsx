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
  ToggleRight
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
          prev.map((t) => (t.id === template.id ? { ...t, isActive: !t.isActive } : t))
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
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200"><CheckCircle2 size={10} /> Read</span>;
      case "DELIVERED":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200"><CheckCircle2 size={10} /> Delivered</span>;
      case "SENT":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 text-slate-700 border border-slate-200"><Clock size={10} /> Sent</span>;
      case "FAILED":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200"><AlertTriangle size={10} /> Failed</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 text-slate-500 border border-slate-200">Pending</span>;
    }
  };

  return (
    <div className="space-y-6 flex-grow flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[10px] text-accent font-bold uppercase tracking-widest block">
            Communications Engine
          </span>
          <h1 className="font-display text-2xl sm:text-4xl font-bold text-primary">
            WhatsApp Control Panel
          </h1>
        </div>

        <div className="flex gap-3">
          <button
            onClick={loadAllData}
            className="p-2 border border-luxury rounded bg-white hover:bg-slate-50 transition-colors text-slate-600"
            title="Refresh logs & templates"
          >
            <RefreshCw size={14} />
          </button>
          
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded transition-colors shadow-sm"
          >
            <Plus size={14} /> Add Template
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-luxury">
        <button
          onClick={() => setActiveTab("templates")}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 -mb-[2px] transition-colors flex items-center gap-2 ${
            activeTab === "templates"
              ? "border-[#2563EB] text-[#2563EB]"
              : "border-transparent text-text-secondary hover:text-primary"
          }`}
        >
          <FileText size={14} /> Message Templates ({templates.length})
        </button>
        
        <button
          onClick={() => setActiveTab("logs")}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 -mb-[2px] transition-colors flex items-center gap-2 ${
            activeTab === "logs"
              ? "border-[#2563EB] text-[#2563EB]"
              : "border-transparent text-text-secondary hover:text-primary"
          }`}
        >
          <Send size={14} /> Delivery Logs History ({logs.length})
        </button>
      </div>

      {/* Tab Panels */}
      <div className="flex-grow">
        {isLoading ? (
          <div className="flex items-center justify-center p-12 text-text-secondary animate-pulse text-xs">
            Loading Communications datasets...
          </div>
        ) : activeTab === "templates" ? (
          /* Templates Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {templates.map((t) => (
              <div 
                key={t.id}
                className="bg-surface border border-luxury p-5 rounded-card shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-sm text-slate-800">{t.name}</h3>
                      <span className="text-[9px] text-[#2563EB] font-bold uppercase tracking-wider">
                        {TRIGGER_LABELS[t.trigger] || t.trigger}
                      </span>
                    </div>

                    <button 
                      onClick={() => handleToggleActive(t)}
                      className="text-slate-500 hover:text-primary transition-colors focus:outline-none"
                    >
                      {t.isActive ? (
                        <ToggleRight className="w-8 h-8 text-green-600" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-slate-400" />
                      )}
                    </button>
                  </div>

                  <p className="mt-3 text-xs text-slate-600 font-mono leading-relaxed bg-slate-50 p-3 rounded border border-slate-100 whitespace-pre-line text-[10px]">
                    {t.message}
                  </p>
                </div>

                <div className="flex justify-between items-center text-[10px] border-t border-luxury/40 pt-3 text-text-secondary">
                  <span>Dispatched: <strong className="text-slate-700">{t.sentCount}</strong> times</span>
                  
                  <button
                    onClick={() => handleDeleteTemplate(t.id)}
                    className="flex items-center gap-1 text-red-500 hover:text-red-700 font-bold uppercase tracking-wider"
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Logs Panel */
          <div className="bg-surface border border-luxury rounded-card shadow-sm overflow-x-auto">
            {logs.length === 0 ? (
              <p className="text-xs text-text-secondary py-8 text-center italic">No message logs registered yet.</p>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-luxury text-text-secondary font-semibold uppercase tracking-wider text-[10px]">
                    <th className="px-5 py-3">Recipient</th>
                    <th className="px-5 py-3">Template</th>
                    <th className="px-5 py-3">Message Dispatched</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Sent Timestamp</th>
                    <th className="px-5 py-3 text-right">Receipts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-luxury">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4 font-semibold text-slate-800">
                        {log.lead.name}
                        <span className="block text-[9px] text-slate-400 font-normal mt-0.5">{log.lead.phone}</span>
                      </td>
                      <td className="px-5 py-4 text-slate-700 font-semibold">
                        {log.template?.name || "Custom manual Message"}
                      </td>
                      <td className="px-5 py-4 max-w-[240px] truncate text-[10px] text-slate-500 font-mono" title={log.message}>
                        {log.message}
                      </td>
                      <td className="px-5 py-4">{getStatusBadge(log.status)}</td>
                      <td className="px-5 py-4 text-slate-400">{new Date(log.createdAt).toLocaleString("en-IN")}</td>
                      <td className="px-5 py-4 text-right text-[9px] text-slate-400 space-y-0.5">
                        {log.deliveredAt && (
                          <div className="flex items-center justify-end gap-1 text-blue-600 font-medium">
                            ✓ Delivered: {new Date(log.deliveredAt).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                        {log.readAt && (
                          <div className="flex items-center justify-end gap-1 text-green-600 font-medium">
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
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-luxury w-full max-w-lg rounded-card shadow-luxury overflow-hidden animate-slide-in">
            <div className="px-6 py-4 border-b border-luxury bg-slate-50/50 flex items-center justify-between">
              <h2 className="font-display font-bold text-slate-800 text-sm">Add Message Template</h2>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-600 hover:text-slate-900 border border-slate-200 rounded px-2.5 py-1 text-xs bg-white"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleCreateTemplate} className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="block font-bold text-slate-500 uppercase tracking-wider">Template Name</label>
                <input
                  type="text"
                  placeholder="e.g. Welcome Introduction"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  className="w-full bg-luxury-bg border border-luxury px-3.5 py-2 rounded text-xs text-text-primary focus:outline-none focus:border-[#2563EB]"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-500 uppercase tracking-wider">Trigger Source</label>
                <select
                  value={newTemplateTrigger}
                  onChange={(e) => setNewTemplateTrigger(e.target.value)}
                  className="w-full bg-luxury-bg border border-luxury px-3.5 py-2 rounded text-xs text-text-primary focus:outline-none focus:border-[#2563EB]"
                >
                  {Object.entries(TRIGGER_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-500 uppercase tracking-wider">Message Content</label>
                <textarea
                  placeholder="Hi {{lead_name}}, thank you for registering your interest in Hyderabad real estate..."
                  value={newTemplateMessage}
                  onChange={(e) => setNewTemplateMessage(e.target.value)}
                  rows={6}
                  className="w-full bg-luxury-bg border border-luxury p-3.5 rounded text-xs text-text-primary focus:outline-none focus:border-[#2563EB] resize-none"
                  required
                />
                
                <div className="bg-blue-50 border border-blue-200/50 p-3 rounded text-[10px] text-blue-800 space-y-1 leading-relaxed mt-2 font-medium">
                  <span className="font-bold flex items-center gap-1"><Sparkles size={11} /> Supported Merge Tags:</span>
                  <div className="flex flex-wrap gap-2 pt-1 font-mono text-[9px]">
                    <span className="bg-white border border-blue-200 px-1 py-0.2 rounded">{"{{lead_name}}"}</span>
                    <span className="bg-white border border-blue-200 px-1 py-0.2 rounded">{"{{budget}}"}</span>
                    <span className="bg-white border border-blue-200 px-1 py-0.2 rounded">{"{{horizon}}"}</span>
                    <span className="bg-white border border-blue-200 px-1 py-0.2 rounded">{"{{city}}"}</span>
                    <span className="bg-white border border-blue-200 px-1 py-0.2 rounded">{"{{agent_name}}"}</span>
                    <span className="bg-white border border-blue-200 px-1 py-0.2 rounded">{"{{project_name}}"}</span>
                    <span className="bg-white border border-blue-200 px-1 py-0.2 rounded">{"{{project_price}}"}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded font-bold text-slate-600 hover:bg-slate-50 uppercase tracking-wider text-[10px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-[#2563EB] hover:bg-blue-700 text-white rounded font-bold uppercase tracking-wider text-[10px] transition-colors disabled:opacity-50"
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
