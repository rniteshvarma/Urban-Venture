'use client';

/**
 * Makes /news live: on page load (and every few minutes while the tab is
 * visible) it asks the server to pull the latest stories for this city, then
 * re-renders the feed if anything new arrived. The server throttles per city,
 * so this is cheap no matter how many readers are on the page.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

const POLL_MS = 3 * 60 * 1000;

type State = 'checking' | 'idle' | 'error';

export default function LiveNewsUpdater({ city, sourceCount }: { city: string; sourceCount: number }) {
  const router = useRouter();
  const [state, setState] = useState<State>('checking');
  const [checkedAt, setCheckedAt] = useState<number | null>(null);
  const [fresh, setFresh] = useState(0);
  const [now, setNow] = useState(0);
  const [retry, setRetry] = useState(0);
  const busy = useRef(false);

  const check = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setState('checking');
    try {
      const r = await fetch('/api/news/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ city }) });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error);
      // The server has no feeds for this city — don't claim the sources were checked.
      if (body.reason === 'unknown-city') throw new Error('unknown city');
      setNow(Date.now());
      setCheckedAt(body.lastIngestAt ? new Date(body.lastIngestAt).getTime() : Date.now());
      if (body.newCount > 0) {
        setFresh(body.newCount);
        router.refresh();
      }
      // Another reader's refresh is running — look again once it has had time to finish.
      if (body.reason === 'in-progress') setTimeout(() => setRetry((n) => n + 1), 8000);
      setState('idle');
    } catch {
      setState('error');
    } finally {
      busy.current = false;
    }
  }, [city, router]);

  useEffect(() => {
    // Kick off after mount (async), not synchronously inside the effect.
    const first = setTimeout(() => void check(), 0);
    const poll = setInterval(() => {
      if (document.visibilityState === 'visible') void check();
    }, POLL_MS);
    const clock = setInterval(() => setNow(Date.now()), 30000);
    return () => {
      clearTimeout(first);
      clearInterval(poll);
      clearInterval(clock);
    };
  }, [check]);

  useEffect(() => {
    if (retry === 0) return;
    const t = setTimeout(() => void check(), 0);
    return () => clearTimeout(t);
  }, [retry, check]);

  const ago = checkedAt && now ? Math.max(0, Math.round((now - checkedAt) / 60000)) : null;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, fontSize: '0.78rem', color: 'var(--color-text-lo)' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span
          aria-hidden
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: state === 'error' ? '#B45309' : 'var(--color-growth, #16a34a)',
            boxShadow: state === 'checking' ? '0 0 0 4px rgba(22,163,74,0.18)' : 'none',
          }}
        />
        {state === 'checking'
          ? `Checking ${sourceCount} sources for the latest news…`
          : state === 'error'
            ? 'Could not reach news sources just now — showing the latest we have'
            : `Live · sources checked ${ago === null ? '—' : ago === 0 ? 'just now' : `${ago} min ago`}`}
      </span>
      {fresh > 0 && (
        <span style={{ background: 'var(--color-saffron-wash)', color: 'var(--color-text-hi)', borderRadius: 999, padding: '2px 10px', fontWeight: 600 }}>
          {fresh} new {fresh === 1 ? 'story' : 'stories'} just in
        </span>
      )}
      <button
        type="button"
        onClick={() => void check()}
        disabled={state === 'checking'}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'transparent', border: '1px solid var(--color-line)', borderRadius: 999, padding: '2px 10px', color: 'var(--color-text-mid)', cursor: 'pointer', fontSize: '0.75rem' }}
      >
        <RefreshCw size={12} className={state === 'checking' ? 'animate-spin' : undefined} /> Check now
      </button>
    </div>
  );
}
