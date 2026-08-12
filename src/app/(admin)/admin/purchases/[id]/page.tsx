"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin, Building, Calendar, IndianRupee, FileText, CheckCircle2, TrendingUp, TrendingDown, Clock, Download, UploadCloud } from "lucide-react";
import AppreciationChart from "@/components/admin/AppreciationChart";

export default function PurchaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;

  const [purchase, setPurchase] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/purchases/${id}`)
      .then(res => res.json())
      .then(data => {
        setPurchase(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setIsLoading(false);
      });
  }, [id]);

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/admin/purchases/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setPurchase({ ...purchase, status: newStatus });
      }
    } catch (err) {
      console.error(err);
      alert("Failed to update status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const formatLakhs = (value: number) => {
    if (!value) return "₹0";
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
    return `₹${value.toLocaleString()}`;
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mb-8"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="crm-card h-80 animate-pulse bg-gray-100"></div>
            <div className="crm-card h-40 animate-pulse bg-gray-100"></div>
          </div>
          <div className="space-y-6">
            <div className="crm-card h-60 animate-pulse bg-gray-100"></div>
            <div className="crm-card h-80 animate-pulse bg-gray-100"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!purchase) {
    return <div>Purchase not found.</div>;
  }

  const invested = purchase.purchasePrice || 0;
  const currentVal = purchase.currentValue || invested;
  const gain = currentVal - invested;
  const gainPercent = invested > 0 ? (gain / invested) * 100 : 0;
  
  const purchaseYear = new Date(purchase.purchaseDate).getFullYear();
  const currentYear = new Date().getFullYear();
  const yearsHeld = Math.max(1, currentYear - purchaseYear);
  const cagr = invested > 0 ? (Math.pow(currentVal / invested, 1 / yearsHeld) - 1) * 100 : 0;

  // Mock price history for chart if not provided by backend
  const mockHistory = [
    { year: purchaseYear, price: invested, yoyChange: 0 },
    { year: purchaseYear + 1, price: invested * 1.12, yoyChange: 12 },
    { year: currentYear, price: currentVal, yoyChange: 15 }
  ];

  const statusColors: any = {
    BOOKING_RECEIVED: "bg-blue-100 text-blue-800",
    AGREEMENT_SIGNED: "bg-yellow-100 text-yellow-800",
    REGISTERED: "bg-green-100 text-green-800",
    POSSESSION_RECEIVED: "bg-emerald-100 text-emerald-800"
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <Link href="/admin/purchases" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 transition-colors">
        <ArrowLeft size={16} /> Back to Purchases
      </Link>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{purchase.project?.name} - {purchase.unitNumber}</h1>
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
            Client: <span className="font-semibold text-gray-900">{purchase.user?.name}</span>
          </p>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${statusColors[purchase.status] || "bg-gray-100 text-gray-800"}`}>
          {purchase.status.replace("_", " ")}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Appreciation Dashboard */}
          <div className="crm-card p-6">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">Value Dashboard</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">Current Est. Value</div>
                <div className="text-xl font-bold text-indigo-700">{formatLakhs(currentVal)}</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">Absolute Gain</div>
                <div className={`text-xl font-bold ${gain >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {gain >= 0 ? '+' : ''}{formatLakhs(gain)}
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">Total Return</div>
                <div className={`text-xl font-bold ${gainPercent >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {gainPercent >= 0 ? '+' : ''}{gainPercent.toFixed(1)}%
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">Est. CAGR</div>
                <div className={`text-xl font-bold ${cagr >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {cagr >= 0 ? '+' : ''}{cagr.toFixed(1)}%
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <AppreciationChart 
                priceHistory={mockHistory}
                purchaseYear={purchaseYear}
                purchasePrice={invested}
                currentValue={currentVal}
                corridorName={purchase.project?.corridor || "Market"}
              />
            </div>
          </div>

          {/* Property Details */}
          <div className="crm-card p-6">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">Property Specifications</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-4">
              <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase">Unit Number</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">{purchase.unitNumber}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase">Developer</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">{purchase.project?.developer}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase">Property Type</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">{purchase.project?.propertyType}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase">Area (Sq Yd)</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">{purchase.areaSqYd || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase">Area (Sq Ft)</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">{purchase.areaSqFt || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase">Corridor</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">{purchase.project?.corridor}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          
          {/* Status Updater */}
          <div className="crm-card p-6">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">Update Status</h2>
            <select 
              value={purchase.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={isUpdatingStatus}
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-colors"
            >
              <option value="BOOKING_RECEIVED">Booking Received</option>
              <option value="AGREEMENT_SIGNED">Agreement Signed</option>
              <option value="REGISTERED">Registered</option>
              <option value="POSSESSION_RECEIVED">Possession Received</option>
            </select>
          </div>

          {/* Financial Summary */}
          <div className="crm-card p-6">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">Financial Details</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <span className="text-sm text-gray-500">Purchase Price</span>
                <span className="text-sm font-bold text-gray-900">{formatLakhs(invested)}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <span className="text-sm text-gray-500">Stamp Duty</span>
                <span className="text-sm font-bold text-gray-900">{purchase.stampDuty ? formatLakhs(purchase.stampDuty) : '-'}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <span className="text-sm text-gray-500">Registration Fee</span>
                <span className="text-sm font-bold text-gray-900">{purchase.registrationFee ? formatLakhs(purchase.registrationFee) : '-'}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <span className="text-sm text-gray-500">Loan Amount</span>
                <span className="text-sm font-bold text-gray-900">{purchase.loanAmount ? formatLakhs(purchase.loanAmount) : '-'}</span>
              </div>
              {purchase.loanBank && (
                <div className="flex justify-between items-center pt-1">
                  <span className="text-sm text-gray-500">Loan Bank</span>
                  <span className="text-sm font-semibold text-indigo-700">{purchase.loanBank}</span>
                </div>
              )}
            </div>
          </div>

          {/* Documents Placeholder */}
          <div className="crm-card p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Documents</h2>
              <button className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded flex items-center gap-1 hover:bg-indigo-100">
                <UploadCloud size={12} /> Upload
              </button>
            </div>
            
            {purchase.documents && purchase.documents.length > 0 ? (
              <div className="space-y-3">
                {purchase.documents.map((doc: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:border-indigo-200 transition-colors">
                    <div className="flex items-center gap-3">
                      <FileText size={16} className="text-indigo-500" />
                      <div>
                        <p className="text-xs font-bold text-gray-900">{doc.name}</p>
                        <p className="text-[10px] text-gray-500">{doc.type}</p>
                      </div>
                    </div>
                    <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-indigo-600">
                      <Download size={14} />
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <FileText size={20} className="mx-auto text-gray-400 mb-2" />
                <p className="text-xs text-gray-500">No documents uploaded yet.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
