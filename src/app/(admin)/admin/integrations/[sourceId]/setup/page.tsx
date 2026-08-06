"use client";

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Copy, 
  Check, 
  Zap, 
  Send, 
  CheckCircle2, 
  Mail, 
  ExternalLink,
  ShieldAlert,
  Play
} from 'lucide-react';
import { toast } from '@/lib/toast';

export default function SourceSetupPage({ params }: { params: Promise<{ sourceId: string }> }) {
  const { sourceId } = use(params);
  const [source, setSource] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => {
    async function loadSource() {
      try {
        const res = await fetch(`/api/admin/integrations/${sourceId}`);
        if (res.ok) {
          const data = await res.json();
          setSource(data.source);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadSource();
  }, [sourceId]);

  if (loading || !source) {
    return <div className="p-8 text-center text-[#8A8A9E]">Loading setup guide...</div>;
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const webhookUrl = `${origin}/api/webhooks/inbound/${source.webhookToken}`;

  const copyUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedUrl(true);
    toast.success("Webhook URL copied to clipboard!");
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  const emailTemplateText = `Subject: Please configure lead delivery webhook for my account

Hi Team,

Please configure real-time lead delivery via webhook for my account on ${source.name}.

Webhook URL: ${webhookUrl}

Please send all property enquiries as HTTP POST requests (JSON format) to this URL.

Thank you!`;

  const copyEmailTemplate = () => {
    navigator.clipboard.writeText(emailTemplateText);
    setCopiedEmail(true);
    toast.success("Email template copied!");
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      setTestResult(null);

      const samplePayload: any = {
        name: "Test Rahul Sharma",
        phone: "+919876543210",
        email: "rahul.test@gmail.com",
        message: "Testing webhook integration. Looking for 2BHK flat in Shadnagar budget 45 lakhs.",
        property_id: "PROP-9901",
        sender_name: "Test Rahul Sharma",
        sender_phone: "+919876543210",
        sender_email: "rahul.test@gmail.com",
        remark: "Testing webhook integration. Looking for 2BHK flat in Shadnagar budget 45 lakhs."
      };

      const res = await fetch(`/api/admin/integrations/${source.id}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(samplePayload)
      });

      if (res.ok) {
        const data = await res.json();
        setTestResult(data);
        toast.success(`Test enquiry received! Status: ${data.testStatus}`);
      } else {
        toast.error("Test connection failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to run test payload");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Bar */}
      <div className="flex items-center gap-3">
        <Link 
          href="/admin/integrations" 
          className="p-2 rounded-full bg-white text-[#5B4FE0] border border-[#E8E5F5] hover:bg-[#F4F0FF] transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-display font-bold text-[#1A1A2E]">{source.name} Integration Setup</h1>
          <p className="text-xs text-[#8A8A9E]">Follow these steps to connect your {source.name} enquiries to CRM.</p>
        </div>
      </div>

      {/* Webhook URL Box */}
      <div className="crm-card p-6 bg-white border border-[#E8E5F5] rounded-3xl shadow-sm space-y-3">
        <label className="text-xs font-bold uppercase tracking-wider text-[#6E6D8A] block">
          Your Dedicated Webhook URL
        </label>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1 bg-[#F4F0FF] border border-[#E4DCFF] rounded-2xl p-3 text-xs font-mono text-[#5B4FE0] break-all">
            {webhookUrl}
          </div>
          <button
            onClick={copyUrl}
            className="crm-btn-primary py-3 px-6 text-xs rounded-2xl flex items-center justify-center gap-2 shrink-0"
          >
            {copiedUrl ? <Check size={16} /> : <Copy size={16} />}
            <span>{copiedUrl ? 'Copied!' : 'Copy Webhook URL'}</span>
          </button>
        </div>
      </div>

      {/* Portal Instructions */}
      <div className="crm-card p-6 lg:p-8 bg-white border border-[#E8E5F5] rounded-3xl shadow-sm space-y-6">
        <h3 className="font-display font-bold text-lg text-[#1A1A2E]">Step-by-Step Setup Guide</h3>

        {source.name === '99acres' && (
          <ol className="space-y-4 text-sm text-[#1A1A2E]">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[#F4F0FF] text-[#5B4FE0] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
              <div>
                <strong>Copy your Webhook URL</strong> above.
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[#F4F0FF] text-[#5B4FE0] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
              <div>
                Log in to your <strong>99acres Seller Dashboard</strong>.
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[#F4F0FF] text-[#5B4FE0] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
              <div>
                Navigate to <strong>Settings &rarr; Lead API / Webhook Integration</strong>.
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[#F4F0FF] text-[#5B4FE0] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">4</span>
              <div>
                Paste your URL in the <strong>Webhook Endpoint URL</strong> field and click <strong>Save</strong>.
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[#F4F0FF] text-[#5B4FE0] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">5</span>
              <div>
                Click the <strong>Test Connection</strong> button below to verify immediate parsing.
              </div>
            </li>
          </ol>
        )}

        {(source.name === 'MagicBricks' || source.name === 'Housing.com' || source.name === 'NoBroker') && (
          <div className="space-y-5">
            <ol className="space-y-3 text-sm text-[#1A1A2E]">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#F4F0FF] text-[#5B4FE0] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
                <div>Copy the pre-written email request template below.</div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#F4F0FF] text-[#5B4FE0] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
                <div>Send it to your dedicated account manager at {source.name}.</div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#F4F0FF] text-[#5B4FE0] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
                <div>Portal activation typically takes 24-48 hours. Leads will flow automatically once enabled.</div>
              </li>
            </ol>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#6E6D8A] uppercase">Email Request Template</span>
                <button
                  onClick={copyEmailTemplate}
                  className="text-xs font-bold text-[#5B4FE0] flex items-center gap-1 hover:underline"
                >
                  {copiedEmail ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedEmail ? 'Copied' : 'Copy Template'}</span>
                </button>
              </div>
              <pre className="bg-[#F9F8FD] p-4 rounded-2xl border border-[#F0EDFA] text-xs font-mono text-[#1A1A2E] whitespace-pre-wrap">
                {emailTemplateText}
              </pre>
            </div>
          </div>
        )}

        {source.type === 'WHATSAPP' && (
          <div className="space-y-4 text-sm text-[#1A1A2E]">
            <p>
              Inbound WhatsApp messages are processed automatically via WATI webhook integration.
            </p>
            <ol className="space-y-2 text-xs text-[#6E6D8A] list-decimal pl-5">
              <li>Log in to your <strong>WATI Dashboard</strong>.</li>
              <li>Go to <strong>Settings &rarr; Webhooks</strong>.</li>
              <li>Set Incoming Message Webhook URL to: <code className="bg-[#F4F0FF] px-2 py-0.5 rounded text-[#5B4FE0] font-mono">{origin}/api/webhooks/whatsapp-inbound</code></li>
              <li>Incoming messages from unknown contacts automatically generate leads, while existing leads have messages appended to their timeline.</li>
            </ol>
          </div>
        )}

        {source.type === 'GMAIL' && (
          <div className="space-y-4 text-sm text-[#1A1A2E]">
            <p>Gmail API + Google Cloud Pub/Sub pushes incoming enquiry emails directly into CRM.</p>
            <ol className="space-y-2 text-xs text-[#6E6D8A] list-decimal pl-5">
              <li>Create a Google Cloud Project and enable Gmail & Cloud Pub/Sub APIs.</li>
              <li>Set Pub/Sub push subscription endpoint to: <code className="bg-[#F4F0FF] px-2 py-0.5 rounded text-[#5B4FE0] font-mono">{origin}/api/webhooks/gmail</code></li>
              <li>Configure filters to process property enquiries automatically.</li>
            </ol>
          </div>
        )}

        {/* Test Connection Button */}
        <div className="pt-4 border-t border-[#F0EDFA] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="font-display font-bold text-sm text-[#1A1A2E]">Test Connection</h4>
            <p className="text-xs text-[#8A8A9E]">Send a test lead payload to verify real-time AI extraction and deduplication.</p>
          </div>
          <button
            onClick={handleTestConnection}
            disabled={testing}
            className="crm-btn-primary py-2.5 px-6 text-xs rounded-full flex items-center gap-2 shrink-0"
          >
            <Play size={14} className={testing ? 'animate-spin' : ''} />
            <span>{testing ? 'Processing...' : 'Test Connection'}</span>
          </button>
        </div>

        {/* Test Result Display */}
        {testResult && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs space-y-2">
            <div className="flex items-center gap-2 text-emerald-800 font-bold">
              <CheckCircle2 size={16} />
              <span>Test Successful! Status: {testResult.testStatus}</span>
            </div>
            <pre className="bg-white/80 p-3 rounded-xl border border-emerald-100 font-mono text-[11px] text-slate-700 overflow-x-auto">
              {JSON.stringify(testResult.parsedData, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
