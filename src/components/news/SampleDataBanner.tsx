'use client';

/**
 * Sample-data banner (News module spec, Part 7.6). Shows in mock mode. When the
 * build is production AND still on mock data, `locked` is passed true and the
 * banner cannot be dismissed — sample data can never quietly ship as real.
 */

import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function SampleDataBanner({ locked }: { locked: boolean }) {
  const [hidden, setHidden] = useState(false);
  if (hidden && !locked) return null;

  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 16px',
        background: '#78350F',
        color: '#FDE68A',
        fontFamily: 'ui-monospace, monospace',
        fontSize: '0.78rem',
        letterSpacing: 0.3,
        border: '1px solid #B45309',
        borderRadius: 8,
      }}
    >
      <AlertTriangle size={16} />
      <span style={{ flex: 1 }}>
        SAMPLE DATA — these headlines and publications are fictional, for layout and development purposes only.
        {locked && ' (mock provider active in production build)'}
      </span>
      {!locked && (
        <button type="button" onClick={() => setHidden(true)} aria-label="Dismiss" style={{ background: 'transparent', border: 'none', color: '#FDE68A', cursor: 'pointer', display: 'flex' }}>
          <X size={16} />
        </button>
      )}
    </div>
  );
}
