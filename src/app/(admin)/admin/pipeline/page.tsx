"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { DndContext, DragEndEvent, useDroppable, useDraggable } from "@dnd-kit/core";
import { RefreshCw, AlertTriangle, ChevronRight, User } from "lucide-react";

interface KanbanCard {
  id: string;
  leadId: string;
  leadName: string;
  leadStatus: string;
  estimatedValue: number;
  probability: number;
  assignedTo: string;
  targetCloseDate: string | null;
  activeStageKey: string;
  activeStageName: string;
  progressPercent: number;
  isStale: boolean;
  daysInStage: number;
  projectName: string;
  city: string;
}

const COLUMN_KEYS = [
  "INITIAL_CONTACT",
  "NEEDS_ASSESSMENT",
  "SITE_VISIT",
  "PROPOSAL_SENT",
  "NEGOTIATION",
  "LEGAL_REVIEW",
  "CLOSING"
];

const COLUMN_LABELS: Record<string, string> = {
  INITIAL_CONTACT: "Initial Contact",
  NEEDS_ASSESSMENT: "Needs Assessment",
  SITE_VISIT: "Site Visit",
  PROPOSAL_SENT: "Proposal Sent",
  NEGOTIATION: "Negotiation",
  LEGAL_REVIEW: "Legal Review",
  CLOSING: "Closing (Booking/Signing)"
};

// Droppable Column Component
function KanbanColumn({ id, title, cards }: { id: string; title: string; cards: KanbanCard[] }) {
  const { setNodeRef } = useDroppable({ id });

  const totalValue = cards.reduce((sum, card) => sum + card.estimatedValue, 0);
  const formatTotalValue = (val: number) => {
    return val < 100 ? `₹${val.toFixed(0)}L` : `₹${(val / 100).toFixed(1)}Cr`;
  };

  return (
    <div className="crm-card p-0 w-80 min-h-[500px] flex-shrink-0 flex flex-col overflow-hidden bg-white">
      {/* Column Header */}
      <div className="p-4 border-b border-[#F5F3FB] bg-[#F9F8FD] flex items-center justify-between">
        <div>
          <h3 className="font-display text-xs font-bold text-[#1A1A2E] uppercase tracking-wider">
            {title}
          </h3>
          <span className="text-[10px] text-[#8A8A9E] font-semibold block mt-0.5">
            {cards.length} Leads · {formatTotalValue(totalValue)}
          </span>
        </div>
        <ChevronRight size={14} className="text-[#8A8A9E]" />
      </div>

      {/* Cards Area */}
      <div 
        ref={setNodeRef} 
        className="flex-grow p-3 space-y-3 overflow-y-auto max-h-[600px] bg-[#FDFCFE] scrollbar-thin"
      >
        {cards.length === 0 ? (
          <div className="h-28 border border-dashed border-[#E8E5F5] rounded-2xl flex items-center justify-center text-center p-4">
            <span className="text-xs text-[#8A8A9E] italic">Drag leads here</span>
          </div>
        ) : (
          cards.map((card) => <KanbanCardItem key={card.id} card={card} />)
        )}
      </div>
    </div>
  );
}

// Draggable Card Item Component
function KanbanCardItem({ card }: { card: KanbanCard }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 50,
      }
    : undefined;

  const formatPrice = (val: number) => {
    return val < 100 ? `₹${val}L` : `₹${(val / 100).toFixed(1)}Cr`;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`crm-card p-4 transition-all cursor-grab active:cursor-grabbing select-none relative group space-y-3 border border-[#F0EDFA] ${
        isDragging ? "opacity-30 border-[#5B4FE0]" : card.isStale ? "ring-2 ring-rose-400" : ""
      }`}
    >
      {/* Top badges */}
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px] bg-[#F4F0FF] text-[#5B4FE0] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
          {card.city}
        </span>
        
        <div className="flex items-center gap-1">
          {card.isStale && (
            <span className="badge bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
              ⚠️ Stale
            </span>
          )}
          <span className="badge bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
            {card.probability}%
          </span>
        </div>
      </div>

      {/* Title */}
      <div>
        <h4 className="font-display font-bold text-sm text-[#1A1A2E] group-hover:text-[#5B4FE0] transition-colors flex items-center gap-1.5">
          <div className="crm-avatar-ring shrink-0">
            <div className="w-5 h-5 rounded-full bg-[#EBE7F5] flex items-center justify-center text-[#5B4FE0] font-bold text-[9px]">
              {card.leadName.charAt(0)}
            </div>
          </div>
          <span className="truncate">{card.leadName}</span>
        </h4>
        <span className="text-xs text-[#8A8A9E] mt-0.5 block font-medium truncate">
          {card.projectName || "No matched project"}
        </span>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-[#8A8A9E]">
          <span>Progress</span>
          <span className="font-bold text-[#1A1A2E]">{card.progressPercent}%</span>
        </div>
        <div className="w-full bg-[#F0EEFA] h-1.5 rounded-full overflow-hidden">
          <div 
            className="h-full crm-gradient-peach-mint rounded-full transition-all duration-300" 
            style={{ width: `${card.progressPercent}%` }}
          />
        </div>
      </div>

      {/* Footer details */}
      <div className="flex items-center justify-between text-[10px] pt-2 border-t border-[#F5F3FB]">
        <div>
          <span className="text-[#8A8A9E] block">Value</span>
          <span className="font-bold text-[#1A1A2E] text-xs">{formatPrice(card.estimatedValue)}</span>
        </div>
        <div className="text-right">
          <span className="text-[#8A8A9E] block">Time in Stage</span>
          <span className={`font-bold ${card.isStale ? "text-rose-600" : "text-[#1A1A2E]"}`}>
            {card.daysInStage} Days
          </span>
        </div>
      </div>

      {/* Detail page redirect trigger */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Link 
          href={`/admin/leads?id=${card.leadId}`}
          className="bg-[#F4F0FF] hover:bg-[#EBE5FB] text-[10px] p-1.5 rounded-full block font-bold text-[#5B4FE0] cursor-pointer shadow-xs"
          title="Open Roadmap Details"
          onPointerDown={(e) => e.stopPropagation()}
        >
          ↗
        </Link>
      </div>
    </div>
  );
}

export default function AdminPipelinePage() {
  const [columns, setColumns] = useState<Record<string, KanbanCard[]>>({});
  const [staleCount, setStaleCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [cityFilter, setCityFilter] = useState("");

  async function loadPipelineData() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/pipeline");
      if (res.ok) {
        const data = await res.json();
        setColumns(data.columns || {});
        setStaleCount(data.staleCount || 0);
      }
    } catch (err) {
      console.error("Failed to load pipeline Kanban data", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    setIsMounted(true);
    loadPipelineData();
  }, []);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const cardId = active.id as string;
    const targetColumn = over.id as string;

    let sourceColumn = "";
    let activeCard: KanbanCard | null = null;

    for (const colKey of Object.keys(columns)) {
      const card = columns[colKey].find((c) => c.id === cardId);
      if (card) {
        sourceColumn = colKey;
        activeCard = card;
        break;
      }
    }

    if (!activeCard || sourceColumn === targetColumn) return;

    // Optimistic Update
    const newColumns = { ...columns };
    newColumns[sourceColumn] = newColumns[sourceColumn].filter((c) => c.id !== cardId);
    
    const updatedCard = { ...activeCard, activeStageKey: targetColumn };
    newColumns[targetColumn] = [...newColumns[targetColumn], updatedCard];
    
    setColumns(newColumns);

    try {
      const res = await fetch("/api/admin/pipeline", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roadmapId: cardId,
          targetStageKey: targetColumn
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.details ? `${data.error}: ${data.details}` : (data.error || "Failed to save movement"));
      }
      
      loadPipelineData();
    } catch (err: any) {
      console.error("Failed to move card in pipeline", err);
      alert(`Failed to update lead stage: ${err.message || "Reverting layout."}`);
      loadPipelineData();
    }
  };

  const getFilteredColumns = () => {
    const filtered: Record<string, KanbanCard[]> = {};
    
    for (const colKey of COLUMN_KEYS) {
      const cards = columns[colKey] || [];
      filtered[colKey] = cards.filter((card) => {
        const matchesSearch = card.leadName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             card.projectName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCity = cityFilter === "" || card.city.toLowerCase() === cityFilter.toLowerCase();
        return matchesSearch && matchesCity;
      });
    }

    return filtered;
  };

  if (!isMounted) {
    return (
      <div className="flex-grow flex items-center justify-center p-12 text-[#8A8A9E] animate-pulse text-xs">
        Initializing Kanban Board...
      </div>
    );
  }

  const filteredColumns = getFilteredColumns();
  const displayStaleCount = Object.values(filteredColumns)
    .flatMap(c => c)
    .filter(c => c.isStale).length;

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 flex-grow flex flex-col animate-fade-in w-full">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#F0EDFA]">
        <div>
          <span className="text-[11px] text-[#5B4FE0] font-bold uppercase tracking-widest block mb-1">
            Lead Closure Pipeline
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#1A1A2E]">
            Kanban Board
          </h1>
        </div>

        <button
          onClick={loadPipelineData}
          disabled={isLoading}
          className="crm-btn-secondary text-xs"
        >
          <RefreshCw size={14} className={isLoading ? "animate-spin text-[#5B4FE0]" : "text-[#5B4FE0]"} />
          <span>Refresh Board</span>
        </button>
      </div>

      {/* Stale Leads Banner Alert */}
      {displayStaleCount > 0 && (
        <div className="bg-rose-50 border border-rose-200/60 p-4 rounded-2xl text-xs text-rose-800 flex items-center gap-3 animate-slide-in">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
          <div>
            <span className="font-bold uppercase tracking-wider block text-[10px] text-rose-600 mb-0.5">Stale Pipeline Alert</span>
            There are <strong>{displayStaleCount} leads</strong> stuck in progress for over 7 days. Action items need review to maintain client momentum.
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="crm-card p-6 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
        <div className="sm:col-span-2">
          <input
            type="text"
            placeholder="Filter leads by client name or project name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#F9F8FD] border border-[#E8E5F5] rounded-full px-4 py-2 text-xs text-[#1A1A2E] placeholder-[#8A8A9E] focus:outline-none focus:border-[#5B4FE0]"
          />
        </div>
        <div>
          <input
            type="text"
            placeholder="Filter by city (e.g. Hyderabad)"
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="w-full bg-[#F9F8FD] border border-[#E8E5F5] rounded-full px-4 py-2 text-xs text-[#1A1A2E] placeholder-[#8A8A9E] focus:outline-none focus:border-[#5B4FE0]"
          />
        </div>
      </div>

      {/* Board Columns (Horizontal Scrolling) */}
      <div className="flex-grow overflow-x-auto pb-6 -mx-4 px-4 flex gap-5 scrollbar-thin">
        {isLoading ? (
          <div className="flex-grow flex items-center justify-center p-12 text-[#8A8A9E] animate-pulse text-xs">
            Loading Kanban stages and active leads...
          </div>
        ) : (
          <DndContext onDragEnd={handleDragEnd}>
            {COLUMN_KEYS.map((colKey) => (
              <KanbanColumn
                key={colKey}
                id={colKey}
                title={COLUMN_LABELS[colKey]}
                cards={filteredColumns[colKey] || []}
              />
            ))}
          </DndContext>
        )}
      </div>
    </div>
  );
}
