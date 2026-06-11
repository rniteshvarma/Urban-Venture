"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { DndContext, DragEndEvent, useDroppable, useDraggable } from "@dnd-kit/core";

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
    <div className="flex flex-col bg-surface border border-luxury rounded-card w-80 min-h-[500px] shadow-sm overflow-hidden flex-shrink-0">
      {/* Column Header */}
      <div className="p-4 border-b border-luxury bg-luxury-bg/30 flex items-center justify-between">
        <div>
          <h3 className="font-display text-xs font-bold text-primary uppercase tracking-wider">
            {title}
          </h3>
          <span className="text-[9px] text-text-secondary font-semibold uppercase mt-0.5 block">
            {cards.length} Leads · {formatTotalValue(totalValue)}
          </span>
        </div>
      </div>

      {/* Cards Area */}
      <div 
        ref={setNodeRef} 
        className="flex-grow p-3 space-y-3 overflow-y-auto max-h-[600px] bg-luxury-bg/5 scrollbar-thin"
      >
        {cards.length === 0 ? (
          <div className="h-28 border border-dashed border-luxury/60 rounded flex items-center justify-center text-center p-4">
            <span className="text-[10px] text-text-secondary italic">Drag leads here</span>
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
      className={`bg-surface border p-4 rounded-card hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing select-none relative group space-y-3 ${
        isDragging ? "opacity-30 border-[#C9A84C]" : card.isStale ? "border-red-300" : "border-luxury"
      }`}
    >
      {/* Top badges */}
      <div className="flex items-start justify-between gap-1">
        <span className="text-[8px] bg-luxury-bg border border-luxury text-text-secondary px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
          {card.city}
        </span>
        
        <div className="flex items-center gap-1">
          {card.isStale && (
            <span className="bg-red-50 text-red-600 border border-red-100 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider animate-pulse">
              ⚠️ Stale
            </span>
          )}
          <span className="bg-[#0F1F3D] text-amber-400 text-[8px] font-bold px-1.5 py-0.5 rounded">
            {card.probability}%
          </span>
        </div>
      </div>

      {/* Title */}
      <div>
        <h4 className="font-display font-bold text-xs text-primary group-hover:text-amber-600 transition-colors">
          {card.leadName}
        </h4>
        <span className="text-[9px] text-text-secondary mt-0.5 block font-medium">
          {card.projectName}
        </span>
      </div>

      {/* Progress slider bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[8px] text-text-secondary">
          <span>Progress</span>
          <span>{card.progressPercent}%</span>
        </div>
        <div className="w-full bg-gray-100 h-1 rounded-full overflow-hidden">
          <div 
            className="h-full bg-amber-500 rounded-full transition-all duration-300" 
            style={{ width: `${card.progressPercent}%` }}
          />
        </div>
      </div>

      {/* Footer details */}
      <div className="flex items-center justify-between text-[9px] pt-2 border-t border-luxury/40">
        <div>
          <span className="text-text-secondary block">Value</span>
          <span className="font-bold text-primary">{formatPrice(card.estimatedValue)}</span>
        </div>
        <div className="text-right">
          <span className="text-text-secondary block">Time in Stage</span>
          <span className={`font-semibold ${card.isStale ? "text-red-500" : "text-primary"}`}>
            {card.daysInStage} Days
          </span>
        </div>
      </div>

      {/* Detail page redirect trigger */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Link 
          href={`/admin/leads/${card.leadId}`}
          className="bg-luxury-bg hover:bg-luxury-bg/80 text-[10px] p-1 border border-luxury rounded block font-bold text-primary cursor-pointer"
          title="Open Roadmap Details"
          // Stop drag handlers from hijacking this click
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

    // Find the current column of this card
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
    
    // Remove from source
    newColumns[sourceColumn] = newColumns[sourceColumn].filter((c) => c.id !== cardId);
    
    // Add to target (simulate movement)
    const updatedCard = { ...activeCard, activeStageKey: targetColumn };
    newColumns[targetColumn] = [...newColumns[targetColumn], updatedCard];
    
    setColumns(newColumns);

    // Make API request to database
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
      
      // Reload fresh calculations (e.g. probability changes, stale days, progressPercent)
      loadPipelineData();
    } catch (err: any) {
      console.error("Failed to move card in pipeline", err);
      alert(`Failed to update lead stage: ${err.message || "Reverting layout."}`);
      loadPipelineData(); // Revert by reloading
    }
  };

  // Filter columns locally
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
      <div className="flex-grow flex items-center justify-center p-12 text-text-secondary animate-pulse text-sm">
        Initializing Kanban Board...
      </div>
    );
  }

  const filteredColumns = getFilteredColumns();
  const displayStaleCount = Object.values(filteredColumns)
    .flatMap(c => c)
    .filter(c => c.isStale).length;

  return (
    <div className="space-y-6 flex-grow flex flex-col">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[10px] text-accent font-bold uppercase tracking-widest block">
            Lead Closure Pipeline
          </span>
          <h1 className="font-display text-2xl sm:text-4xl font-bold text-primary">
            Kanban Board
          </h1>
        </div>

        <button
          onClick={loadPipelineData}
          className="px-4 py-2 border border-luxury hover:bg-luxury-bg/40 text-text-primary text-xs font-semibold uppercase tracking-wider rounded-tag transition-colors self-start sm:self-center"
        >
          🔄 Refresh Board
        </button>
      </div>

      {/* Stale Leads Banner Alert */}
      {displayStaleCount > 0 && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-card text-xs text-red-700 flex items-center gap-3 animate-slide-in">
          <span className="text-xl">⚠️</span>
          <div>
            <span className="font-bold uppercase tracking-wider block text-[10px] mb-0.5">Stale Pipeline Alert</span>
            There are {displayStaleCount} leads stuck in progress for over 7 days. Action items need review to maintain client momentum.
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-surface border border-luxury p-4 rounded-card shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
        <div className="sm:col-span-2">
          <input
            type="text"
            placeholder="Filter leads by client name or project name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-luxury-bg border border-luxury px-3 py-2 rounded-input text-xs text-text-primary focus:outline-none focus:border-accent"
          />
        </div>
        <div>
          <input
            type="text"
            placeholder="Filter by city (e.g. Hyderabad)"
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="w-full bg-luxury-bg border border-luxury px-3 py-2 rounded-input text-xs text-text-primary focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      {/* Board Columns (Horizontal Scrolling) */}
      <div className="flex-grow overflow-x-auto pb-6 -mx-4 px-4 flex gap-4 scrollbar-thin">
        {isLoading ? (
          <div className="flex-grow flex items-center justify-center p-12 text-text-secondary animate-pulse text-sm">
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
