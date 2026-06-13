"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { 
  Megaphone,
  MessageSquare,
  Mail,
  Plus,
  Trash2,
  Edit3,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  History,
  FileText,
  Check,
  Search,
  ArrowLeft
} from "lucide-react";

interface WATemplate {
  id: string;
  name: string;
  trigger: string;
  message: string;
  isActive: boolean;
  sentCount: number;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  isActive: boolean;
  sentCount: number;
}

const MERGE_TAGS = [
  { tag: "{{lead_name}}", label: "Lead Name" },
  { tag: "{{budget}}", label: "Budget" },
  { tag: "{{horizon}}", label: "Time Horizon" },
  { tag: "{{city}}", label: "City" },
  { tag: "{{agent_name}}", label: "Agent Name" },
  { tag: "{{project_name}}", label: "Project Name" },
  { tag: "{{project_price}}", label: "Project Price" },
];

export default function BroadcastTemplatesPage() {
  const [activeTab, setActiveTab] = useState<"whatsapp" | "email">("whatsapp");
  const [waTemplates, setWaTemplates] = useState<WATemplate[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals & Form states
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formTrigger, setFormTrigger] = useState("CUSTOM");
  const [formMessage, setFormMessage] = useState(""); // WhatsApp message
  const [formSubject, setFormSubject] = useState(""); // Email subject
  const [formBody, setFormBody] = useState(""); // Email body
  const [isSaving, setIsSaving] = useState(false);

  // Refs for cursor insertion
  const waTextAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const emailSubjectRef = useRef<HTMLInputElement | null>(null);
  const emailBodyTextAreaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    setIsLoading(true);
    try {
      const [waRes, emailRes] = await Promise.all([
        fetch("/api/admin/broadcasts/templates/whatsapp"),
        fetch("/api/admin/broadcasts/templates/email")
      ]);

      if (waRes.ok) {
        const waData = await waRes.json();
        setWaTemplates(waData.templates || []);
      }
      if (emailRes.ok) {
        const emailData = await emailRes.json();
        setEmailTemplates(emailData.templates || []);
      }
    } catch (err) {
      console.error("Failed to load templates", err);
    } finally {
      setIsLoading(false);
    }
  }

  const handleToggleActive = async (id: string, type: "WHATSAPP" | "EMAIL", currentActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/broadcasts/templates/${id}?type=${type}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentActive })
      });
      if (res.ok) {
        if (type === "WHATSAPP") {
          setWaTemplates(prev => prev.map(t => t.id === id ? { ...t, isActive: !t.isActive } : t));
        } else {
          setEmailTemplates(prev => prev.map(t => t.id === id ? { ...t, isActive: !t.isActive } : t));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string, type: "WHATSAPP" | "EMAIL") => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    try {
      const res = await fetch(`/api/admin/broadcasts/templates/${id}?type=${type}`, {
        method: "DELETE"
      });
      if (res.ok) {
        if (type === "WHATSAPP") {
          setWaTemplates(prev => prev.filter(t => t.id !== id));
        } else {
          setEmailTemplates(prev => prev.filter(t => t.id !== id));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormName("");
    setFormTrigger("CUSTOM");
    setFormMessage("");
    setFormSubject("");
    setFormBody("");
    setShowModal(true);
  };

  const handleOpenEdit = (template: any, type: "WHATSAPP" | "EMAIL") => {
    setEditingId(template.id);
    setFormName(template.name);
    if (type === "WHATSAPP") {
      setFormTrigger(template.trigger);
      setFormMessage(template.message);
    } else {
      setFormSubject(template.subject);
      setFormBody(template.body);
    }
    setShowModal(true);
  };

  const handleInsertTag = (tag: string, target: "wa-message" | "email-subject" | "email-body") => {
    let ref: React.RefObject<HTMLTextAreaElement | HTMLInputElement | null>;
    let val: string;
    let setter: React.Dispatch<React.SetStateAction<string>>;

    if (target === "wa-message") {
      ref = waTextAreaRef;
      val = formMessage;
      setter = setFormMessage;
    } else if (target === "email-subject") {
      ref = emailSubjectRef;
      val = formSubject;
      setter = setFormSubject;
    } else {
      ref = emailBodyTextAreaRef;
      val = formBody;
      setter = setFormBody;
    }

    const input = ref.current;
    if (!input) return;

    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const before = val.substring(0, start);
    const after = val.substring(end, val.length);

    setter(before + tag + after);

    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + tag.length, start + tag.length);
    }, 10);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    setIsSaving(true);
    try {
      const type = activeTab === "whatsapp" ? "WHATSAPP" : "EMAIL";
      const endpoint = `/api/admin/broadcasts/templates/${activeTab}`;
      
      const payload: any = { name: formName };
      if (activeTab === "whatsapp") {
        payload.trigger = formTrigger;
        payload.message = formMessage;
      } else {
        payload.subject = formSubject;
        payload.body = formBody;
      }

      let res;
      if (editingId) {
        res = await fetch(`/api/admin/broadcasts/templates/${editingId}?type=${type}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        setShowModal(false);
        loadTemplates();
      } else {
        const data = await res.json();
        alert(`Failed to save template: ${data.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error occurred while saving.");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredWa = waTemplates.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredEmail = emailTemplates.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-6 flex-grow flex flex-col">
      {/* Navigation Headers */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/admin/broadcasts" className="hover:text-primary transition-colors flex items-center gap-1">
          <ArrowLeft size={12} /> Broadcast Center
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-semibold">Templates</span>
      </div>

      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[10px] text-blue-600 font-bold uppercase tracking-widest block">
            Campaign Assets
          </span>
          <h1 className="font-display text-2xl sm:text-4xl font-bold text-slate-900 flex items-center gap-2">
            <Megaphone size={28} className="text-blue-600" /> Broadcast Template Manager
          </h1>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded transition-colors shadow-sm"
        >
          <Plus size={14} /> Create New Template
        </button>
      </div>

      {/* Search & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("whatsapp")}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 -mb-[14px] transition-colors flex items-center gap-2 ${
              activeTab === "whatsapp"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <MessageSquare size={14} /> WhatsApp Templates ({waTemplates.length})
          </button>
          
          <button
            onClick={() => setActiveTab("email")}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 -mb-[14px] transition-colors flex items-center gap-2 ${
              activeTab === "email"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Mail size={14} /> Email Templates ({emailTemplates.length})
          </button>
        </div>

        <div className="relative w-full md:w-64">
          <input
            type="text"
            placeholder="Search templates by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 pl-8 pr-3 py-1.5 rounded text-xs focus:outline-none focus:border-blue-600"
          />
          <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-grow">
        {isLoading ? (
          <div className="flex items-center justify-center p-12 text-slate-500 animate-pulse text-xs">
            Loading template resources...
          </div>
        ) : activeTab === "whatsapp" ? (
          filteredWa.length === 0 ? (
            <div className="bg-slate-50 border border-dashed border-slate-350 p-12 text-center rounded">
              <p className="text-xs text-slate-500 italic">No WhatsApp templates found.</p>
              <button onClick={handleOpenAdd} className="mt-3 text-[11px] font-bold uppercase text-blue-600 hover:underline">
                Create one now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredWa.map((t) => (
                <div 
                  key={t.id}
                  className="bg-white border border-slate-200 p-5 rounded shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-sm text-slate-800">{t.name}</h3>
                        <span className="text-[9px] text-blue-600 font-bold uppercase tracking-wider">
                          {t.trigger}
                        </span>
                      </div>

                      <button 
                        onClick={() => handleToggleActive(t.id, "WHATSAPP", t.isActive)}
                        className="text-slate-500 hover:text-primary transition-colors focus:outline-none"
                      >
                        {t.isActive ? (
                          <ToggleRight className="w-8 h-8 text-green-600" />
                        ) : (
                          <ToggleLeft className="w-8 h-8 text-slate-400" />
                        )}
                      </button>
                    </div>

                    <p className="mt-3 text-xs text-slate-650 font-mono leading-relaxed bg-slate-50 p-3 rounded border border-slate-100 whitespace-pre-line text-[10px]">
                      {t.message}
                    </p>
                  </div>

                  <div className="flex justify-between items-center text-[10px] border-t border-slate-100 pt-3 text-slate-500">
                    <span>Dispatched: <strong className="text-slate-700">{t.sentCount}</strong> times</span>
                    
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleOpenEdit(t, "WHATSAPP")}
                        className="flex items-center gap-1 text-slate-600 hover:text-slate-800 font-bold uppercase tracking-wider"
                      >
                        <Edit3 size={11} /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(t.id, "WHATSAPP")}
                        className="flex items-center gap-1 text-red-500 hover:text-red-700 font-bold uppercase tracking-wider"
                      >
                        <Trash2 size={11} /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          filteredEmail.length === 0 ? (
            <div className="bg-slate-50 border border-dashed border-slate-350 p-12 text-center rounded">
              <p className="text-xs text-slate-500 italic">No Email templates found.</p>
              <button onClick={handleOpenAdd} className="mt-3 text-[11px] font-bold uppercase text-blue-600 hover:underline">
                Create one now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredEmail.map((t) => (
                <div 
                  key={t.id}
                  className="bg-white border border-slate-200 p-5 rounded shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-sm text-slate-800">{t.name}</h3>
                        <span className="text-[10px] text-slate-500">
                          Subject: <strong className="text-slate-700 font-medium">{t.subject}</strong>
                        </span>
                      </div>

                      <button 
                        onClick={() => handleToggleActive(t.id, "EMAIL", t.isActive)}
                        className="text-slate-500 hover:text-primary transition-colors focus:outline-none"
                      >
                        {t.isActive ? (
                          <ToggleRight className="w-8 h-8 text-green-600" />
                        ) : (
                          <ToggleLeft className="w-8 h-8 text-slate-400" />
                        )}
                      </button>
                    </div>

                    <div className="text-xs text-slate-650 font-mono leading-relaxed bg-slate-50 p-3 rounded border border-slate-100 whitespace-pre-line text-[10px] max-h-40 overflow-y-auto">
                      {t.body}
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] border-t border-slate-100 pt-3 text-slate-500">
                    <span>Dispatched: <strong className="text-slate-700">{t.sentCount}</strong> times</span>
                    
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleOpenEdit(t, "EMAIL")}
                        className="flex items-center gap-1 text-slate-600 hover:text-slate-800 font-bold uppercase tracking-wider"
                      >
                        <Edit3 size={11} /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(t.id, "EMAIL")}
                        className="flex items-center gap-1 text-red-500 hover:text-red-700 font-bold uppercase tracking-wider"
                      >
                        <Trash2 size={11} /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Editor Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-xl rounded shadow-lg overflow-hidden animate-slide-in flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-150 bg-slate-50 flex items-center justify-between">
              <h2 className="font-display font-bold text-slate-800 text-sm">
                {editingId ? "Modify Template" : "Add New Template"} ({activeTab === "whatsapp" ? "WhatsApp" : "Email"})
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                className="text-slate-600 hover:text-slate-900 border border-slate-200 rounded px-2 text-xs bg-white py-0.5"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs overflow-y-auto flex-grow flex flex-col justify-between">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-500 uppercase tracking-wider">Template Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Q3 Investor Match Bulletin"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2 rounded text-xs focus:outline-none focus:border-blue-600"
                    required
                  />
                </div>

                {activeTab === "whatsapp" ? (
                  <>
                    <div className="space-y-1">
                      <label className="block font-bold text-slate-500 uppercase tracking-wider">Trigger Source</label>
                      <select
                        value={formTrigger}
                        onChange={(e) => setFormTrigger(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2 rounded text-xs focus:outline-none focus:border-blue-600"
                      >
                        <option value="CUSTOM">CUSTOM (Manual Broadcaster Only)</option>
                        <option value="LEAD_CREATED">LEAD_CREATED</option>
                        <option value="STAGE_INITIAL_CONTACT">STAGE_INITIAL_CONTACT</option>
                        <option value="PROJECT_MATCH_FOUND">PROJECT_MATCH_FOUND</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="block font-bold text-slate-500 uppercase tracking-wider">WhatsApp Message Content</label>
                        <span className="text-[10px] text-slate-400 font-medium">Click tags below to insert</span>
                      </div>
                      
                      <textarea
                        ref={waTextAreaRef}
                        placeholder="Hi {{lead_name}}, we found a high appreciation matching project: {{project_name}} at {{project_price}}!"
                        value={formMessage}
                        onChange={(e) => setFormMessage(e.target.value)}
                        rows={6}
                        className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded text-xs font-mono focus:outline-none focus:border-blue-600 resize-none"
                        required
                      />

                      {/* Merge tag injector buttons */}
                      <div className="flex flex-wrap gap-1.5 pt-1.5">
                        {MERGE_TAGS.map((mt) => (
                          <button
                            key={mt.tag}
                            type="button"
                            onClick={() => handleInsertTag(mt.tag, "wa-message")}
                            className="bg-slate-100 hover:bg-slate-250 text-slate-700 border border-slate-200/80 px-2 py-1 rounded text-[10px] font-medium transition-colors flex items-center gap-0.5"
                          >
                            <Sparkles size={9} className="text-blue-600" /> {mt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="block font-bold text-slate-500 uppercase tracking-wider">Email Subject</label>
                        <span className="text-[10px] text-slate-400 font-medium">Click tags below to insert</span>
                      </div>
                      
                      <input
                        ref={emailSubjectRef}
                        type="text"
                        placeholder="Welcome {{lead_name}} - Exclusive Bangalore Investment Opportunities"
                        value={formSubject}
                        onChange={(e) => setFormSubject(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2 rounded text-xs focus:outline-none focus:border-blue-600"
                        required
                      />

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {MERGE_TAGS.map((mt) => (
                          <button
                            key={mt.tag}
                            type="button"
                            onClick={() => handleInsertTag(mt.tag, "email-subject")}
                            className="bg-slate-100 hover:bg-slate-250 text-slate-700 border border-slate-200/80 px-2 py-0.5 rounded text-[9px] font-medium transition-colors flex items-center gap-0.5"
                          >
                            {mt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="block font-bold text-slate-500 uppercase tracking-wider">HTML Email Body Content</label>
                        <span className="text-[10px] text-slate-400 font-medium font-sans">Rich text structure (use tags)</span>
                      </div>

                      <textarea
                        ref={emailBodyTextAreaRef}
                        placeholder="<p>Dear {{lead_name}},</p><p>We have identified Bangalore matches with a budget matching {{budget}}.</p>"
                        value={formBody}
                        onChange={(e) => setFormBody(e.target.value)}
                        rows={7}
                        className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded text-xs font-mono focus:outline-none focus:border-blue-600 resize-none"
                        required
                      />

                      <div className="flex flex-wrap gap-1.5 pt-1.5">
                        {MERGE_TAGS.map((mt) => (
                          <button
                            key={mt.tag}
                            type="button"
                            onClick={() => handleInsertTag(mt.tag, "email-body")}
                            className="bg-slate-100 hover:bg-slate-250 text-slate-700 border border-slate-200/80 px-2 py-1 rounded text-[10px] font-medium transition-colors flex items-center gap-0.5"
                          >
                            <Sparkles size={9} className="text-blue-600" /> {mt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded font-bold text-slate-650 hover:bg-slate-50 uppercase tracking-wider text-[10px]"
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
