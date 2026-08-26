'use client';

import React, { useState } from 'react';

/** Emails the current research report (PDF) to the signed-in owner. */
export default function EmailReportButton({ searchId }: { searchId: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  async function send() {
    setState('sending');
    setMsg('');
    try {
      const res = await fetch('/api/research/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchId }),
      });
      const data = await res.json();
      if (res.ok) {
        setState('sent');
        setMsg(data.mocked ? 'Email logged (dev mode — not delivered)' : `Sent to ${data.sentTo}`);
      } else {
        setState('error');
        setMsg(data.error || 'Could not send. Try again.');
      }
    } catch {
      setState('error');
      setMsg('Network error. Try again.');
    }
  }

  const label =
    state === 'sending' ? 'Sending…' : state === 'sent' ? '✓ Emailed' : state === 'error' ? '✉️ Retry' : '✉️ Email me this report';

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
      <button
        onClick={send}
        disabled={state === 'sending' || state === 'sent'}
        className="uv-btn uv-btn-ghost text-xs"
        style={{ padding: '8px 16px', opacity: state === 'sending' ? 0.7 : 1 }}
        title={msg || 'Email this report as a PDF'}
      >
        {label}
      </button>
      {msg && (
        <span style={{ fontSize: '0.65rem', color: state === 'error' ? '#B45309' : 'var(--color-text-lo)' }}>{msg}</span>
      )}
    </span>
  );
}
