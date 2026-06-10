"use client";

import React, { useState } from "react";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  searchesCount: number;
  leadStatus: string;
  lastActivity: string;
  leads: any[];
  searches: any[];
}

interface CustomerProfileProps {
  customer: Customer | null;
  onClose: () => void;
  onUpdateCustomer: (id: string, updatedData: { name: string; email: string; phone: string }) => Promise<void>;
}

export default function CustomerProfile({
  customer,
  onClose,
  onUpdateCustomer,
}: CustomerProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(customer?.name || "");
  const [email, setEmail] = useState(customer?.email || "");
  const [phone, setPhone] = useState(customer?.phone || "");
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (customer) {
      setName(customer.name);
      setEmail(customer.email);
      setPhone(customer.phone);
      setIsEditing(false);
    }
  }, [customer]);

  if (!customer) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onUpdateCustomer(customer.id, { name, email, phone });
      setIsEditing(false);
    } catch (err) {
      alert("Failed to update customer info.");
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "NEW":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "CONTACTED":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "INTERESTED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "NEGOTIATING":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "CONVERTED":
        return "bg-green-100 text-green-800 border-green-300";
      case "LOST":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
      />

      {/* Profile Sidebar */}
      <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-surface border-l border-luxury shadow-luxury flex flex-col justify-between animate-slide-in text-xs text-text-primary">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-luxury bg-luxury-bg/40 flex items-center justify-between">
          <div>
            <span className="text-[9px] text-accent font-bold uppercase tracking-wider block">Customer Directory Profile</span>
            <h2 className="font-display text-lg font-bold text-primary">{customer.name}</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-text-secondary hover:text-primary p-1 text-sm border border-luxury rounded-[4px] bg-surface"
          >
            ✕ Close
          </button>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto p-6 space-y-6 scrollbar-thin">
          
          {/* Editable Contact Info */}
          <section className="bg-luxury-bg/20 p-4 rounded-card border border-luxury/50 space-y-4">
            <div className="flex justify-between items-center border-b border-luxury/40 pb-2">
              <h3 className="font-bold text-primary uppercase tracking-wide">Client Details</h3>
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className="text-[10px] font-bold text-accent hover:underline"
              >
                {isEditing ? "Cancel Edit" : "Edit Profile"}
              </button>
            </div>

            {isEditing ? (
              <form onSubmit={handleSave} className="space-y-3">
                <div>
                  <label className="block text-[10px] text-text-secondary uppercase mb-1">Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-surface border border-luxury px-3 py-1.5 rounded-input text-xs text-text-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-text-secondary uppercase mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-surface border border-luxury px-3 py-1.5 rounded-input text-xs text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-text-secondary uppercase mb-1">Phone</label>
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-surface border border-luxury px-3 py-1.5 rounded-input text-xs text-text-primary"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-3 py-1.5 bg-primary text-surface font-semibold rounded-tag"
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-text-secondary uppercase block mb-1">Email Address</span>
                  <span className="font-semibold text-primary">{customer.email}</span>
                </div>
                <div>
                  <span className="text-[10px] text-text-secondary uppercase block mb-1">Phone Number</span>
                  <span className="font-semibold text-primary">{customer.phone}</span>
                </div>
                <div className="mt-2">
                  <span className="text-[10px] text-text-secondary uppercase block mb-1">Lead status</span>
                  <span className={`px-2 py-0.5 rounded border text-[9px] font-bold uppercase ${getStatusBadge(customer.leadStatus)}`}>
                    {customer.leadStatus.replace("_", " ")}
                  </span>
                </div>
                <div className="mt-2">
                  <span className="text-[10px] text-text-secondary uppercase block mb-1">Last CRM Activity</span>
                  <span className="font-medium text-text-secondary">
                    {new Date(customer.lastActivity).toLocaleString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            )}
          </section>

          {/* AI Searches & Recommendations History */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-luxury pb-1.5">
              AI Recommendations History ({customer.searchesCount})
            </h3>
            {customer.searches.length === 0 ? (
              <p className="text-xs text-text-secondary italic">No searches recorded yet.</p>
            ) : (
              <div className="space-y-4">
                {customer.searches.map((s, idx) => {
                  const responseJson = s.aiResponse || {};
                  const corridors = responseJson.corridors || [];
                  return (
                    <div key={s.id} className="border border-luxury rounded-card p-3 bg-surface space-y-2">
                      <div className="flex justify-between items-center text-[9px] text-text-secondary">
                        <span>Query parameters: ₹{s.budget}L · {s.horizon}Yrs · {s.city}</span>
                        <span>{new Date(s.createdAt).toLocaleDateString("en-IN")}</span>
                      </div>
                      <p className="text-[10px] italic text-text-primary leading-normal">
                        "{responseJson.executiveSummary?.substring(0, 120)}..."
                      </p>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {corridors.map((c: any, i: number) => (
                          <span key={i} className="text-[8px] font-semibold bg-primary text-accent px-1.5 py-0.5 rounded">
                            {c.name} ({c.matchScore}%)
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Activity Timeline */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-luxury pb-1.5">
              Activity History Timeline
            </h3>
            <div className="relative border-l border-luxury pl-4 ml-2 space-y-4">
              
              {/* Combine searches and leads into a single timeline array */}
              {[
                ...customer.searches.map((s) => ({
                  type: "search",
                  date: new Date(s.createdAt),
                  title: "AI Analysis Generated",
                  desc: `Ran report for ₹${s.budget}L budget in ${s.city} targeting ${s.horizon} years.`,
                })),
                ...customer.leads.map((l) => ({
                  type: "lead",
                  date: new Date(l.createdAt),
                  title: "Lead Profile Captured",
                  desc: `Captured profile via ${l.source}. status: ${l.status}.`,
                })),
              ]
                .sort((a, b) => b.date.getTime() - a.date.getTime())
                .map((item, idx) => (
                  <div key={idx} className="relative">
                    <span className={`absolute -left-[22px] top-1.5 w-3 h-3 rounded-full border border-surface ${
                      item.type === "search" ? "bg-accent" : "bg-primary"
                    }`} />
                    <h4 className="font-semibold text-primary">{item.title}</h4>
                    <p className="text-[10px] text-text-secondary mt-0.5">{item.desc}</p>
                    <span className="text-[9px] text-text-secondary block mt-0.5">
                      {item.date.toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-luxury bg-luxury-bg/20 text-center">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-primary text-surface font-semibold uppercase tracking-wider rounded-tag"
          >
            Close Profile
          </button>
        </div>

      </aside>
    </>
  );
}
