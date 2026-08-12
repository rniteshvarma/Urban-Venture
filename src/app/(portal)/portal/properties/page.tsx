"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, MapPin, Building, Calendar, TrendingUp } from "lucide-react";

export default function PropertiesListPage() {
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const res = await fetch("/api/portal/properties");
        if (res.ok) {
          const data = await res.json();
          setProperties(data);
        }
      } catch (err) {
        console.error("Failed to fetch properties:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProperties();
  }, []);

  const formatLakhs = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
    return `₹${(val / 100000).toFixed(2)}L`;
  };

  const totalInvested = properties.reduce((acc, p) => acc + (p.purchasePrice || 0), 0);
  const totalValue = properties.reduce((acc, p) => acc + (p.currentValue || p.purchasePrice || 0), 0);
  const totalGain = totalValue - totalInvested;
  const appreciation = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-gray-200 animate-pulse rounded w-48 mb-6" />
        <div className="h-24 bg-gray-200 animate-pulse rounded-2xl w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {[1,2,3,4].map(i => <div key={i} className="h-96 bg-gray-200 animate-pulse rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-900 font-display">My Properties</h1>
      </div>

      {properties.length > 0 && (
        <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex-1">
            <p className="text-indigo-200 text-sm font-semibold uppercase tracking-wider mb-1">Portfolio Value</p>
            <div className="text-3xl font-bold">{formatLakhs(totalValue)}</div>
          </div>
          <div className="w-px h-12 bg-indigo-500 hidden md:block"></div>
          <div className="flex-1">
            <p className="text-indigo-200 text-sm font-semibold uppercase tracking-wider mb-1">Total Gain</p>
            <div className="text-2xl font-bold text-green-300">+{formatLakhs(totalGain)}</div>
          </div>
          <div className="w-px h-12 bg-indigo-500 hidden md:block"></div>
          <div className="flex-1">
            <p className="text-indigo-200 text-sm font-semibold uppercase tracking-wider mb-1">Overall Appreciation</p>
            <div className="inline-flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full text-sm font-bold">
              <TrendingUp size={16} /> {appreciation.toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      {properties.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 p-12 text-center">
          <h3 className="text-lg font-bold text-gray-900">No properties found</h3>
          <p className="text-gray-500 mt-2">Your property portfolio is currently empty.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {properties.map((property) => {
            const gain = (property.currentValue || property.purchasePrice) - property.purchasePrice;
            const pct = (gain / property.purchasePrice) * 100;
            const purchaseDate = property.purchaseDate ? new Date(property.purchaseDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'N/A';

            return (
              <div key={property.id} className="bg-white rounded-2xl shadow-sm border border-gray-100/80 overflow-hidden flex flex-col transition-all duration-200 hover:shadow-md group">
                <div className="h-56 bg-gray-200 relative overflow-hidden">
                  <img src={property.project?.imageUrls?.[0] || "/images/placeholder.jpg"} alt={property.project?.name || "Project"} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-3 left-3 flex gap-2">
                    <span className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-indigo-700 shadow-sm">
                      {property.status || "Active"}
                    </span>
                  </div>
                </div>
                
                <div className="p-6 flex-grow flex flex-col">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-xl text-gray-900">{property.project?.name || "Property Name"}</h3>
                      <p className="text-sm font-medium text-gray-500 mt-1">{property.project?.developer || "Developer"}</p>
                    </div>
                    <div className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg text-sm font-bold border border-indigo-100">
                      {property.unitNumber || "Unit"}
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center text-sm text-gray-600 gap-2">
                      <MapPin size={16} className="text-gray-400" />
                      {property.project?.corridor || "Corridor"}, {property.project?.city || "City"}
                    </div>
                    <div className="flex items-center text-sm text-gray-600 gap-2">
                      <Calendar size={16} className="text-gray-400" />
                      Purchased: {purchaseDate}
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-5 border-t border-gray-100 grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Buy Price</div>
                      <div className="text-base font-bold text-gray-900">{formatLakhs(property.purchasePrice)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Current Val</div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-indigo-600">{formatLakhs(property.currentValue || property.purchasePrice)}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${pct >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {pct >= 0 ? "+" : ""}{pct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <Link href={`/portal/properties/${property.id}`} className="w-full bg-gray-50 hover:bg-indigo-50 text-indigo-600 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors border border-gray-100 hover:border-indigo-100">
                      View Details <ArrowRight size={16} />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
