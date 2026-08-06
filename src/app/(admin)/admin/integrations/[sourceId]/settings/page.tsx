"use client";

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Settings, 
  Save, 
  RefreshCw, 
  ShieldAlert, 
  Check 
} from 'lucide-react';
import { toast } from '@/lib/toast';

export default function SourceSettingsPage({ params }: { params: Promise<{ sourceId: string }> }) {
  const { sourceId } = use(params);
  const [source, setSource] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [autoAssignTo, setAutoAssignTo] = useState('');
  const [defaultStatus, setDefaultStatus] = useState('NEW');
  const [dedupeWindow, setDedupeWindow] = useState(24);

  useEffect(() => {
    async function loadSource() {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/integrations/${sourceId}`);
        if (res.ok) {
          const data = await res.json();
          const s = data.source;
          setSource(s);
          setName(s.name || '');
          setIsActive(Boolean(s.isActive));
          setAutoAssignTo(s.autoAssignTo || '');
          setDefaultStatus(s.defaultStatus || 'NEW');
          setDedupeWindow(s.dedupeWindow || 24);
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load source settings");
      } finally {
        setLoading(false);
      }
    }
    loadSource();
  }, [sourceId]);

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      const res = await fetch(`/api/admin/integrations/${sourceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          isActive,
          autoAssignTo,
          defaultStatus,
          dedupeWindow
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSource(data.source);
        toast.success("Settings saved successfully!");
      } else {
        toast.error("Failed to save settings");
      }
    } catch (err: any) {
      toast.error(err.message || "Error saving settings");
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateToken = async () => {
    if (!confirm("Are you sure you want to regenerate the webhook token? This will invalidate the previous Webhook URL immediately.")) {
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(`/api/admin/integrations/${sourceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerateToken: true })
      });

      if (res.ok) {
        const data = await res.json();
        setSource(data.source);
        toast.success("Webhook token regenerated!");
      }
    } catch (err) {
      toast.error("Failed to regenerate token");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !source) {
    return <div className="p-8 text-center text-[#8A8A9E]">Loading source settings...</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link 
            href="/admin/integrations" 
            className="p-2 rounded-full bg-white text-[#5B4FE0] border border-[#E8E5F5] hover:bg-[#F4F0FF] transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-display font-bold text-[#1A1A2E]">{source.name} Settings</h1>
            <p className="text-xs text-[#8A8A9E]">Configure auto-assignment, deduplication window, and status rules.</p>
          </div>
        </div>

        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="crm-btn-primary py-2 px-6 text-xs rounded-full flex items-center gap-1.5"
        >
          <Save size={14} />
          <span>{saving ? 'Saving...' : 'Save Settings'}</span>
        </button>
      </div>

      {/* Main Settings Card */}
      <div className="crm-card p-6 lg:p-8 bg-white border border-[#E8E5F5] rounded-3xl shadow-sm space-y-6">
        {/* Source Name & Active Toggle */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#6E6D8A] block">Source Label Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#F9F8FD] border border-[#E8E5F5] rounded-2xl px-4 py-2.5 text-xs text-[#1A1A2E] focus:outline-none focus:border-[#5B4FE0]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#6E6D8A] block">Integration Active Status</label>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`w-full py-2.5 px-4 rounded-2xl text-xs font-bold flex items-center justify-between border transition-all ${
                isActive
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}
            >
              <span>{isActive ? 'Active (Processing Webhooks)' : 'Paused (Ignoring Webhooks)'}</span>
              <span className={`w-3 h-3 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            </button>
          </div>
        </div>

        {/* Default Status & Auto Assign */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[#F0EDFA]">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#6E6D8A] block">Default Lead Status</label>
            <select
              value={defaultStatus}
              onChange={(e) => setDefaultStatus(e.target.value)}
              className="w-full bg-[#F9F8FD] border border-[#E8E5F5] rounded-2xl px-4 py-2.5 text-xs text-[#1A1A2E] focus:outline-none focus:border-[#5B4FE0] font-medium"
            >
              <option value="NEW">NEW (Default)</option>
              <option value="CONTACTED">CONTACTED</option>
              <option value="QUALIFIED">QUALIFIED</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#6E6D8A] block">Auto-Assign Agent User ID</label>
            <input
              type="text"
              placeholder="e.g. user_cuid_123 or unassigned"
              value={autoAssignTo}
              onChange={(e) => setAutoAssignTo(e.target.value)}
              className="w-full bg-[#F9F8FD] border border-[#E8E5F5] rounded-2xl px-4 py-2.5 text-xs text-[#1A1A2E] focus:outline-none focus:border-[#5B4FE0]"
            />
          </div>
        </div>

        {/* Deduplication Window Slider */}
        <div className="space-y-3 pt-4 border-t border-[#F0EDFA]">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[#6E6D8A] block">
                Deduplication Time Window
              </label>
              <p className="text-[11px] text-[#8A8A9E]">
                Block duplicate leads from the same phone number or email within this timeframe.
              </p>
            </div>
            <span className="text-sm font-display font-bold text-[#5B4FE0] bg-[#F4F0FF] px-3 py-1 rounded-full border border-[#E4DCFF]">
              {dedupeWindow} Hours
            </span>
          </div>

          <div className="flex items-center gap-3">
            {[1, 6, 12, 24, 48, 72].map((hours) => (
              <button
                key={hours}
                type="button"
                onClick={() => setDedupeWindow(hours)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${
                  dedupeWindow === hours
                    ? 'bg-gradient-to-r from-[#7C6EF5] to-[#5B4FE0] text-white border-transparent shadow-xs'
                    : 'bg-[#F9F8FD] text-[#6E6D8A] border-[#E8E5F5] hover:bg-[#F4F0FF]'
                }`}
              >
                {hours}h
              </button>
            ))}
          </div>
        </div>

        {/* Regenerate Webhook Token Section */}
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs">
              <ShieldAlert size={15} />
              <span>Security & Webhook URL Regeneration</span>
            </div>
            <p className="text-[11px] text-amber-700">
              Regenerating your secret token will invalidate the previous Webhook URL immediately.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRegenerateToken}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors shrink-0"
          >
            Regenerate Token
          </button>
        </div>
      </div>
    </div>
  );
}
