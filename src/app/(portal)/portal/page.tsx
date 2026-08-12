"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { TrendingUp, ArrowRight, Wallet, Home, LineChart } from "lucide-react";

export default function PortalDashboard() {
  const { data: session } = useSession();
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

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const totalInvested = properties.reduce((acc, p) => acc + (p.purchasePrice || 0), 0);
  const totalValue = properties.reduce((acc, p) => acc + (p.currentValue || p.purchasePrice || 0), 0);
  const totalGain = totalValue - totalInvested;
  const appreciation = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-20 bg-gray-200 animate-pulse rounded-xl w-full max-w-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-gray-200 animate-pulse rounded-xl" />)}
        </div>
        <div className="h-64 bg-gray-200 animate-pulse rounded-xl w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <section>
        <h1 className="text-3xl font-bold text-gray-900 font-display">
          Welcome back, {session?.user?.name || "Client"}
        </h1>
        <p className="text-gray-500 mt-1">{currentDate}</p>
      </section>

      {/* Portfolio Summary */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 p-6 transition-all duration-200 hover:shadow-md">
          <div className="flex items-center gap-3 mb-2 text-gray-500">
            <Wallet className="text-indigo-500" size={20} />
            <h3 className="text-sm font-semibold uppercase tracking-wider">Portfolio Value</h3>
          </div>
          <div className="text-3xl font-bold text-gray-900 mt-2">
            {formatLakhs(totalValue)}
          </div>
          <div className="mt-2 inline-flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
            <TrendingUp size={12} /> {appreciation.toFixed(1)}% Appr.
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 p-6 transition-all duration-200 hover:shadow-md">
          <div className="flex items-center gap-3 mb-2 text-gray-500">
            <Home className="text-indigo-500" size={20} />
            <h3 className="text-sm font-semibold uppercase tracking-wider">Total Invested</h3>
          </div>
          <div className="text-3xl font-bold text-gray-900 mt-2">
            {formatLakhs(totalInvested)}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 p-6 transition-all duration-200 hover:shadow-md">
          <div className="flex items-center gap-3 mb-2 text-gray-500">
            <LineChart className="text-indigo-500" size={20} />
            <h3 className="text-sm font-semibold uppercase tracking-wider">Total Gain</h3>
          </div>
          <div className={`text-3xl font-bold mt-2 ${totalGain >= 0 ? "text-green-600" : "text-red-600"}`}>
            {totalGain >= 0 ? "+" : ""}{formatLakhs(totalGain)}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 p-6 transition-all duration-200 hover:shadow-md flex flex-col justify-center">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Properties Count</h3>
          <div className="text-4xl font-bold text-gray-900 mt-2">{properties.length}</div>
        </div>
      </section>

      {/* Properties Preview */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Your Properties</h2>
          <Link href="/portal/properties" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors">
            View All <ArrowRight size={16} />
          </Link>
        </div>

        {properties.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 p-12 text-center">
            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Home size={32} className="text-indigo-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">No properties yet</h3>
            <p className="text-gray-500 mt-2 max-w-md mx-auto">
              Your properties will appear here once your purchase is recorded. Contact your advisor for more information.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.slice(0, 3).map((property) => {
              const gain = (property.currentValue || property.purchasePrice) - property.purchasePrice;
              const pct = (gain / property.purchasePrice) * 100;
              return (
                <div key={property.id} className="bg-white rounded-2xl shadow-sm border border-gray-100/80 overflow-hidden flex flex-col transition-all duration-200 hover:shadow-md hover:-translate-y-1">
                  <div className="h-48 bg-gray-200 relative">
                    {/* Placeholder or image */}
                    <img src={property.project?.imageUrls?.[0] || "/images/placeholder.jpg"} alt={property.project?.name || "Project"} className="w-full h-full object-cover" />
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold text-gray-900 shadow-sm">
                      {property.unitNumber || "Unit"}
                    </div>
                  </div>
                  <div className="p-5 flex-grow flex flex-col">
                    <h3 className="font-bold text-lg text-gray-900">{property.project?.name || "Property Name"}</h3>
                    <p className="text-sm text-gray-500 mt-1">{property.project?.corridor || "Location"}</p>
                    
                    <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-end">
                      <div>
                        <div className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Current Value</div>
                        <div className="text-lg font-bold text-gray-900">{formatLakhs(property.currentValue || property.purchasePrice)}</div>
                      </div>
                      <div className={`px-2 py-1 rounded-md text-xs font-bold ${pct >= 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                        {pct >= 0 ? "+" : ""}{pct.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Market Pulse */}
      <section className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl p-6 md:p-8 border border-indigo-100/50">
        <h2 className="text-xl font-bold text-indigo-900 mb-3 flex items-center gap-2">
          <TrendingUp className="text-indigo-600" /> Hyderabad Market Pulse
        </h2>
        <p className="text-indigo-800/80 text-sm md:text-base leading-relaxed max-w-4xl">
          The real estate sector in Hyderabad continues its robust growth trajectory, driven by strong IT sector expansions and premium infrastructure development. West corridors like Neopolis and Kokapet remain high-demand zones with an expected appreciation of 12-15% annually, while upcoming micro-markets in the North and East show promising early-stage investment potential.
        </p>
      </section>
    </div>
  );
}
