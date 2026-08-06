"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  CheckCircle2, 
  ArrowLeft, 
  Copy, 
  Check, 
  ExternalLink, 
  Mail, 
  MessageSquare, 
  Globe, 
  Zap, 
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { toast } from '@/lib/toast';

export default function SetupGuideOverviewPage() {
  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSources() {
      try {
        const res = await fetch('/api/admin/integrations');
        if (res.ok) {
          const data = await res.json();
          setSources(data.sources || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadSources();
  }, []);

  const connectedCount = sources.filter(s => s.connectionStatus === 'CONNECTED').length;
  const totalCount = sources.length || 7;
  const progressPct = Math.round((connectedCount / totalCount) * 100);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Back Link & Title */}
      <div className="flex items-center gap-3">
        <Link 
          href="/admin/integrations" 
          className="p-2 rounded-full bg-white text-[#5B4FE0] border border-[#E8E5F5] hover:bg-[#F4F0FF] transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-display font-bold text-[#1A1A2E]">Omnichannel Integration Setup Guide</h1>
          <p className="text-xs text-[#8A8A9E]">Connect property portals, WhatsApp Business, Gmail, and Website forms to capture 100% of leads.</p>
        </div>
      </div>

      {/* Progress Card */}
      <div className="crm-card p-6 bg-white border border-[#E8E5F5] rounded-3xl shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-bold text-base text-[#1A1A2E]">
              {connectedCount} of {totalCount} Channels Connected
            </h3>
            <p className="text-xs text-[#8A8A9E]">Complete channel setup to ensure zero lost leads across all portals.</p>
          </div>
          <span className="text-lg font-display font-bold text-[#5B4FE0]">{progressPct}%</span>
        </div>

        <div className="w-full h-3 bg-[#F4F0FF] rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-[#7C6EF5] to-[#5B4FE0] transition-all duration-500 rounded-full"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Channel Setup Cards List */}
      <div className="space-y-4">
        {sources.map((source, index) => {
          const isConnected = source.connectionStatus === 'CONNECTED';
          return (
            <div 
              key={source.id}
              className="crm-card p-6 bg-white border border-[#E8E5F5] rounded-3xl shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 ${
                  isConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-[#F4F0FF] text-[#5B4FE0]'
                }`}>
                  {isConnected ? <CheckCircle2 size={20} /> : index + 1}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-display font-bold text-base text-[#1A1A2E]">{source.name}</h4>
                    {isConnected && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#8A8A9E] mt-0.5">
                    {source.name === '99acres' && 'Self-service webhook URL configuration in 99acres Seller Dashboard (2 mins)'}
                    {source.name === 'MagicBricks' && 'Email your account manager to enable lead delivery via POST webhook'}
                    {source.name === 'Housing.com' && 'Send account manager integration request email'}
                    {source.name === 'NoBroker' && 'Contact support to register your CRM webhook URL'}
                    {source.name === 'WhatsApp Business' && 'Incoming message webhook configured via WATI integration'}
                    {source.name === 'Gmail Inbox' && 'Google Cloud Pub/Sub push notification setup for enquiry emails'}
                    {source.name === 'Website Form' && 'Direct POST API from contact forms on main website'}
                  </p>
                </div>
              </div>

              <Link
                href={`/admin/integrations/${source.id}/setup`}
                className="crm-btn-primary text-xs py-2 px-5 rounded-full flex items-center gap-1.5 shrink-0 self-end md:self-auto"
              >
                <span>{isConnected ? 'View Setup Details' : 'Configure Setup'}</span>
                <ChevronRight size={14} />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
