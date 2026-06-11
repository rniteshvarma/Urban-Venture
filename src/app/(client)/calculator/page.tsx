"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line
} from "recharts";
import { 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  MapPin, 
  ArrowRight, 
  CheckCircle2, 
  HelpCircle,
  Sparkles,
  Info
} from "lucide-react";

interface Corridor {
  id: string;
  corridor: string;
  historicalCAGR: number;
  projectedCAGRMin: number;
  projectedCAGRMax: number;
  rentalYieldMin: number;
  rentalYieldMax: number;
  infraScore: number;
  demandScore: number;
  riskLevel: string;
}

function CalculatorContent() {
  const searchParams = useSearchParams();
  const initialAmountParam = searchParams.get("amount");
  const initialCorridorParam = searchParams.get("corridor");

  // Inputs
  const [initialAmount, setInitialAmount] = useState<number>(
    initialAmountParam ? parseFloat(initialAmountParam) : 50
  );
  const [years, setYears] = useState<number>(10);
  const [corridors, setCorridors] = useState<Corridor[]>([]);
  const [selectedCorridorId, setSelectedCorridorId] = useState<string>("CUSTOM");
  
  // Custom corridor rates
  const [customCagrMin, setCustomCagrMin] = useState<number>(12);
  const [customCagrMax, setCustomCagrMax] = useState<number>(18);
  const [customRentMin, setCustomRentMin] = useState<number>(2);
  const [customRentMax, setCustomRentMax] = useState<number>(4);

  // Output
  const [calculationData, setCalculationData] = useState<any>(null);
  const [takeaways, setTakeaways] = useState<string[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [activeViewTab, setActiveViewTab] = useState<"chart" | "table">("chart");

  // Lead capture form
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(false);

  // Load corridors
  useEffect(() => {
    async function loadCorridors() {
      try {
        const res = await fetch("/api/calculator/corridors");
        if (res.ok) {
          const data = await res.json();
          setCorridors(data.corridors || []);
          
          // If corridor param is passed, try matching by name
          if (initialCorridorParam) {
            const matched = (data.corridors || []).find(
              (c: Corridor) => c.corridor.toLowerCase().includes(initialCorridorParam.toLowerCase())
            );
            if (matched) {
              setSelectedCorridorId(matched.id);
            }
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadCorridors();
  }, [initialCorridorParam]);

  // Run calculation
  const triggerCalculation = async () => {
    setIsCalculating(true);
    try {
      const payload: any = {
        initialAmount,
        years,
        corridorId: selectedCorridorId,
      };

      if (selectedCorridorId === "CUSTOM") {
        payload.customCagrMin = customCagrMin;
        payload.customCagrMax = customCagrMax;
        payload.customRentMin = customRentMin;
        payload.customRentMax = customRentMax;
      }

      const res = await fetch("/api/calculator/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        setCalculationData(data.summary);
        setTakeaways(data.takeaways || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCalculating(false);
    }
  };

  useEffect(() => {
    triggerCalculation();
  }, [initialAmount, years, selectedCorridorId, customCagrMin, customCagrMax, customRentMin, customRentMax]);

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadName.trim() || !leadEmail.trim() || !leadPhone.trim()) return;

    setIsSubmittingLead(true);
    try {
      const corridorText = selectedCorridorId === "CUSTOM" 
        ? "Custom Parameters" 
        : corridors.find(c => c.id === selectedCorridorId)?.corridor || "General Hyderabad";

      const res = await fetch("/api/calculator/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: leadName,
          email: leadEmail,
          phone: leadPhone,
          budget: initialAmount,
          horizon: years,
          city: "Hyderabad",
          notes: `ROI Calculator Lead. Corridor interest: ${corridorText}. Simulated ROI return forecast generated and sent to dashboard.`
        })
      });

      if (res.ok) {
        setLeadSubmitted(true);
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(`Failed to submit inquiry: ${errData.error || "Failed to submit inquiry. Please try again."}${errData.details ? " - " + errData.details : ""}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Error submitting inquiry: ${err.message || "Connection failed"}`);
    } finally {
      setIsSubmittingLead(false);
    }
  };

  const formatPrice = (val: number) => {
    return val < 100 ? `₹${val.toFixed(1)}L` : `₹${(val / 100).toFixed(2)}Cr`;
  };

  // Prepare chart data comparing final year values
  const getChartData = () => {
    if (!calculationData) return [];
    
    return [
      {
        name: "Real Estate (Cons.)",
        Value: calculationData.finalRealEstateMin,
        fill: "#3B82F6"
      },
      {
        name: "Real Estate (Opt.)",
        Value: calculationData.finalRealEstateMax,
        fill: "#2563EB"
      },
      {
        name: "Nifty 50 Index (12%)",
        Value: calculationData.finalNifty,
        fill: "#10B981"
      },
      {
        name: "Gold (9%)",
        Value: calculationData.finalGold,
        fill: "#F59E0B"
      },
      {
        name: "Fixed Deposit (6.5%)",
        Value: calculationData.finalFD,
        fill: "#64748B"
      }
    ];
  };

  const selectedCorridor = corridors.find(c => c.id === selectedCorridorId);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">
      {/* Header Banner */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <span className="text-[10px] text-[#2563EB] font-bold uppercase tracking-widest border border-blue-200/50 bg-blue-50/50 px-3 py-1 rounded-full inline-block">
          Investment Intelligence
        </span>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Hyderabad ROI & Appreciation Simulator
        </h1>
        <p className="text-sm text-slate-500 leading-relaxed">
          Simulate compounding returns in major Hyderabad real estate corridors. Contrast appreciation + rental yield projections with liquid equity, gold, and debt benchmarks.
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Sliders & Inputs (4 Cols) */}
        <div className="lg:col-span-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-6">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-[#2563EB]" /> Configure Parameters
          </h2>

          {/* Initial Capital Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold text-slate-700">
              <span>Investment Amount</span>
              <span className="text-[#2563EB] font-bold">₹{initialAmount} Lakhs</span>
            </div>
            <input 
              type="range" 
              min="10" 
              max="500" 
              step="5"
              value={initialAmount}
              onChange={(e) => setInitialAmount(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#2563EB]"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>₹10L</span>
              <span>₹5.0Cr</span>
            </div>
          </div>

          {/* Horizon Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold text-slate-700">
              <span>Investment Horizon</span>
              <span className="text-[#2563EB] font-bold">{years} Years</span>
            </div>
            <input 
              type="range" 
              min="3" 
              max="15" 
              step="1"
              value={years}
              onChange={(e) => setYears(parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#2563EB]"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>3 Years</span>
              <span>15 Years</span>
            </div>
          </div>

          {/* Corridor Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Select Growth Corridor</label>
            <select
              value={selectedCorridorId}
              onChange={(e) => setSelectedCorridorId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#2563EB] transition-colors"
            >
              <option value="CUSTOM">Custom Parameters (Configure Below)</option>
              {corridors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.corridor} ({c.projectedCAGRMin}-{c.projectedCAGRMax}% CAGR)
                </option>
              ))}
            </select>
          </div>

          {/* Custom / Corridor Stats parameters block */}
          {selectedCorridorId === "CUSTOM" ? (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-4">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Custom ROI Parameters</span>
              
              {/* Custom CAGR slider */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between font-semibold text-slate-700">
                  <span>Appreciation CAGR Min</span>
                  <span className="text-slate-800 font-bold">{customCagrMin}%</span>
                </div>
                <input 
                  type="range" 
                  min="5" 
                  max="25" 
                  step="0.5"
                  value={customCagrMin}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setCustomCagrMin(val);
                    if (val > customCagrMax) setCustomCagrMax(val);
                  }}
                  className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#2563EB]"
                />
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex justify-between font-semibold text-slate-700">
                  <span>Appreciation CAGR Max</span>
                  <span className="text-slate-800 font-bold">{customCagrMax}%</span>
                </div>
                <input 
                  type="range" 
                  min="5" 
                  max="25" 
                  step="0.5"
                  value={customCagrMax}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setCustomCagrMax(val);
                    if (val < customCagrMin) setCustomCagrMin(val);
                  }}
                  className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#2563EB]"
                />
              </div>

              {/* Custom rent slider */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between font-semibold text-slate-700">
                  <span>Rental Yield Min</span>
                  <span className="text-slate-800 font-bold">{customRentMin}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="8" 
                  step="0.5"
                  value={customRentMin}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setCustomRentMin(val);
                    if (val > customRentMax) setCustomRentMax(val);
                  }}
                  className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#2563EB]"
                />
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex justify-between font-semibold text-slate-700">
                  <span>Rental Yield Max</span>
                  <span className="text-slate-800 font-bold">{customRentMax}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="8" 
                  step="0.5"
                  value={customRentMax}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setCustomRentMax(val);
                    if (val < customRentMin) setCustomRentMin(val);
                  }}
                  className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#2563EB]"
                />
              </div>
            </div>
          ) : (
            selectedCorridor && (
              <div className="bg-blue-50/20 p-4 rounded-xl border border-blue-100/50 space-y-3 text-xs">
                <div className="flex items-center gap-1 text-[#2563EB] font-bold">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Corridor Highlights</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-[11px] pt-1">
                  <div>
                    <span className="text-slate-400 block font-semibold">Risk Rating</span>
                    <span className="font-bold text-slate-700 uppercase tracking-wide">{selectedCorridor.riskLevel}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Historical CAGR</span>
                    <span className="font-bold text-slate-700">{selectedCorridor.historicalCAGR}%</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Infrastructure</span>
                    <span className="font-bold text-slate-700">{selectedCorridor.infraScore} / 10</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Market Demand</span>
                    <span className="font-bold text-slate-700">{selectedCorridor.demandScore} / 10</span>
                  </div>
                </div>
              </div>
            )
          )}
        </div>

        {/* Right Column: Comparative Results & Charts (8 Cols) */}
        <div className="lg:col-span-8 space-y-6 flex flex-col">
          {/* Output Card */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex-grow flex flex-col justify-between space-y-6">
            
            {/* Results Title and Tab select */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-[#2563EB]" /> Wealth Multiplier Projections
                </h2>
                <p className="text-[10px] text-slate-400 mt-0.5">Comparative forecast over {years} years</p>
              </div>

              <div className="flex border border-slate-200 rounded-lg p-0.5 bg-slate-50 text-[10px] uppercase font-bold tracking-wider">
                <button
                  onClick={() => setActiveViewTab("chart")}
                  className={`px-3 py-1.5 rounded transition-all ${
                    activeViewTab === "chart" 
                      ? "bg-white text-slate-800 shadow-sm" 
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  Comparison Chart
                </button>
                <button
                  onClick={() => setActiveViewTab("table")}
                  className={`px-3 py-1.5 rounded transition-all ${
                    activeViewTab === "table" 
                      ? "bg-white text-slate-800 shadow-sm" 
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  Growth Table
                </button>
              </div>
            </div>

            {/* Calculations Loading or Render */}
            {isCalculating || !calculationData ? (
              <div className="h-64 flex items-center justify-center text-xs text-slate-400 animate-pulse">
                Running compounding engine returns simulations...
              </div>
            ) : (
              <div className="flex-grow flex flex-col justify-between">
                
                {/* Highlight Boxes for RE (Cons) vs RE (Opt) */}
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="border border-slate-200/80 bg-slate-50/50 p-4 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1">Conservative Real Estate</span>
                    <span className="text-2xl font-black text-slate-800 leading-none block">
                      {formatPrice(calculationData.finalRealEstateMin)}
                    </span>
                    <span className="text-[9px] text-slate-400 font-bold block mt-1">Apprec: {calculationData.appreciationCagrMin}% · Yield: {calculationData.rentalYieldMin}%</span>
                  </div>

                  <div className="border border-[#2563EB]/20 bg-blue-50/10 p-4 rounded-xl">
                    <span className="text-[10px] text-[#2563EB] uppercase font-bold tracking-wider block mb-1">Optimistic Real Estate</span>
                    <span className="text-2xl font-black text-slate-900 leading-none block">
                      {formatPrice(calculationData.finalRealEstateMax)}
                    </span>
                    <span className="text-[9px] text-[#2563EB]/70 font-bold block mt-1">Apprec: {calculationData.appreciationCagrMax}% · Yield: {calculationData.rentalYieldMax}%</span>
                  </div>
                </div>

                {/* Tab Render: Recharts Chart */}
                {activeViewTab === "chart" ? (
                  <div className="h-64 w-full mt-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={getChartData()}
                        margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fontSize: 9, fill: "#475569" }}
                          axisLine={{ stroke: "#E2E8F0" }}
                          tickLine={false}
                        />
                        <YAxis 
                          tick={{ fontSize: 9, fill: "#475569" }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(v) => `₹${v}L`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#FFFFFF",
                            border: "1px solid #E2E8F0",
                            borderRadius: "8px",
                            fontFamily: "Inter, sans-serif",
                            fontSize: "11px",
                          }}
                          formatter={(value: any) => [`₹${parseFloat(value).toFixed(1)}L`, "Projected Value"]}
                        />
                        <Bar 
                          dataKey="Value" 
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  /* Tab Render: Growth Table */
                  <div className="overflow-x-auto mt-6 border border-slate-200 rounded-lg max-h-64 scrollbar-thin">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[9px] font-bold tracking-wider">
                        <tr>
                          <th className="px-4 py-2">Year</th>
                          <th className="px-4 py-2">Real Estate (Cons.)</th>
                          <th className="px-4 py-2">Real Estate (Opt.)</th>
                          <th className="px-4 py-2">Nifty (12%)</th>
                          <th className="px-4 py-2">Gold (9%)</th>
                          <th className="px-4 py-2">FD (6.5%)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {calculationData.yearlyData.map((row: any) => (
                          <tr key={row.year} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-2 font-bold text-slate-700">Yr {row.year}</td>
                            <td className="px-4 py-2 font-medium text-slate-800">₹{row.realEstateMin.toFixed(1)}L</td>
                            <td className="px-4 py-2 font-medium text-[#2563EB]">₹{row.realEstateMax.toFixed(1)}L</td>
                            <td className="px-4 py-2 text-slate-600">₹{row.nifty.toFixed(1)}L</td>
                            <td className="px-4 py-2 text-slate-600">₹{row.gold.toFixed(1)}L</td>
                            <td className="px-4 py-2 text-slate-600">₹{row.fd.toFixed(1)}L</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AI Takeaways Block */}
          {takeaways.length > 0 && (
            <div className="bg-blue-50/20 border border-blue-200/50 p-5 rounded-2xl space-y-3 animate-fade-in shadow-sm">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#2563EB] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 animate-pulse" /> AI Advisory Insights Takeaways
              </h4>
              <ul className="list-disc pl-4 space-y-2 text-[11px] text-slate-700 leading-relaxed font-medium">
                {takeaways.map((takeaway, idx) => (
                  <li key={idx} className="marker:text-[#2563EB]">{takeaway}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Lead Capture Overlay Section */}
      <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-3xl mx-auto space-y-6 shadow-sm">
        <div className="text-center space-y-2">
          <h3 className="font-display text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
            Receive a Detailed Investment Feasibility Report
          </h3>
          <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
            Get a tailored real estate advisory docket including RERA certifications, developer comparables, exiting timeline logs, and corridor analytics matching this calculation.
          </p>
        </div>

        {leadSubmitted ? (
          <div className="py-6 text-center space-y-3 animate-slide-in">
            <span className="w-12 h-12 rounded-full bg-green-50 border border-green-200 flex items-center justify-center text-green-600 mx-auto text-xl">
              ✓
            </span>
            <h4 className="font-bold text-sm text-slate-800">Feasibility Request Logged!</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              Our Senior Property Advisor has received your simulation parameters. We will contact you at your verified phone number shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleLeadSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <input 
                type="text"
                placeholder="Full Name"
                value={leadName}
                onChange={(e) => setLeadName(e.target.value)}
                className="w-full bg-white border border-slate-200 px-4 py-2.5 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#2563EB] transition-colors"
                required
              />
            </div>
            
            <div className="space-y-1">
              <input 
                type="email"
                placeholder="Email Address"
                value={leadEmail}
                onChange={(e) => setLeadEmail(e.target.value)}
                className="w-full bg-white border border-slate-200 px-4 py-2.5 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#2563EB] transition-colors"
                required
              />
            </div>

            <div className="space-y-1">
              <input 
                type="tel"
                placeholder="Phone Number (with Country Code)"
                value={leadPhone}
                onChange={(e) => setLeadPhone(e.target.value)}
                className="w-full bg-white border border-slate-200 px-4 py-2.5 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#2563EB] transition-colors"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmittingLead}
              className="sm:col-span-3 w-full bg-[#2563EB] hover:bg-blue-700 text-white font-bold uppercase tracking-wider text-xs py-3 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 mt-2 cursor-pointer"
            >
              Get Custom Investment Feasibility Report <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function CalculatorPage() {
  return (
    <Suspense fallback={
      <div className="max-w-6xl mx-auto px-4 py-16 text-center text-slate-500 animate-pulse text-sm">
        Initializing Interactive Compounding Simulator...
      </div>
    }>
      <CalculatorContent />
    </Suspense>
  );
}
