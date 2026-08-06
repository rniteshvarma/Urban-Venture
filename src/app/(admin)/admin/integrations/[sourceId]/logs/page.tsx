"use client";

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  ListFilter, 
  Eye, 
  CheckCircle2, 
  CopyCheck, 
  AlertOctagon, 
  MinusCircle, 
  RefreshCw,
  ExternalLink,
  X
} from 'lucide-react';
import { toast } from '@/lib/toast';

export default function SourceLogsPage({ params }: { params: Promise<{ sourceId: string }> }) {
  const { sourceId } = use(params);
  const [logs, setLogs] = useState<any[]>([]);
  const [source, setSource] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedPayload, setSelectedPayload] = useState<any>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const [sourceRes, logsRes] = await Promise.all([
        fetch(`/api/admin/integrations/${sourceId}`),
        fetch(`/api/admin/integrations/${sourceId}/logs?status=${statusFilter}`)
      ]);

      if (sourceRes.ok) {
        const sData = await sourceRes.json();
        setSource(sData.source);
      }
      if (logsRes.ok) {
        const lData = await logsRes.json();
        setLogs(lData.logs || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [sourceId, statusFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CREATED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={12} /> CREATED
          </span>
        );
      case 'DUPLICATE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <CopyCheck size={12} /> DUPLICATE
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertOctagon size={12} /> FAILED
          </span>
        );
      case 'IGNORED':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
            <MinusCircle size={12} /> IGNORED
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link 
            href="/admin/integrations" 
            className="p-2 rounded-full bg-white text-[#5B4FE0] border border-[#E8E5F5] hover:bg-[#F4F0FF] transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-display font-bold text-[#1A1A2E]">
              {source ? source.name : 'Source'} Inbound Logs
            </h1>
            <p className="text-xs text-[#8A8A9E]">Audit log of raw POST webhooks, parsed payloads, and deduplication results.</p>
          </div>
        </div>

        <button
          onClick={fetchLogs}
          className="crm-btn-primary py-2 px-4 text-xs rounded-full flex items-center gap-2 self-start sm:self-auto"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {['ALL', 'CREATED', 'DUPLICATE', 'FAILED', 'IGNORED'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
              statusFilter === st
                ? 'bg-gradient-to-r from-[#7C6EF5] to-[#5B4FE0] text-white shadow-md shadow-[#5B4FE0]/20'
                : 'bg-white text-[#6E6D8A] border border-[#E8E5F5] hover:bg-[#F4F0FF]'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Logs Table */}
      <div className="crm-card bg-white border border-[#E8E5F5] rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F9F8FD] border-b border-[#F0EDFA] text-[#8A8A9E] uppercase tracking-wider font-bold">
              <tr>
                <th className="px-6 py-3.5">Received At</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Name / Contact</th>
                <th className="px-6 py-3.5">Message Snippet</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EDFA] text-[#1A1A2E]">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[#8A8A9E]">
                    Loading logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[#8A8A9E]">
                    No inbound logs found for status: {statusFilter}
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const parsed = log.parsedData || {};
                  return (
                    <tr key={log.id} className="hover:bg-[#F9F8FD]/60 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-[#8A8A9E] font-medium">
                        {new Date(log.receivedAt).toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(log.status)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-[#1A1A2E]">{parsed.name || 'Unknown'}</div>
                        <div className="text-[11px] text-[#8A8A9E]">{parsed.phone || parsed.email || '-'}</div>
                      </td>
                      <td className="px-6 py-4 max-w-xs truncate text-[#6E6D8A]">
                        {parsed.message || log.failureReason || 'No text content'}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap space-x-2">
                        <button
                          onClick={() => setSelectedPayload(log)}
                          className="px-3 py-1.5 rounded-xl bg-[#F4F0FF] text-[#5B4FE0] font-bold text-xs hover:bg-[#EBE5FB] transition-colors inline-flex items-center gap-1"
                        >
                          <Eye size={13} /> Raw Payload
                        </button>

                        {(log.leadId || log.duplicateOfId) && (
                          <Link
                            href={`/admin/leads?id=${log.leadId || log.duplicateOfId}`}
                            className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs hover:bg-emerald-100 transition-colors inline-flex items-center gap-1"
                          >
                            View Lead <ExternalLink size={12} />
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Raw Payload Modal */}
      {selectedPayload && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E0D7FF] rounded-3xl p-6 lg:p-8 max-w-2xl w-full shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0EDFA]">
              <div>
                <h3 className="font-display font-bold text-base text-[#1A1A2E]">Raw POST Payload</h3>
                <span className="text-xs text-[#8A8A9E]">
                  Received {new Date(selectedPayload.receivedAt).toLocaleString('en-IN')}
                </span>
              </div>
              <button
                onClick={() => setSelectedPayload(null)}
                className="p-1 text-[#8A8A9E] hover:text-[#1A1A2E] rounded-full hover:bg-[#F4F0FF]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4">
              <div>
                <span className="text-xs font-bold text-[#6E6D8A] uppercase block mb-1">Parsed CRM Data</span>
                <pre className="bg-[#F4F0FF] p-3 rounded-2xl text-xs font-mono text-[#5B4FE0] overflow-x-auto">
                  {JSON.stringify(selectedPayload.parsedData, null, 2)}
                </pre>
              </div>

              <div>
                <span className="text-xs font-bold text-[#6E6D8A] uppercase block mb-1">Raw POST Body JSON</span>
                <pre className="bg-[#F9F8FD] p-4 rounded-2xl border border-[#F0EDFA] text-xs font-mono text-slate-800 overflow-x-auto">
                  {JSON.stringify(selectedPayload.rawPayload, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
