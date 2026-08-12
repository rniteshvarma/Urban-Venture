"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, TrendingUp, Download, CheckCircle, FileText, MapPin, Calendar, Building, IndianRupee } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const res = await fetch(`/api/portal/properties/${resolvedParams.id}`);
        if (res.ok) {
          const data = await res.json();
          setProperty(data);
        }
      } catch (err) {
        console.error("Failed to fetch property:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProperty();
  }, [resolvedParams.id]);

  const formatLakhs = (val: number) => {
    if (!val) return "₹0";
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
    return `₹${(val / 100000).toFixed(2)}L`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 animate-pulse rounded w-32" />
        <div className="h-64 bg-gray-200 animate-pulse rounded-2xl w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-48 bg-gray-200 animate-pulse rounded-2xl md:col-span-2" />
          <div className="h-48 bg-gray-200 animate-pulse rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-gray-900">Property not found</h2>
        <Link href="/portal/properties" className="text-indigo-600 mt-4 inline-block font-medium">← Back to properties</Link>
      </div>
    );
  }

  const currentVal = property.currentValue || property.purchasePrice;
  const gain = currentVal - property.purchasePrice;
  const pct = (gain / property.purchasePrice) * 100;
  const cagr = property.cagr || 0; // fallback if api provides it

  // Mock data for chart if api doesn't provide
  const priceHistory = property.appreciation?.priceHistory || [
    { year: "2021", value: property.purchasePrice },
    { year: "2022", value: property.purchasePrice * 1.05 },
    { year: "2023", value: property.purchasePrice * 1.15 },
    { year: "2024", value: currentVal },
  ];

  const documents = property.documents || [
    { id: 1, type: "Agreement", name: "Sale Agreement.pdf", url: "#" },
    { id: 2, type: "Receipt", name: "Booking Receipt.pdf", url: "#" },
  ];

  const payments = property.payments || [
    { id: 1, label: "Booking Amount", amount: property.purchasePrice * 0.1, dueDate: property.purchaseDate, status: "Paid", url: "#" },
    { id: 2, label: "Installment 1", amount: property.purchasePrice * 0.2, dueDate: "2024-01-15", status: "Paid", url: "#" },
    { id: 3, label: "Installment 2", amount: property.purchasePrice * 0.7, dueDate: "2024-06-15", status: "Upcoming", url: "#" },
  ];

  return (
    <div className="space-y-6 pb-12">
      <Link href="/portal/properties" className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors">
        <ArrowLeft size={16} /> Back to Properties
      </Link>

      {/* Hero Header */}
      <div className="relative rounded-2xl overflow-hidden h-64 md:h-80 shadow-sm border border-gray-100">
        <img src={property.project?.imageUrls?.[0] || "/images/placeholder.jpg"} alt={property.project?.name} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/40 to-transparent" />
        
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="text-white">
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-indigo-600 px-3 py-1 rounded-full text-xs font-bold">{property.status || "Active"}</span>
              <span className="text-gray-300 text-sm flex items-center gap-1"><MapPin size={14}/> {property.project?.corridor}</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold font-display">{property.project?.name}</h1>
            <p className="text-gray-300 mt-2 flex items-center gap-2 text-sm">
              <Building size={16} /> By {property.project?.developer}
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 text-white min-w-[200px]">
            <p className="text-xs text-gray-300 font-semibold uppercase tracking-wider mb-1">Unit Number</p>
            <p className="text-2xl font-bold">{property.unitNumber}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Financials */}
        <div className="lg:col-span-2 space-y-6">
          {/* Appreciation Widget */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 p-6 md:p-8">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-6">Investment Performance</h3>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <p className="text-sm text-gray-500 mb-1">Current Estimated Value</p>
                <div className="text-4xl md:text-5xl font-bold text-gray-900">{formatLakhs(currentVal)}</div>
                <div className="mt-3 flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold ${pct >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    <TrendingUp size={16} /> {pct >= 0 ? "+" : ""}{pct.toFixed(2)}%
                  </span>
                  <span className="text-sm text-gray-500 font-medium">{gain >= 0 ? "+" : ""}{formatLakhs(gain)} absolute gain</span>
                </div>
              </div>
              <div className="hidden md:block w-px h-20 bg-gray-100"></div>
              <div className="flex gap-8">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Est. CAGR</p>
                  <p className="text-2xl font-bold text-indigo-600">{cagr > 0 ? `${cagr.toFixed(1)}%` : "--"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Price History Chart */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 p-6 md:p-8">
            <h3 className="text-base font-bold text-gray-900 mb-6">Value Trend</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={priceHistory} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} tickFormatter={(value) => `₹${value/100000}L`} />
                  <Tooltip 
                    formatter={(value: any) => [formatLakhs(Number(value) || 0), 'Value']}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line type="monotone" dataKey="value" stroke="#4F46E5" strokeWidth={3} dot={{ r: 4, fill: '#4F46E5', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Payment Schedule */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Payment Schedule</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Milestone</th>
                    <th className="px-6 py-4 font-semibold">Due Date</th>
                    <th className="px-6 py-4 font-semibold">Amount</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payments.map((payment: any) => (
                    <tr key={payment.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{payment.label}</td>
                      <td className="px-6 py-4 text-gray-600">{formatDate(payment.dueDate)}</td>
                      <td className="px-6 py-4 font-semibold text-gray-900">{formatLakhs(payment.amount)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${payment.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {payment.status === 'Paid' ? (
                          <a href={payment.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 p-2 inline-block">
                            <Download size={16} />
                          </a>
                        ) : <span className="text-gray-400">-</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column - Details */}
        <div className="space-y-6">
          {/* Property Details */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 p-6">
            <h3 className="text-base font-bold text-gray-900 mb-4 border-b border-gray-100 pb-3">Property Details</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Unit Type</span>
                <span className="text-sm font-semibold text-gray-900">{property.unitType || "Apartment"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Area</span>
                <span className="text-sm font-semibold text-gray-900">{property.area || "--"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Purchase Date</span>
                <span className="text-sm font-semibold text-gray-900">{formatDate(property.purchaseDate)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Registration Date</span>
                <span className="text-sm font-semibold text-gray-900">{formatDate(property.registrationDate)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Expected Possession</span>
                <span className="text-sm font-semibold text-gray-900">{formatDate(property.possessionDate)}</span>
              </div>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 p-6">
            <h3 className="text-base font-bold text-gray-900 mb-4 border-b border-gray-100 pb-3 flex items-center gap-2"><IndianRupee size={18}/> Financial Summary</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Base Price</span>
                <span className="text-sm font-semibold text-gray-900">{formatLakhs(property.purchasePrice)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Stamp Duty & Reg.</span>
                <span className="text-sm font-semibold text-gray-900">{formatLakhs(property.registrationFee || 0)}</span>
              </div>
              <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                <span className="text-sm font-bold text-gray-900">Total Cost</span>
                <span className="text-base font-bold text-indigo-600">{formatLakhs((property.purchasePrice || 0) + (property.registrationFee || 0))}</span>
              </div>
            </div>
          </div>

          {/* Documents */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 p-6">
            <h3 className="text-base font-bold text-gray-900 mb-4 border-b border-gray-100 pb-3 flex items-center gap-2"><FileText size={18}/> Documents</h3>
            <div className="space-y-3">
              {documents.map((doc: any) => (
                <a key={doc.id} href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="bg-gray-100 group-hover:bg-white p-2 rounded-lg text-gray-500 group-hover:text-indigo-600 transition-colors">
                      <FileText size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{doc.name}</p>
                      <p className="text-xs text-gray-500">{doc.type}</p>
                    </div>
                  </div>
                  <Download size={16} className="text-gray-400 group-hover:text-indigo-600" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
