// helio-app/frontend/src/components/StatusBadge.tsx
import React from 'react';

type Status = 'ok' | 'warn' | 'down';

const LABELS: Record<Status, string> = { ok: 'online', warn: 'latenz', down: 'down' };

const STYLES: Record<Status, React.CSSProperties> = {
  ok: {
    color: 'var(--ok)',
    background: 'var(--ok-soft)',
    borderColor: 'var(--ok-soft)',
  },
  warn: {
    color: 'var(--warn)',
    background: 'var(--warn-soft)',
    borderColor: 'var(--warn-soft)',
  },
  down: {
    color: 'var(--down)',
    background: 'var(--down-soft)',
    borderColor: 'var(--down-soft)',
  },
};

interface Props {
  status: Status;
  label?: string;
}

export function StatusBadge({ status, label }: Props) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      fontFamily: 'var(--font-mono)',
      fontSize: '0.74rem',
      fontWeight: 500,
      padding: '4px 10px',
      borderRadius: '100px',
      border: '1px solid',
      letterSpacing: '0.01em',
      ...STYLES[status],
    }}>
      {label ?? LABELS[status]}
    </span>
  );
}
