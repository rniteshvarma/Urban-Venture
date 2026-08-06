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
      <div className="h-64 flex items-center justify-center text-xs text-[#8A8A9E] animate-pulse">
        Loading status breakdown...
      </div>
    );
  }

  // LoopAI vibrant color palette matching pill badges across CRM
  const COLORS = ["#5B4FE0", "#7C6EF5", "#3B82F6", "#10B981", "#F59E0B", "#E11D48"];

  return (
    <div className="h-64 w-full pt-2">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            innerRadius={55}
            outerRadius={75}
            paddingAngle={4}
            dataKey="value"
            cornerRadius={6}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              backgroundColor: "#FFFFFF", 
              border: "none",
              borderRadius: "14px",
              boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
              fontFamily: "Inter",
              padding: "10px 14px"
            }} 
          />
          <Legend 
            verticalAlign="bottom" 
            height={36} 
            iconSize={8}
            iconType="circle"
            wrapperStyle={{ fontSize: "10px", fontFamily: "Inter", color: "#8A8A9E" }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
