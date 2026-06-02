// helio-app/frontend/src/components/ServerTable.tsx
import React from 'react';
import { StatusDot } from './StatusDot.tsx';
import { StatusBadge } from './StatusBadge.tsx';
import type { Node } from '../types.ts';

interface Props {
  nodes: Node[];
}

function latencyColor(ms: number): string {
  if (ms < 100) return 'var(--ok)';
  if (ms < 500) return 'var(--warn)';
  return 'var(--down)';
}

const ROW_STYLE: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr auto auto auto',
  alignItems: 'center',
  gap: '14px',
  padding: '11px 14px',
  borderBottom: '1px solid var(--border)',
  fontSize: '0.83rem',
};

export function ServerTable({ nodes }: Props) {
  const status = (n: Node) =>
    n.status === 'ok' ? 'ok' : n.status === 'warn' ? 'warn' : 'down';

  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      overflow: 'hidden',
    }}>
      {nodes.length === 0 && (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)',
          fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
          Keine Nodes konfiguriert
        </div>
      )}
      {nodes.map((node, i) => (
        <div key={node.id} style={{ ...ROW_STYLE, borderBottom: i < nodes.length - 1 ? undefined : 'none' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            <StatusDot status={status(node)} pulse={status(node) === 'ok'} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 460 }}>
              {node.name}
            </span>
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            {node.addr}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem',
            color: latencyColor(0) }}>—</span>
          <StatusBadge status={status(node)} />
        </div>
      ))}
    </div>
  );
}
