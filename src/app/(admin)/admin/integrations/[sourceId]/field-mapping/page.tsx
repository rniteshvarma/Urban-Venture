"use client";

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Sliders, 
  Save, 
  Play, 
  CheckCircle2, 
  ArrowRight, 
  Plus, 
  Trash2 
} from 'lucide-react';
import { toast } from '@/lib/toast';

const crmTargetFields = [
  { value: 'name', label: 'CRM Lead Name' },
  { value: 'phone', label: 'CRM Lead Phone' },
  { value: 'email', label: 'CRM Lead Email' },
  { value: 'message', label: 'CRM Enquiry Notes / Message' },
  { value: 'propertyId', label: 'Property ID / Listing ID' },
  { value: 'propertyName', label: 'Property / Project Name' },
  { value: 'budget', label: 'Budget String' },
  { value: 'location', label: 'City / Area Location' }
];

export default function FieldMappingPage({ params }: { params: Promise<{ sourceId: string }> }) {
  const { sourceId } = use(params);
  const [source, setSource] = useState<any>(null);
  const [mappingRows, setMappingRows] = useState<{ portalField: string; crmField: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testPreview, setTestPreview] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [sourceRes, mapRes] = await Promise.all([
          fetch(`/api/admin/integrations/${sourceId}`),
          fetch(`/api/admin/integrations/${sourceId}/field-mapping`)
        ]);

        if (sourceRes.ok) {
          const sData = await sourceRes.json();
          setSource(sData.source);
        }

        if (mapRes.ok) {
          const mData = await mapRes.json();
          const existingMapping = mData.fieldMapping || {};
          const rows = Object.entries(existingMapping).map(([k, v]) => ({
            portalField: k,
            crmField: String(v)
          }));
          if (rows.length === 0) {
            // Add default rows
            setMappingRows([
              { portalField: 'sender_name', crmField: 'name' },
              { portalField: 'sender_phone', crmField: 'phone' },
              { portalField: 'sender_email', crmField: 'email' },
              { portalField: 'remark', crmField: 'message' },
              { portalField: 'pid', crmField: 'propertyId' }
            ]);
          } else {
            setMappingRows(rows);
          }
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load field mapping");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [sourceId]);

  const handleAddRow = () => {
    setMappingRows([...mappingRows, { portalField: '', crmField: 'name' }]);
  };

  const handleRemoveRow = (index: number) => {
    const updated = [...mappingRows];
    updated.splice(index, 1);
    setMappingRows(updated);
  };

  const handleRowChange = (index: number, key: 'portalField' | 'crmField', val: string) => {
    const updated = [...mappingRows];
    updated[index][key] = val;
    setMappingRows(updated);
  };

  const handleSaveMapping = async () => {
    try {
      setSaving(true);
      const mappingObj: Record<string, string> = {};
      mappingRows.forEach(row => {
        if (row.portalField.trim()) {
          mappingObj[row.portalField.trim()] = row.crmField;
        }
      });

      const res = await fetch(`/api/admin/integrations/${sourceId}/field-mapping`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldMapping: mappingObj })
      });

      if (res.ok) {
        toast.success("Field mapping saved successfully!");
      } else {
        toast.error("Failed to save mapping");
      }
    } catch (err: any) {
      toast.error(err.message || "Error saving field mapping");
    } finally {
      setSaving(false);
    }
  };

  const handleTestMapping = async () => {
    try {
      setTesting(true);
      setTestPreview(null);

      const mappingObj: Record<string, string> = {};
      mappingRows.forEach(row => {
        if (row.portalField.trim()) mappingObj[row.portalField.trim()] = row.crmField;
      });

      const testPayload: Record<string, any> = {};
      mappingRows.forEach(row => {
        if (row.portalField.trim()) {
          if (row.crmField === 'phone') testPayload[row.portalField] = '+919876543210';
          else if (row.crmField === 'email') testPayload[row.portalField] = 'test.lead@gmail.com';
          else if (row.crmField === 'name') testPayload[row.portalField] = 'Anil Kumar';
          else if (row.crmField === 'budget') testPayload[row.portalField] = '60 Lakhs';
          else testPayload[row.portalField] = `Sample ${row.portalField} data`;
        }
      });

      const res = await fetch(`/api/admin/integrations/${sourceId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testPayload })
      });

      if (res.ok) {
        const data = await res.json();
        setTestPreview(data.parsedData);
        toast.success("Mapping preview generated!");
      }
    } catch (err: any) {
      toast.error("Failed to run mapping test");
    } finally {
      setTesting(false);
    }
  };

  if (loading || !source) {
    return <div className="p-8 text-center text-[#8A8A9E]">Loading field mapper...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link 
            href="/admin/integrations" 
            className="p-2 rounded-full bg-white text-[#5B4FE0] border border-[#E8E5F5] hover:bg-[#F4F0FF] transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-display font-bold text-[#1A1A2E]">{source.name} Field Mapper</h1>
            <p className="text-xs text-[#8A8A9E]">Connect incoming payload field names from {source.name} to CRM Lead fields.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTestMapping}
            disabled={testing}
            className="px-4 py-2 rounded-full bg-[#F4F0FF] text-[#5B4FE0] font-bold text-xs hover:bg-[#EBE5FB] transition-colors flex items-center gap-1.5"
          >
            <Play size={14} className={testing ? 'animate-spin' : ''} />
            <span>Test Mapping</span>
          </button>
          <button
            onClick={handleSaveMapping}
            disabled={saving}
            className="crm-btn-primary py-2 px-5 text-xs rounded-full flex items-center gap-1.5"
          >
            <Save size={14} />
            <span>{saving ? 'Saving...' : 'Save Mapping'}</span>
          </button>
        </div>
      </div>

      {/* Visual Mapper Table */}
      <div className="crm-card p-6 bg-white border border-[#E8E5F5] rounded-3xl shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#F0EDFA] pb-3">
          <h3 className="font-display font-bold text-base text-[#1A1A2E]">Field Mapping Rules</h3>
          <button
            onClick={handleAddRow}
            className="text-xs font-bold text-[#5B4FE0] hover:underline flex items-center gap-1"
          >
            <Plus size={14} /> Add Field Row
          </button>
        </div>

        <div className="space-y-3">
          {mappingRows.map((row, idx) => (
            <div key={idx} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-[#F9F8FD] p-3 rounded-2xl border border-[#F0EDFA]">
              <div className="flex-1 space-y-1">
                <label className="text-[10px] font-bold text-[#8A8A9E] uppercase block">Portal Payload Key</label>
                <input
                  type="text"
                  placeholder="e.g. sender_name, remark, pid"
                  value={row.portalField}
                  onChange={(e) => handleRowChange(idx, 'portalField', e.target.value)}
                  className="w-full bg-white border border-[#E8E5F5] rounded-xl px-3 py-1.5 text-xs text-[#1A1A2E] focus:outline-none focus:border-[#5B4FE0] font-mono"
                />
              </div>

              <div className="hidden sm:flex items-center justify-center text-[#5B4FE0] pt-4">
                <ArrowRight size={18} />
              </div>

              <div className="flex-1 space-y-1">
                <label className="text-[10px] font-bold text-[#8A8A9E] uppercase block">Target CRM Field</label>
                <select
                  value={row.crmField}
                  onChange={(e) => handleRowChange(idx, 'crmField', e.target.value)}
                  className="w-full bg-white border border-[#E8E5F5] rounded-xl px-3 py-1.5 text-xs text-[#1A1A2E] focus:outline-none focus:border-[#5B4FE0] font-medium"
                >
                  {crmTargetFields.map(f => (
                    <option key={f.value} value={f.value}>{f.label} ({f.value})</option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => handleRemoveRow(idx)}
                className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors shrink-0 self-end sm:self-center mt-2 sm:mt-4"
                title="Remove Row"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Test Preview Output */}
      {testPreview && (
        <div className="crm-card p-6 bg-emerald-50/70 border border-emerald-200 rounded-3xl space-y-3">
          <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
            <CheckCircle2 size={18} />
            <span>Normalized Lead Preview</span>
          </div>
          <pre className="bg-white p-4 rounded-2xl border border-emerald-100 font-mono text-xs text-slate-800 overflow-x-auto">
            {JSON.stringify(testPreview, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
