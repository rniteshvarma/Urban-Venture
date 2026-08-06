"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Plug, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  XCircle, 
  Copy, 
  Check, 
  ExternalLink, 
  Settings, 
  ListFilter, 
  ArrowRight, 
  Zap, 
  RefreshCw,
  Sliders,
  Mail,
  MessageSquare,
  Globe,
  Plus
} from 'lucide-react';
import { toast } from '@/lib/toast';

interface InboundSource {
  id: string;
  name: string;
  type: string;
  webhookToken: string;
  isActive: boolean;
  totalReceived: number;
  totalCreated: number;
  totalDupes: number;
  lastReceivedAt: string | null;
  connectionStatus: 'CONNECTED' | 'PENDING' | 'WARNING' | 'NOT_CONNECTED';
}

export default function IntegrationsHubPage() {
  const [sources, setSources] = useState<InboundSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const fetchSources = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/integrations');
      if (res.ok) {
        const data = await res.json();
        setSources(data.sources || []);
      }
    } catch (err) {
      console.error("Failed to fetch integration sources:", err);
      toast.error("Failed to load integrations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const copyWebhookUrl = (token: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/api/webhooks/inbound/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    toast.success("Webhook URL copied to clipboard");
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const activeCount = sources.filter(s => s.connectionStatus === 'CONNECTED').length;

  const getSourceIcon = (name: string, type: string) => {
    const nameLower = name.toLowerCase();
    if (type === 'WHATSAPP' || nameLower.includes('whatsapp')) return <MessageSquare className="w-5 h-5 text-emerald-500" />;
    if (type === 'GMAIL' || nameLower.includes('gmail')) return <Mail className="w-5 h-5 text-rose-500" />;
    if (type === 'WEBSITE_FORM' || nameLower.includes('website')) return <Globe className="w-5 h-5 text-indigo-500" />;
    return <Plug className="w-5 h-5 text-violet-500" />;
  };

  const getStatusBadge = (status: InboundSource['connectionStatus']) => {
    switch (status) {
      case 'CONNECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            CONNECTED
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5" />
            PENDING
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">
            <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
            INACTIVE (7+ DAYS)
          </span>
        );
      case 'NOT_CONNECTED':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
            <XCircle className="w-3.5 h-3.5" />
            NOT CONNECTED
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="crm-card p-6 lg:p-8 bg-white border border-[#E8E5F5] rounded-3xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2.5 z-10 relative">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F4F0FF] text-xs font-bold text-[#5B4FE0] border border-[#E0D7FF]">
            <Zap className="w-3.5 h-3.5 text-[#5B4FE0]" />
            Omnichannel Auto-Inbox Integration Engine
          </div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-[#1A1A2E]">Integrations Hub</h1>
          <p className="text-xs sm:text-sm text-[#8A8A9E] max-w-2xl leading-relaxed font-medium">
            Automatically capture enquiries from property portals (99acres, MagicBricks, Housing, NoBroker), WhatsApp Business, Gmail, and Website Contact Forms directly into your CRM.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 z-10 relative">
          <Link
            href="/admin/integrations/setup-guide"
            className="crm-btn-primary text-xs px-5 py-2.5 flex items-center justify-center gap-2"
          >
            <Zap className="w-4 h-4 text-white" /> Setup Guide ({activeCount}/{sources.length || 7} Connected)
          </Link>
          <button
            onClick={fetchSources}
            className="crm-btn-secondary p-2.5 rounded-full flex items-center justify-center text-[#5B4FE0]"
            title="Refresh Sources"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Connection Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading && sources.length === 0 ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="crm-card p-6 h-64 animate-pulse space-y-4">
              <div className="h-6 w-32 bg-slate-200 rounded-md" />
              <div className="h-10 w-full bg-slate-100 rounded-md" />
              <div className="h-16 w-full bg-slate-200 rounded-md" />
            </div>
          ))
        ) : (
          sources.map((source) => {
            const origin = typeof window !== 'undefined' ? window.location.origin : '';
            const webhookUrl = `${origin}/api/webhooks/inbound/${source.webhookToken}`;
            const isPortal = source.type === 'PORTAL_WEBHOOK';

            return (
              <div
                key={source.id}
                className="crm-card p-6 bg-white border border-[#E8E5F5] rounded-3xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-5"
              >
                {/* Card Top Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#F4F0FF] border border-[#E0D7FF] flex items-center justify-center shrink-0">
                      {getSourceIcon(source.name, source.type)}
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-base text-[#1A1A2E]">{source.name}</h3>
                      <span className="text-[11px] font-semibold text-[#8A8A9E] block">
                        {source.type.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  {getStatusBadge(source.connectionStatus)}
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-3 gap-2 bg-[#F9F8FD] p-3 rounded-2xl border border-[#F0EDFA] text-center">
                  <div>
                    <span className="text-[10px] font-bold text-[#8A8A9E] uppercase block">Total</span>
                    <span className="text-sm font-display font-bold text-[#1A1A2E]">{source.totalReceived}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-[#8A8A9E] uppercase block">Created</span>
                    <span className="text-sm font-display font-bold text-emerald-600">{source.totalCreated}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-[#8A8A9E] uppercase block">Dupes</span>
                    <span className="text-sm font-display font-bold text-amber-600">{source.totalDupes}</span>
                  </div>
                </div>

                {/* Webhook URL Box */}
                {isPortal && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[#6E6D8A] uppercase tracking-wider block">
                      Webhook Endpoint
                    </label>
                    <div className="flex items-center gap-2 bg-[#F4F0FF]/60 border border-[#E4DCFF] rounded-xl p-2 text-xs">
                      <span className="truncate text-[#5B4FE0] font-mono text-[11px] flex-1">
                        {webhookUrl}
                      </span>
                      <button
                        onClick={() => copyWebhookUrl(source.webhookToken)}
                        className="p-1.5 text-[#5B4FE0] hover:bg-[#E0D7FF] rounded-lg transition-colors shrink-0"
                        title="Copy Webhook URL"
                      >
                        {copiedToken === source.webhookToken ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Last Received Info */}
                <div className="text-[11px] text-[#8A8A9E] flex items-center justify-between pt-1 border-t border-[#F0EDFA]">
                  <span>Last Enquiry:</span>
                  <span className="font-semibold text-[#1A1A2E]">
                    {source.lastReceivedAt ? new Date(source.lastReceivedAt).toLocaleString('en-IN') : 'Never'}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-3 gap-2 pt-2">
                  <Link
                    href={`/admin/integrations/${source.id}/logs`}
                    className="px-3 py-2 rounded-xl bg-[#F4F0FF] text-[#5B4FE0] font-bold text-xs text-center hover:bg-[#EBE5FB] transition-colors flex items-center justify-center gap-1"
                  >
                    <ListFilter size={13} /> Logs
                  </Link>
                  {isPortal ? (
                    <Link
                      href={`/admin/integrations/${source.id}/field-mapping`}
                      className="px-3 py-2 rounded-xl bg-[#F4F0FF] text-[#5B4FE0] font-bold text-xs text-center hover:bg-[#EBE5FB] transition-colors flex items-center justify-center gap-1"
                    >
                      <Sliders size={13} /> Mapper
                    </Link>
                  ) : (
                    <Link
                      href={`/admin/integrations/${source.id}/setup`}
                      className="px-3 py-2 rounded-xl bg-[#F4F0FF] text-[#5B4FE0] font-bold text-xs text-center hover:bg-[#EBE5FB] transition-colors flex items-center justify-center gap-1"
                    >
                      <ExternalLink size={13} /> Setup
                    </Link>
                  )}
                  <Link
                    href={`/admin/integrations/${source.id}/settings`}
                    className="px-3 py-2 rounded-xl bg-[#F4F0FF] text-[#5B4FE0] font-bold text-xs text-center hover:bg-[#EBE5FB] transition-colors flex items-center justify-center gap-1"
                  >
                    <Settings size={13} /> Config
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
