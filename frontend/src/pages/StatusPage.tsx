// helio-app/frontend/src/pages/StatusPage.tsx
import React, { useEffect, useState } from 'react';
import { useSettings } from '../hooks/useSettings.ts';

interface StatusData {
  uptime_percent: number;
  nodes: unknown[];
  incidents: unknown[];
}

export function StatusPage() {
  const [data, setData] = useState<StatusData | null>(null);
  const { settings, loading: settingsLoading } = useSettings();

  useEffect(() => {
    fetch('/api/status').then(r => r.json()).then(setData).catch(console.error);
  }, []);

  const overall = !data ? 'loading' : data.uptime_percent >= 99.9 ? 'ok' : data.uptime_percent >= 99 ? 'warn' : 'down';
  const COLORS = { ok: 'var(--ok)', warn: 'var(--warn)', down: 'var(--down)', loading: 'var(--text-dim)' };
  const STATUS_LABELS = { ok: 'Alle Systeme betriebsbereit', warn: 'Teilweiser Ausfall', down: 'Systemausfall', loading: 'Lade…' };

  if (settingsLoading) return null;

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', padding: '48px 24px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '8px' }}>
          {settings.status_title}
        </h1>
        {settings.status_subtitle && (
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '24px' }}>
            {settings.status_subtitle}
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
          <span style={{ width: '14px', height: '14px', borderRadius: '50%',
            background: COLORS[overall], display: 'block', flexShrink: 0 }} />
          <span style={{ fontSize: '1.1rem', fontWeight: 560 }}>
            {STATUS_LABELS[overall]}
          </span>
        </div>
        {data && settings.status_show_uptime === 'true' && (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Uptime (90 Tage): {data.uptime_percent}%
          </p>
        )}
      </div>
    </div>
  );
}
