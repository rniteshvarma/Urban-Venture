"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, User, Building, MapPin, IndianRupee, Calendar, CheckCircle2, Loader2, Link as LinkIcon, FileText } from "lucide-react";
import Link from "next/link";

export default function NewPurchasePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  
  // Form State
  const [userId, setUserId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [unitNumber, setUnitNumber] = useState("");
  const [areaSqYd, setAreaSqYd] = useState("");
  const [areaSqFt, setAreaSqFt] = useState("");
  
  const [purchasePrice, setPurchasePrice] = useState("");
  const [loanAmount, setLoanAmount] = useState("");
  const [loanBank, setLoanBank] = useState("");
  const [stampDuty, setStampDuty] = useState("");
  const [registrationFee, setRegistrationFee] = useState("");
  
  const [purchaseDate, setPurchaseDate] = useState("");
  const [registrationDate, setRegistrationDate] = useState("");
  const [possessionDate, setPossessionDate] = useState("");
  
  const [status, setStatus] = useState("BOOKING_RECEIVED");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    // Fetch customers
    fetch("/api/admin/customers")
      .then(res => res.json())
      .then(data => setCustomers(data))
      .catch(err => console.error(err));

    // Fetch active projects
    fetch("/api/admin/projects?status=ACTIVE")
      .then(res => res.json())
      .then(data => setProjects(data))
      .catch(err => console.error(err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const payload = {
      userId,
      projectId,
      unitNumber,
      areaSqYd: areaSqYd ? Number(areaSqYd) : null,
      areaSqFt: areaSqFt ? Number(areaSqFt) : null,
      purchasePrice: Number(purchasePrice),
      loanAmount: loanAmount ? Number(loanAmount) : null,
      loanBank,
      stampDuty: stampDuty ? Number(stampDuty) : null,
      registrationFee: registrationFee ? Number(registrationFee) : null,
      purchaseDate: new Date(purchaseDate).toISOString(),
      registrationDate: registrationDate ? new Date(registrationDate).toISOString() : null,
      possessionDate: possessionDate ? new Date(possessionDate).toISOString() : null,
      status,
      notes
    };

    try {
      const res = await fetch("/api/admin/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        router.push("/admin/purchases");
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to save purchase");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving purchase");
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "w-full rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 px-4 py-2.5 text-sm bg-white";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/purchases" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Record New Purchase</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Parties & Property */}
        <div className="crm-card p-6 md:p-8 space-y-6">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 border-b pb-4">
            <User size={18} className="text-indigo-600" /> Client & Property Selection
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Select Client <span className="text-red-500">*</span></label>
              <select required value={userId} onChange={(e) => setUserId(e.target.value)} className={inputClass}>
                <option value="">-- Choose Client --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className={labelClass}>Select Project <span className="text-red-500">*</span></label>
              <select required value={projectId} onChange={(e) => setProjectId(e.target.value)} className={inputClass}>
                <option value="">-- Choose Project --</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Unit Number <span className="text-red-500">*</span></label>
              <input required type="text" value={unitNumber} onChange={(e) => setUnitNumber(e.target.value)} className={inputClass} placeholder="e.g. A-102, Plot 45" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Area (Sq Yd)</label>
                <input type="number" value={areaSqYd} onChange={(e) => setAreaSqYd(e.target.value)} className={inputClass} placeholder="e.g. 200" />
              </div>
              <div>
                <label className={labelClass}>Area (Sq Ft)</label>
                <input type="number" value={areaSqFt} onChange={(e) => setAreaSqFt(e.target.value)} className={inputClass} placeholder="e.g. 1800" />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Financial Details */}
        <div className="crm-card p-6 md:p-8 space-y-6">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 border-b pb-4">
            <IndianRupee size={18} className="text-indigo-600" /> Financial Overview
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Purchase Price (₹) <span className="text-red-500">*</span></label>
              <input required type="number" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} className={inputClass} placeholder="e.g. 4500000" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Stamp Duty (₹)</label>
                <input type="number" value={stampDuty} onChange={(e) => setStampDuty(e.target.value)} className={inputClass} placeholder="Amount" />
              </div>
              <div>
                <label className={labelClass}>Registration (₹)</label>
                <input type="number" value={registrationFee} onChange={(e) => setRegistrationFee(e.target.value)} className={inputClass} placeholder="Amount" />
              </div>
            </div>

            <div>
              <label className={labelClass}>Loan Amount (₹)</label>
              <input type="number" value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} className={inputClass} placeholder="e.g. 3500000" />
            </div>
            
            <div>
              <label className={labelClass}>Loan Bank</label>
              <input type="text" value={loanBank} onChange={(e) => setLoanBank(e.target.value)} className={inputClass} placeholder="e.g. HDFC Bank" />
            </div>
          </div>
        </div>

        {/* Section 3: Dates & Status */}
        <div className="crm-card p-6 md:p-8 space-y-6">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 border-b pb-4">
            <Calendar size={18} className="text-indigo-600" /> Timeline & Status
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Purchase Date <span className="text-red-500">*</span></label>
              <input required type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} className={inputClass} />
            </div>
            
            <div>
              <label className={labelClass}>Current Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
                <option value="BOOKING_RECEIVED">Booking Received</option>
                <option value="AGREEMENT_SIGNED">Agreement Signed</option>
                <option value="REGISTERED">Registered</option>
                <option value="POSSESSION_RECEIVED">Possession Received</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Registration Date</label>
              <input type="date" value={registrationDate} onChange={(e) => setRegistrationDate(e.target.value)} className={inputClass} />
            </div>
            
            <div>
              <label className={labelClass}>Possession Date</label>
              <input type="date" value={possessionDate} onChange={(e) => setPossessionDate(e.target.value)} className={inputClass} />
            </div>
          </div>
        </div>

        {/* Section 4: Notes */}
        <div className="crm-card p-6 md:p-8">
          <label className={labelClass}>Administrative Notes</label>
          <textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} placeholder="Add any special conditions, payment terms, or remarks here..." />
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Link href="/admin/purchases" className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Cancel
          </Link>
          <button type="submit" disabled={isLoading} className="crm-btn-primary flex items-center gap-2 px-8 py-2.5 shadow-md">
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            {isLoading ? "Saving..." : "Save Purchase Record"}
          </button>
        </div>
      </form>
    </div>
  );
}
