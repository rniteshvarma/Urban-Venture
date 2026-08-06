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
      <div className="h-64 flex items-center justify-center text-xs text-[#8A8A9E] animate-pulse">
        Loading corridor insights...
      </div>
    );
  }

  const chartData = data.slice(0, 5).map(item => ({
    name: item.name.replace("Corridor", "").trim(),
    value: item.count
  }));

  const COLORS = ["#5B4FE0", "#7C6EF5", "#3B82F6", "#06B6D4", "#10B981"];

  return (
    <div className="h-64 w-full pt-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={chartData}
          margin={{ top: 10, right: 15, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F0EDFA" />
          <XAxis 
            type="number"
            tick={{ fontSize: 10, fill: "#8A8A9E" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            type="category"
            dataKey="name" 
            tick={{ fontSize: 11, fill: "#1A1A2E", fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
            width={110}
          />
          <Tooltip
            cursor={{ fill: "rgba(91, 79, 224, 0.04)" }}
            contentStyle={{
              backgroundColor: "#FFFFFF",
              border: "none",
              borderRadius: "14px",
              boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
              fontFamily: "Inter",
              padding: "10px 14px"
            }}
          />
          <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={18}>
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={COLORS[index % COLORS.length]} 
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
