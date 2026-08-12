"use client";

import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceDot,
} from "recharts";

interface PriceHistoryEntry {
  year: number;
  price: number;
  yoyChange: number;
}

interface AppreciationChartProps {
  priceHistory: PriceHistoryEntry[];
  purchaseYear: number;
  purchasePrice: number;
  currentValue: number;
  corridorName: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100">
        <p className="text-xs font-bold text-gray-900 mb-1">{label}</p>
        <p className="text-xs text-indigo-600 font-semibold">
          ₹{(data.price / 100000).toFixed(1)}L
        </p>
        {data.yoyChange !== 0 && (
          <p
            className={`text-[10px] mt-1 ${
              data.yoyChange > 0 ? "text-emerald-500" : "text-red-500"
            }`}
          >
            {data.yoyChange > 0 ? "+" : ""}
            {data.yoyChange}% YoY
          </p>
        )}
      </div>
    );
  }
  return null;
};

export default function AppreciationChart({
  priceHistory,
  purchaseYear,
  purchasePrice,
  currentValue,
  corridorName,
}: AppreciationChartProps) {
  // Format data for Recharts
  const data = priceHistory.map((h) => ({
    name: h.year.toString(),
    price: h.price,
    yoyChange: h.yoyChange,
  }));

  const yDomainMin = Math.min(...data.map((d) => d.price), purchasePrice) * 0.9;
  const yDomainMax = Math.max(...data.map((d) => d.price), currentValue) * 1.1;

  return (
    <div className="w-full h-64 mt-4">
      <div className="flex justify-between items-end mb-4">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Appreciation Trend</h3>
          <p className="text-xs text-gray-500">{corridorName} Average</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 20, right: 20, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#6b7280", fontSize: 11 }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#6b7280", fontSize: 11 }}
            tickFormatter={(val) => `₹${(val / 100000).toFixed(0)}L`}
            domain={[yDomainMin, yDomainMax]}
            width={50}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#4F46E5"
            strokeWidth={3}
            dot={{ r: 4, fill: "#4F46E5", strokeWidth: 2, stroke: "#fff" }}
            activeDot={{ r: 6, fill: "#4F46E5", stroke: "#fff", strokeWidth: 2 }}
            fill="url(#colorPrice)"
          />
          {purchaseYear && (
            <ReferenceDot
              x={purchaseYear.toString()}
              y={purchasePrice}
              r={6}
              fill="#F59E0B"
              stroke="#fff"
              strokeWidth={2}
            />
          )}
          {currentValue && (
            <ReferenceDot
              x={data[data.length - 1]?.name}
              y={currentValue}
              r={6}
              fill="#10B981"
              stroke="#fff"
              strokeWidth={2}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-2 justify-center text-[10px] text-gray-500 font-medium">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#4F46E5]"></span> Market Trend
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#F59E0B]"></span> Purchase Point
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#10B981]"></span> Current Est. Value
        </div>
      </div>
    </div>
  );
}
