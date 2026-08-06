"use client";

import React, { useState, useEffect } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";

interface BudgetDistributionProps {
  data: { name: string; value: number }[];
}

export default function BudgetDistribution({ data }: BudgetDistributionProps) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!isHydrated) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-[#8A8A9E] animate-pulse">
        Loading budget distribution...
      </div>
    );
  }

  const COLORS = ["#7C6EF5", "#5B4FE0", "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6"];

  return (
    <div className="h-64 w-full pt-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 15, right: 10, left: -25, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0EDFA" />
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 10, fill: "#8A8A9E" }}
            axisLine={{ stroke: "#F0EDFA" }}
            tickLine={false}
          />
          <YAxis 
            tick={{ fontSize: 10, fill: "#8A8A9E" }}
            axisLine={false}
            tickLine={false}
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
          <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={32}>
            {data.map((entry, index) => (
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
