// helio-app/frontend/src/components/StatusDot.tsx
import React from 'react';

type Status = 'ok' | 'warn' | 'down';

const COLORS: Record<Status, string> = {
  ok: 'var(--ok)',
  warn: 'var(--warn)',
  down: 'var(--down)',
};

const SOFT: Record<Status, string> = {
  ok: 'var(--ok-soft)',
  warn: 'var(--warn-soft)',
  down: 'var(--down-soft)',
};

interface Props {
  status: Status;
  pulse?: boolean;
}

export function StatusDot({ status, pulse }: Props) {
  return (
    <span style={{
      position: 'relative',
      display: 'inline-block',
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      background: COLORS[status],
      boxShadow: `0 0 0 3px ${SOFT[status]}`,
      flexShrink: 0,
    }}>
      {pulse && status === 'ok' && (
        <style>{`
          @keyframes dot-pulse {
            0% { transform: scale(0.8); opacity: 0.7; }
            80%, 100% { transform: scale(2.4); opacity: 0; }
          }
        `}</style>
      )}
      {pulse && status === 'ok' && (
        <span style={{
          position: 'absolute',
          inset: '-3px',
          borderRadius: '50%',
          border: `1px solid ${COLORS[status]}`,
          opacity: 0.6,
          animation: 'dot-pulse 2.4s cubic-bezier(0.22, 1, 0.36, 1) infinite',
        }} />
      )}
    </span>
  );
}
