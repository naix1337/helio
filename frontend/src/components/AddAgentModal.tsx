// helio-app/frontend/src/components/AddAgentModal.tsx
import React, { useState } from 'react';
import { Copy, Check, X } from 'lucide-react';
import type { AgentToken } from '../types.ts';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = value;
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
    });
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      title="Kopieren"
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: copied ? 'var(--ok)' : 'var(--text-dim)', padding: '4px',
        display: 'flex', alignItems: 'center',
      }}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-soft)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius)', padding: '9px 12px',
  color: 'var(--text)', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.8rem', color: 'var(--text-dim)', display: 'block', marginBottom: '6px',
};

export function AddAgentModal({ onClose, onSuccess }: Props) {
  const [label, setLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<AgentToken | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true); setError(null);
    try {
      const jwt = localStorage.getItem('helio-jwt') ?? '';
      const res = await fetch('/api/agents/tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ label: label.trim() || null }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `HTTP ${res.status}`);
      }
      const data = await res.json() as AgentToken & { token?: string };
      setToken(data);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  };

  // The raw token string may come as `token` field or `id` depending on API response
  const rawToken = (token as (AgentToken & { token?: string }) | null)?.token ?? token?.id ?? '';

  const dockerCmd = `docker run -d \\
  -e HELIO_SERVER_URL=ws://YOUR-SERVER:3001 \\
  -e HELIO_AGENT_TOKEN=${rawToken} \\
  -e HELIO_AGENT_NAME=my-server \\
  ghcr.io/naix1337/helio-agent:latest`;

  return (
    /* Overlay */
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 200,
      }}
      onClick={onClose}
    >
      {/* Card */}
      <div
        style={{
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          width: '520px', maxWidth: '90vw',
          maxHeight: '90vh', overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>
            {token ? 'Token erstellt' : 'Agent hinzufügen'}
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: '4px' }}
          >
            <X size={18} />
          </button>
        </div>

        {!token ? (
          /* Step 1: Generate */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Label (optional)</label>
              <input
                style={inputStyle}
                placeholder="z.B. prod-server-1"
                value={label}
                onChange={e => setLabel(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !loading && handleGenerate()}
              />
            </div>

            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: 'var(--radius)',
                background: 'color-mix(in srgb, var(--danger) 10%, transparent)',
                border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)',
                color: 'var(--danger, #ef4444)', fontSize: '0.85rem',
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={onClose}
                style={{
                  padding: '8px 18px', borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)', background: 'transparent',
                  color: 'var(--text)', cursor: 'pointer',
                }}
              >
                Abbrechen
              </button>
              <button
                onClick={handleGenerate}
                disabled={loading}
                style={{
                  padding: '8px 18px', borderRadius: 'var(--radius)', border: 'none',
                  background: 'var(--primary)', color: 'var(--primary-fg)',
                  cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 540,
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? '…' : 'Token generieren'}
              </button>
            </div>
          </div>
        ) : (
          /* Step 2: Show token */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              Token wurde erstellt. Kopiere ihn jetzt — er wird nur einmal angezeigt.
            </p>

            {/* Token box */}
            <div>
              <label style={labelStyle}>Agent-Token</label>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 12px',
                background: 'var(--bg-soft)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
              }}>
                <code style={{
                  fontFamily: 'var(--font-mono)', fontSize: '0.78rem',
                  color: 'var(--primary)', flex: 1, wordBreak: 'break-all',
                }}>
                  {rawToken}
                </code>
                <CopyButton value={rawToken} />
              </div>
            </div>

            {/* Docker command */}
            <div>
              <label style={labelStyle}>Docker-Startbefehl</label>
              <div style={{
                position: 'relative',
                padding: '12px 40px 12px 14px',
                background: 'var(--bg-soft)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
              }}>
                <pre style={{
                  margin: 0, fontFamily: 'var(--font-mono)', fontSize: '0.75rem',
                  color: 'var(--text)', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                }}>
                  {dockerCmd}
                </pre>
                <div style={{ position: 'absolute', top: '8px', right: '8px' }}>
                  <CopyButton value={dockerCmd} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={onClose}
                style={{
                  padding: '8px 24px', borderRadius: 'var(--radius)', border: 'none',
                  background: 'var(--primary)', color: 'var(--primary-fg)',
                  cursor: 'pointer', fontWeight: 540,
                }}
              >
                Fertig
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
