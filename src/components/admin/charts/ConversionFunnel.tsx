"use client";

import React, { useState } from "react";
import { Wallet } from "lucide-react";

interface ConversionFunnelProps {
  data: { name: string; value: number }[];
}

export default function ConversionFunnel({ data }: ConversionFunnelProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Real counts only, under their own names. "Searches" (research-tool runs) is
  // left out: leads also arrive from enquiries, site visits and WhatsApp, so it
  // is not a stage every lead passes through and a rate against it means nothing.
  const funnelStages = (data ?? [])
    .filter((d) => d.name !== "Searches")
    .map((d) => ({ name: d.name, value: Number(d.value) || 0 }));

  if (funnelStages.length === 0 || funnelStages[0].value === 0) {
    return <p className="py-10 text-center text-xs text-[#8A8A9E]">No leads yet — the funnel appears once leads come in.</p>;
  }

  const stagesWithRates = funnelStages.map((stage, idx) => {
    let rate = 100;
    if (idx > 0) {
      const prevVal = funnelStages[idx - 1].value;
      rate = prevVal > 0 ? Math.round((stage.value / prevVal) * 100) : 0;
    }
    return {
      ...stage,
      rate
    };
  });

  return (
    <div className="space-y-6 select-none w-full">
      {/* Main Funnel Chart columns */}
      <div className="grid gap-3.5 relative pt-12 pb-2" style={{ gridTemplateColumns: `repeat(${funnelStages.length}, minmax(0, 1fr))` }}>
        
        {/* Floating Tooltip Card on Hover */}
        {hoveredIdx !== null && (
          <div 
            className="absolute z-20 bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.1)] p-3.5 flex flex-col justify-center gap-1.5 transition-all duration-300 pointer-events-none border border-[#F0EDFA]"
            style={{
              left: `${(hoveredIdx * 100) / funnelStages.length + 4}%`,
              top: "-12px",
              width: "190px",
            }}
          >
            <div className="flex items-center justify-between text-xs text-[#8A8A9E] font-medium">
              <span>Stage</span>
              <span className="bg-[#F4F0FF] text-[#5B4FE0] px-2.5 py-0.5 rounded-full font-bold text-[11px]">
                {stagesWithRates[hoveredIdx].name}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-[#8A8A9E] font-medium">
              <span>Leads Count</span>
              <span className="font-bold text-[#1A1A2E] text-xs">
                {stagesWithRates[hoveredIdx].value}
              </span>
            </div>
          </div>
        )}

        {stagesWithRates.map((stage, idx) => {
          const isActive = hoveredIdx === idx;
          
          const maxVal = stagesWithRates[0].value || 1;
          const heightPercent = stage.value === 0 ? 0 : Math.max(6, Math.round((stage.value / maxVal) * 100));

          return (
            <div 
              key={idx}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="flex flex-col items-center gap-3 group cursor-pointer"
            >
              {/* Column container */}
              <div 
                className="w-full h-56 bg-[#F9F8FD] hover:bg-[#F4F0FF] rounded-2xl flex flex-col justify-end relative transition-all duration-300 overflow-hidden"
              >
                {/* Dynamic fill with soft two-tone gradient */}
                <div 
                  className={`w-full rounded-b-2xl transition-all duration-500 ${
                    isActive 
                      ? "bg-gradient-to-t from-[#5B4FE0] to-[#7C6EF5] opacity-100 shadow-lg shadow-[#5B4FE0]/20" 
                      : "bg-gradient-to-t from-[#7C6EF5]/70 to-[#988CF7]/70 group-hover:opacity-100"
                  }`}
                  style={{ height: `${heightPercent}%` }}
                />

                {/* Floating percentage badge */}
                <div 
                  className="absolute inset-x-0 bottom-[18%] flex justify-center z-10 pointer-events-none"
                >
                  <div 
                    className="bg-white/95 backdrop-blur-xs border border-[#F0EDFA] rounded-2xl px-3 py-1.5 shadow-sm flex flex-col items-center justify-center min-w-[58px] text-center"
                  >
                    <span 
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isActive ? "bg-[#F4F0FF] text-[#5B4FE0]" : "bg-[#F9F8FD] text-[#8A8A9E]"
                      }`}
                    >
                      {stage.rate}%
                    </span>
                    <span className="text-xs font-bold text-[#1A1A2E] mt-0.5">
                      {stage.value}
                    </span>
                  </div>
                </div>
              </div>

              {/* X Axis Label */}
              <span className="text-xs font-bold text-[#8A8A9E] group-hover:text-[#5B4FE0] transition-colors">
                {stage.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
