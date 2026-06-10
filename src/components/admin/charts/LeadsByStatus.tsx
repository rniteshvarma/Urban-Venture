"use client";

import React, { useState, useEffect } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

interface LeadsByStatusProps {
  data: { name: string; value: number }[];
}

export default function LeadsByStatus({ data }: LeadsByStatusProps) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!isHydrated) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-text-secondary">
        Loading status breakdown...
      </div>
    );
  }

  // Refined SaaS blue/slate color palette
  const COLORS = ["#2563EB", "#3B82F6", "#60A5FA", "#93C5FD", "#94A3B8", "#CBD5E1"];

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              backgroundColor: "#FFFFFF", 
              border: "1px solid #E2E8F0",
              borderRadius: "6px",
              fontFamily: "var(--font-sans)"
            }} 
          />
          <Legend 
            verticalAlign="bottom" 
            height={36} 
            iconSize={8}
            iconType="circle"
            wrapperStyle={{ fontSize: "10px", fontFamily: "var(--font-sans)" }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
