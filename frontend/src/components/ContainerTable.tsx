// helio-app/frontend/src/components/ContainerTable.tsx
import React from 'react';
import { StatusBadge } from './StatusBadge.tsx';
import type { ContainerInfo } from '../types.ts';

interface Props {
  containers: ContainerInfo[];
}

function containerStatus(c: ContainerInfo): 'ok' | 'warn' | 'down' {
  if (c.status === 'running') return 'ok';
  if (c.status === 'restarting') return 'warn';
  return 'down';
}

function fmtBytes(bytes: number): string {
  if (bytes === 0) return '—';
  const mb = bytes / 1_000_000;
  return mb >= 1000 ? `${(mb / 1000).toFixed(1)} GB` : `${mb.toFixed(0)} MB`;
}

const HEADER: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr auto auto auto auto auto',
  gap: '10px',
  padding: '10px 14px',
  borderBottom: '1px solid var(--border)',
  fontFamily: 'var(--font-mono)',
  fontSize: '0.7rem',
  color: 'var(--text-dim)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
};

const ROW: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr auto auto auto auto auto',
  gap: '10px',
  alignItems: 'center',
  padding: '10px 14px',
  borderBottom: '1px solid var(--border)',
  fontSize: '0.83rem',
};

export function ContainerTable({ containers }: Props) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
      <div style={HEADER}>
        <span>Name</span>
        <span>Image</span>
        <span>Status</span>
        <span>CPU</span>
        <span>RAM</span>
        <span>Ports</span>
        <span>Erstellt</span>
      </div>
      {containers.length === 0 && (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)',
          fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
          Keine Container gefunden
        </div>
      )}
      {containers.map((c, i) => (
        <div key={c.id} style={{ ...ROW, borderBottom: i < containers.length - 1 ? undefined : 'none' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 500 }}>{c.name}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem',
            fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {c.image}
          </span>
          <StatusBadge status={containerStatus(c)} label={c.status} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
            {c.cpu_percent.toFixed(1)}%
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
            {fmtBytes(c.mem_used)}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
            {c.ports.slice(0, 2).join(', ') || '—'}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
            {new Date(c.created * 1000).toLocaleDateString('de-DE')}
          </span>
        </div>
      ))}
    </div>
  );
}
