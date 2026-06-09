// helio-app/frontend/src/components/AddPingTargetModal.tsx
import React, { useState } from 'react';
import { X, Zap } from 'lucide-react';
import type { PingTarget } from '../types.ts';

interface Props {
  onClose: () => void;
  onSuccess: (target: PingTarget) => void;
}

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-soft)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius)', padding: '9px 12px',
  color: 'var(--text)', fontSize: '0.9rem', width: '100%',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.8rem', color: 'var(--text-dim)',
  display: 'block', marginBottom: '6px',
};

const selectStyle: React.CSSProperties = {
  background: 'var(--bg-soft)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius)', padding: '9px 12px',
  color: 'var(--text)', fontSize: '0.9rem', width: '100%',
  boxSizing: 'border-box', cursor: 'pointer',
};

type PingType = 'icmp' | 'http' | 'tcp';

export function AddPingTargetModal({ onClose, onSuccess }: Props) {
  const [name, setName] = useState('');
  const [host, setHost] = useState('');
  const [type, setType] = useState<PingType>('http');
  const [port, setPort] = useState<string>('');
  const [intervalMs, setIntervalMs] = useState(30000);
  const [timeoutMs, setTimeoutMs] = useState(5000);
  const [tags, setTags] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    latency_ms: number | null; reachable: boolean; error?: string;
  } | null>(null);
  const [testing, setTesting] = useState(false);

  const jwt = localStorage.getItem('helio-jwt') ?? '';
  const headers = { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' };

  const parsedPort = port.trim() !== '' ? parseInt(port, 10) : null;

  const handleTest = async () => {
    if (!host.trim()) { setError('Host ist erforderlich'); return; }
    setTesting(true);
    setTestResult(null);
    try {
      const body: Record<string, unknown> = {
        type: type === 'icmp' ? 'icmp' : type,
        host: host.trim(),
      };
      if (parsedPort != null && !isNaN(parsedPort)) body.port = parsedPort;

      const res = await fetch('/api/ping', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json() as { reachable: boolean; latency_ms: number | null; error?: string };
        setTestResult({ latency_ms: data.latency_ms, reachable: data.reachable, error: data.error });
      } else {
        const text = await res.text();
        setTestResult({ latency_ms: null, reachable: false, error: text || `HTTP ${res.status}` });
      }
    } catch (err) {
      setTestResult({ latency_ms: null, reachable: false, error: err instanceof Error ? err.message : 'Fehler' });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Name ist erforderlich'); return; }
    if (!host.trim()) { setError('Host ist erforderlich'); return; }

    setLoading(true);
    setError(null);
    try {
      const parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean);
      const body: Record<string, unknown> = {
        name: name.trim(),
        host: host.trim(),
        type,
        interval_ms: intervalMs,
        timeout_ms: timeoutMs,
        tags: parsedTags,
      };
      if (parsedPort != null && !isNaN(parsedPort)) {
        body.port = parsedPort;
      } else {
        body.port = null;
      }

      const res = await fetch('/api/ping/targets', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `HTTP ${res.status}`);
      }
      const newTarget = await res.json() as PingTarget;
      onSuccess(newTarget);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  };

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
          width: '480px', maxWidth: '92vw',
          maxHeight: '90vh', overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '20px',
        }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>
            Ziel hinzufügen
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-dim)', padding: '4px',
              display: 'flex', alignItems: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Name */}
          <div>
            <label style={labelStyle}>Name *</label>
            <input
              style={inputStyle}
              placeholder="z.B. Produktions-API"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          {/* Host */}
          <div>
            <label style={labelStyle}>Host *</label>
            <input
              style={inputStyle}
              placeholder="z.B. api.example.com oder 192.168.1.1"
              value={host}
              onChange={e => setHost(e.target.value)}
            />
          </div>

          {/* Type */}
          <div>
            <label style={labelStyle}>Typ</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['icmp', 'http', 'tcp'] as PingType[]).map(t => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  style={{
                    flex: 1, padding: '8px', borderRadius: 'var(--radius)',
                    border: `1px solid ${type === t ? 'var(--primary)' : 'var(--border)'}`,
                    background: type === t ? 'var(--primary-soft)' : 'var(--bg-soft)',
                    color: type === t ? 'var(--primary)' : 'var(--text-muted)',
                    cursor: 'pointer', fontFamily: 'var(--font-mono)',
                    fontSize: '0.82rem', fontWeight: type === t ? 600 : 400,
                    transition: 'all 0.12s',
                  }}
                >
                  {t.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Port (only for HTTP and TCP) */}
          {(type === 'http' || type === 'tcp') && (
            <div>
              <label style={labelStyle}>
                Port {type === 'tcp' ? '*' : '(optional)'}
              </label>
              <input
                style={inputStyle}
                type="number"
                placeholder={type === 'http' ? 'z.B. 80 oder 443' : 'z.B. 3306'}
                value={port}
                onChange={e => setPort(e.target.value)}
                min={1}
                max={65535}
              />
            </div>
          )}

          {/* Interval + Timeout in a row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Intervall</label>
              <select
                style={selectStyle}
                value={intervalMs}
                onChange={e => setIntervalMs(Number(e.target.value))}
              >
                <option value={10000}>10 Sekunden</option>
                <option value={30000}>30 Sekunden</option>
                <option value={60000}>1 Minute</option>
                <option value={300000}>5 Minuten</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Timeout</label>
              <select
                style={selectStyle}
                value={timeoutMs}
                onChange={e => setTimeoutMs(Number(e.target.value))}
              >
                <option value={3000}>3 Sekunden</option>
                <option value={5000}>5 Sekunden</option>
                <option value={10000}>10 Sekunden</option>
              </select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label style={labelStyle}>Tags (kommagetrennt, optional)</label>
            <input
              style={inputStyle}
              placeholder="z.B. prod, api, kritisch"
              value={tags}
              onChange={e => setTags(e.target.value)}
            />
          </div>

          {/* Test button + result */}
          <div>
            <button
              onClick={handleTest}
              disabled={testing || !host.trim()}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 14px', borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                background: 'var(--bg-soft)', color: 'var(--text)',
                cursor: (testing || !host.trim()) ? 'not-allowed' : 'pointer',
                fontSize: '0.85rem', opacity: (testing || !host.trim()) ? 0.6 : 1,
              }}
            >
              <Zap size={13} />
              {testing ? 'Teste…' : 'Jetzt testen'}
            </button>
            {testResult != null && (
              <div style={{
                marginTop: '8px', padding: '9px 12px',
                borderRadius: 'var(--radius)',
                background: testResult.reachable
                  ? 'color-mix(in srgb, var(--ok) 10%, transparent)'
                  : 'color-mix(in srgb, var(--danger) 10%, transparent)',
                border: `1px solid color-mix(in srgb, ${testResult.reachable ? 'var(--ok)' : 'var(--danger)'} 30%, transparent)`,
                fontSize: '0.82rem',
                color: testResult.reachable ? 'var(--ok)' : 'var(--danger)',
                fontFamily: 'var(--font-mono)',
              }}>
                {testResult.reachable
                  ? `Erreichbar · ${testResult.latency_ms?.toFixed(1) ?? '?'} ms`
                  : `Nicht erreichbar · ${testResult.error ?? 'Unbekannter Fehler'}`}
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 'var(--radius)',
              background: 'color-mix(in srgb, var(--danger) 10%, transparent)',
              border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)',
              color: 'var(--danger)', fontSize: '0.85rem',
            }}>
              {error}
            </div>
          )}

          {/* Footer buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
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
              onClick={handleSubmit}
              disabled={loading}
              style={{
                padding: '8px 18px', borderRadius: 'var(--radius)', border: 'none',
                background: 'var(--primary)', color: 'var(--primary-fg)',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 540, opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? '…' : 'Speichern'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
