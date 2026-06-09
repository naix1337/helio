// helio-app/frontend/src/components/PingDetailPanel.tsx
import React, { useEffect, useState } from 'react';
import { X, Zap } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { usePingStore } from '../store/pingStore.ts';
import type { PingTarget, PingProbeResult } from '../types.ts';

interface Props {
  target: PingTarget;
  onClose: () => void;
}

const PANEL_ANIM_ID = 'ping-panel-anim';

function injectPanelAnim() {
  if (document.getElementById(PANEL_ANIM_ID)) return;
  const style = document.createElement('style');
  style.id = PANEL_ANIM_ID;
  style.textContent = `
    @keyframes ping-slide-in {
      from { transform: translateX(100%); }
      to   { transform: translateX(0); }
    }
  `;
  document.head.appendChild(style);
}

function formatTs(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function statusLabel(status?: PingTarget['status']): string {
  if (status === 'up') return 'Erreichbar';
  if (status === 'degraded') return 'Degradiert';
  if (status === 'down') return 'Nicht erreichbar';
  return 'Unbekannt';
}

function statusColor(status?: PingTarget['status']): string {
  if (status === 'up') return 'var(--ok)';
  if (status === 'degraded') return 'var(--warn)';
  if (status === 'down') return 'var(--danger)';
  return 'var(--text-dim)';
}

export function PingDetailPanel({ target, onClose }: Props) {
  const liveResults = usePingStore((s) => s.liveResults);
  const liveData = liveResults[target.id] ?? [];

  const jwt = localStorage.getItem('helio-jwt') ?? '';
  const headers = { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' };

  const [historyData, setHistoryData] = useState<PingProbeResult[]>([]);
  const [history24h, setHistory24h] = useState<PingProbeResult[]>([]);
  const [testResult, setTestResult] = useState<{ latency_ms: number | null; success: boolean; error?: string | null } | null>(null);
  const [testing, setTesting] = useState(false);

  injectPanelAnim();

  // Fetch 1h history if live data is sparse
  useEffect(() => {
    if (liveData.length >= 3) {
      setHistoryData(liveData);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/ping/targets/${target.id}/history?range=1h`, { headers });
        if (res.ok) {
          const data = await res.json() as PingProbeResult[];
          setHistoryData(data);
        }
      } catch {
        // ignore
      }
    })();
  }, [target.id, liveData.length]);

  // Use live data when available, keep updated
  useEffect(() => {
    if (liveData.length >= 3) {
      setHistoryData(liveData);
    }
  }, [liveData]);

  // Fetch 24h history for timeline
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/ping/targets/${target.id}/history?range=24h`, { headers });
        if (res.ok) {
          const data = await res.json() as PingProbeResult[];
          setHistory24h(data);
        }
      } catch {
        // ignore
      }
    })();
  }, [target.id]);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/ping/targets/${target.id}/test`, {
        method: 'POST',
        headers,
      });
      if (res.ok) {
        const data = await res.json() as PingProbeResult;
        setTestResult({
          latency_ms: data.latency_ms,
          success: data.success === 1,
          error: data.error,
        });
      } else {
        setTestResult({ latency_ms: null, success: false, error: `HTTP ${res.status}` });
      }
    } catch (err) {
      setTestResult({ latency_ms: null, success: false, error: err instanceof Error ? err.message : 'Fehler' });
    } finally {
      setTesting(false);
    }
  };

  // Chart data from history
  const chartData = historyData.slice(-60).map(r => ({
    ts: r.ts,
    latency_ms: r.success ? r.latency_ms : null,
  }));

  // 24h timeline: 24 segments, each 1 hour
  const nowTs = Math.floor(Date.now() / 1000);
  const dayStart = nowTs - 24 * 3600;
  const hourSegments = Array.from({ length: 24 }, (_, i) => {
    const hourStart = dayStart + i * 3600;
    const hourEnd = hourStart + 3600;
    const hourResults = history24h.filter(r => r.ts >= hourStart && r.ts < hourEnd);
    if (hourResults.length === 0) return { index: i, color: 'var(--bg-soft)', pct: null };
    const successes = hourResults.filter(r => r.success === 1).length;
    const pct = (successes / hourResults.length) * 100;
    const color = pct >= 95 ? 'var(--ok)' : pct >= 80 ? 'var(--warn)' : 'var(--danger)';
    return { index: i, color, pct };
  });

  const stats = target.stats24h;

  return (
    /* Overlay */
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.3)',
        zIndex: 150,
      }}
      onClick={onClose}
    >
      {/* Panel */}
      <div
        style={{
          position: 'fixed', right: 0, top: 0, bottom: 0,
          width: 'min(480px, 100vw)',
          background: 'var(--bg-soft)',
          borderLeft: '1px solid var(--border)',
          overflowY: 'auto',
          animation: 'ping-slide-in 0.22s ease-out',
          zIndex: 151,
          display: 'flex', flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Panel header */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          padding: '20px 20px 16px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>{target.name}</h2>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.68rem',
                padding: '2px 6px', borderRadius: '4px',
                background: 'var(--primary-soft)', color: 'var(--primary)',
              }}>
                {target.type.toUpperCase()}
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
              {target.host}{target.port ? `:${target.port}` : ''}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-dim)', padding: '4px', flexShrink: 0,
              display: 'flex', alignItems: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>

          {/* Status row */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 14px',
            background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                width: '9px', height: '9px', borderRadius: '50%',
                background: statusColor(target.status), display: 'inline-block', flexShrink: 0,
              }} />
              <span style={{ fontWeight: 540, color: statusColor(target.status) }}>
                {statusLabel(target.status)}
              </span>
            </div>
            {target.lastPing && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                Zuletzt: {formatTs(target.lastPing.ts)}
              </span>
            )}
          </div>

          {/* Stats row */}
          {stats && (
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px',
            }}>
              {[
                { label: 'Uptime', value: `${stats.uptimePercent.toFixed(1)}%` },
                { label: 'Ø Latenz', value: stats.avgLatency != null ? `${stats.avgLatency.toFixed(1)} ms` : '—' },
                { label: 'Min', value: stats.minLatency != null ? `${stats.minLatency.toFixed(1)} ms` : '—' },
                { label: 'Max', value: stats.maxLatency != null ? `${stats.maxLatency.toFixed(1)} ms` : '—' },
              ].map(({ label, value }) => (
                <div key={label} style={{
                  padding: '10px 12px',
                  background: 'var(--bg)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)', textAlign: 'center',
                }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: '4px' }}>{label}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem', fontWeight: 540 }}>{value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Test now button */}
          <div>
            <button
              onClick={handleTest}
              disabled={testing}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', borderRadius: 'var(--radius)', border: 'none',
                background: 'var(--primary)', color: 'var(--primary-fg)',
                cursor: testing ? 'not-allowed' : 'pointer', fontWeight: 540,
                fontSize: '0.85rem', opacity: testing ? 0.7 : 1,
              }}
            >
              <Zap size={14} />
              {testing ? 'Teste…' : 'Jetzt testen'}
            </button>
            {testResult != null && (
              <div style={{
                marginTop: '10px', padding: '10px 14px',
                borderRadius: 'var(--radius)',
                background: testResult.success
                  ? 'color-mix(in srgb, var(--ok) 10%, transparent)'
                  : 'color-mix(in srgb, var(--danger) 10%, transparent)',
                border: `1px solid color-mix(in srgb, ${testResult.success ? 'var(--ok)' : 'var(--danger)'} 30%, transparent)`,
                fontSize: '0.85rem',
                color: testResult.success ? 'var(--ok)' : 'var(--danger)',
                fontFamily: 'var(--font-mono)',
              }}>
                {testResult.success
                  ? `Erreichbar · ${testResult.latency_ms?.toFixed(1) ?? '?'} ms`
                  : `Nicht erreichbar · ${testResult.error ?? 'Unbekannter Fehler'}`}
              </div>
            )}
          </div>

          {/* Latency area chart */}
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '10px', fontWeight: 540 }}>
              Latenz (letzte Stunde)
            </div>
            {chartData.length > 1 ? (
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="pingAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="ts"
                    hide={true}
                    type="number"
                    domain={['dataMin', 'dataMax']}
                  />
                  <YAxis hide={true} />
                  <Tooltip
                    formatter={(value: unknown) => {
                      const v = value as number | null;
                      return v != null ? [`${v.toFixed(1)} ms`, 'Latenz'] : ['—', 'Latenz'];
                    }}
                    labelFormatter={(label: number) => formatTs(label)}
                    contentStyle={{
                      background: 'var(--bg)', border: '1px solid var(--border)',
                      fontSize: '0.78rem', borderRadius: 'var(--radius)',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="latency_ms"
                    stroke="var(--primary)"
                    fill="url(#pingAreaGrad)"
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                    connectNulls={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{
                height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-dim)', fontSize: '0.8rem',
                border: '1px solid var(--border)', borderRadius: 'var(--radius)',
              }}>
                Nicht genug Daten
              </div>
            )}
          </div>

          {/* 24h timeline */}
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '10px', fontWeight: 540 }}>
              24-Stunden-Übersicht
            </div>
            <div style={{ display: 'flex', gap: '2px', height: '28px' }}>
              {hourSegments.map(seg => (
                <div
                  key={seg.index}
                  title={seg.pct != null ? `${seg.index}:00 · ${seg.pct.toFixed(0)}% up` : `${seg.index}:00 · keine Daten`}
                  style={{
                    flex: 1, borderRadius: '3px',
                    background: seg.color,
                    border: '1px solid var(--border)',
                    opacity: seg.pct == null ? 0.35 : 1,
                    cursor: 'default',
                  }}
                />
              ))}
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '4px',
              fontFamily: 'var(--font-mono)',
            }}>
              <span>vor 24h</span>
              <span>jetzt</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
