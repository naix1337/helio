// helio-app/frontend/src/components/StatCard.tsx
import React, { ReactNode } from 'react';

interface Props {
  label: string;
  value: string;
  unit: string;
  trend?: string;
  sub?: string;
  children?: ReactNode;
}

export function StatCard({ label, value, unit, trend, sub, children }: Props) {
  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: '13px 14px',
      background: 'var(--surface-2)',
    }}>
      <div style={{
        fontSize: '0.72rem',
        color: 'var(--text-dim)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '6px',
      }}>
        <span>{label}</span>
        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
          {trend && (
            <span style={{ color: 'var(--ok)', fontFamily: 'var(--font-mono)' }}>{trend}</span>
          )}
          {sub && (
            <span style={{ fontFamily: 'var(--font-mono)' }}>{sub}</span>
          )}
        </span>
      </div>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '1.5rem',
        fontWeight: 600,
        letterSpacing: '-0.02em',
        lineHeight: 1.2,
      }}>
        {value}
        <small style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 400 }}>
          {' '}{unit}
        </small>
      </div>
      {children}
    </div>
  );
}
