"use client";

import React, { useState, useEffect } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";

interface CorridorHeatmapProps {
  data: { name: string; count: number }[];
}

export default function CorridorHeatmap({ data }: CorridorHeatmapProps) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!isHydrated) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-text-secondary">
        Loading corridor insights...
      </div>
    );
  }

  // Cap displaying data to top 5 corridors for spacing
  const chartData = data.slice(0, 5).map(item => ({
    name: item.name.replace("Corridor", "").trim(),
    value: item.count
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={chartData}
          margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
          <XAxis 
            type="number"
            tick={{ fontSize: 10, fill: "#475569" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            type="category"
            dataKey="name" 
            tick={{ fontSize: 10, fill: "#0F172A", fontWeight: 500 }}
            axisLine={{ stroke: "#E2E8F0" }}
            tickLine={false}
            width={100}
          />
          <Tooltip
            cursor={{ fill: "rgba(37, 99, 235, 0.02)" }}
            contentStyle={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "6px",
              fontFamily: "var(--font-sans)",
            }}
          />
          <Bar dataKey="value" fill="#2563EB" radius={[0, 4, 4, 0]} barSize={12}>
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={index === 0 ? "#2563EB" : "#64748B"} 
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
