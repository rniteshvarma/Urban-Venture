"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Radio, ArrowRight, RefreshCw, Sparkles, MessageSquare, Mail, Globe, Plug } from 'lucide-react';

interface InboundFeedItem {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  source: string;
  sourceChannel?: string;
  rawEnquiryText?: string;
  aiExtractedBudget?: number | null;
  aiConfidenceScore?: number | null;
  createdAt: string;
}

export default function InboundActivityWidget() {
  const [inboundFeed, setInboundFeed] = useState<InboundFeedItem[]>([]);
  const [todayCounts, setTodayCounts] = useState<{ total: number; portal: number; whatsapp: number; gmail: number; website: number }>({
    total: 0,
    portal: 0,
    whatsapp: 0,
    gmail: 0,
    website: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchInboundFeed = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/leads?limit=10');
      if (res.ok) {
        const data = await res.json();
        const leads: any[] = data.leads || [];

        // Map to feed items
        const mapped = leads.map(l => ({
          id: l.id,
          name: l.name || 'Unknown Enquiry',
          phone: l.phone,
          email: l.email,
          source: l.source || 'portal',
          sourceChannel: l.sourceChannel,
          rawEnquiryText: l.rawEnquiryText || l.notes,
          aiExtractedBudget: l.aiExtractedBudget || l.budget,
          aiConfidenceScore: l.aiConfidenceScore,
          createdAt: l.createdAt
        }));

        setInboundFeed(mapped);

        // Calculate today's breakdown
        const todayStr = new Date().toDateString();
        const todayLeads = leads.filter(l => new Date(l.createdAt).toDateString() === todayStr);

        let portal = 0, whatsapp = 0, gmail = 0, website = 0;
        todayLeads.forEach(l => {
          const ch = l.sourceChannel || '';
          const src = (l.source || '').toLowerCase();
          if (ch.includes('PORTAL') || src.includes('acres') || src.includes('magic') || src.includes('housing') || src.includes('broker')) portal++;
          else if (ch.includes('WHATSAPP') || src.includes('whatsapp')) whatsapp++;
          else if (ch.includes('GMAIL') || src.includes('gmail')) gmail++;
          else website++;
        });

        setTodayCounts({
          total: todayLeads.length,
          portal,
          whatsapp,
          gmail,
          website
        });
      }
    } catch (err) {
      console.error("Failed to fetch inbound live feed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInboundFeed();
    const interval = setInterval(fetchInboundFeed, 30000);
    return () => clearInterval(interval);
  }, []);

  const getTimeAgo = (dateStr: string) => {
    const diffMs = new Date().getTime() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hr ago`;
    return `${Math.floor(diffHours / 24)} days ago`;
  };

  const getSourceBadge = (sourceName: string, channel?: string) => {
    const src = (sourceName || '').toLowerCase();
    const ch = channel || '';

    if (ch === 'WHATSAPP_BUSINESS' || src.includes('whatsapp')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> WhatsApp
        </span>
      );
    }
    if (ch === 'GMAIL' || src.includes('gmail')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Gmail
        </span>
      );
    }
    if (ch === 'WEBSITE_FORM' || src.includes('website')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Website
        </span>
      );
    }
    // Default Portal
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {sourceName}
      </span>
    );
  };

  return (
    <div className="crm-card p-6 bg-white border border-[#E8E5F5] rounded-3xl shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#F0EDFA]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#F4F0FF] text-[#5B4FE0] flex items-center justify-center font-bold">
            <Radio size={16} className="animate-pulse" />
          </div>
          <div>
            <h3 className="font-display font-bold text-base text-[#1A1A2E]">Live Inbound Activity Feed</h3>
            <p className="text-xs text-[#8A8A9E]">Auto-refreshes every 30 seconds · Live multi-channel inbox</p>
          </div>
        </div>

        <Link href="/admin/integrations" className="text-xs font-bold text-[#5B4FE0] hover:underline flex items-center gap-1">
          View Integrations <ArrowRight size={13} />
        </Link>
      </div>

      {/* Feed List */}
      <div className="divide-y divide-[#F0EDFA]">
        {loading && inboundFeed.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#8A8A9E]">Loading live feed...</div>
        ) : inboundFeed.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#8A8A9E]">No inbound leads received yet today.</div>
        ) : (
          inboundFeed.map((item) => (
            <div key={item.id} className="py-3 flex items-start justify-between gap-3 hover:bg-[#F9F8FD] rounded-xl px-2 transition-colors">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-xs text-[#1A1A2E]">{item.name}</span>
                  {getSourceBadge(item.source, item.sourceChannel)}
                  <span className="text-[10px] text-[#8A8A9E]">{getTimeAgo(item.createdAt)}</span>
                </div>
                <p className="text-xs text-[#6E6D8A] truncate max-w-lg">
                  "{item.rawEnquiryText || 'Enquiry received'}"
                </p>
                {item.aiExtractedBudget && (
                  <div className="flex items-center gap-2 text-[10px] text-[#5B4FE0] font-semibold">
                    <Sparkles size={11} />
                    <span>AI Extracted: ₹{item.aiExtractedBudget}L Budget</span>
                  </div>
                )}
              </div>

              <Link
                href={`/admin/leads?id=${item.id}`}
                className="crm-btn-ghost text-[11px] font-bold text-[#5B4FE0] whitespace-nowrap shrink-0 hover:underline"
              >
                View Lead &rarr;
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
