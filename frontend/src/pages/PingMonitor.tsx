// helio-app/frontend/src/pages/PingMonitor.tsx
import React, { useEffect, useState } from 'react';
import { Plus, Eye, EyeOff, Trash2 } from 'lucide-react';
import { LineChart, Line } from 'recharts';
import { usePingStore } from '../store/pingStore.ts';
import type { PingTarget } from '../types.ts';
import { AddPingTargetModal } from '../components/AddPingTargetModal.tsx';
import { PingDetailPanel } from '../components/PingDetailPanel.tsx';

const pulseKeyframes = `
@keyframes ping-pulse-ok {
  0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.4); }
  50%       { box-shadow: 0 0 0 6px rgba(34,197,94,0); }
}
@keyframes ping-pulse-warn {
  0%, 100% { box-shadow: 0 0 0 0 rgba(234,179,8,0.4); }
  50%       { box-shadow: 0 0 0 6px rgba(234,179,8,0); }
}
@keyframes ping-pulse-danger {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
  50%       { box-shadow: 0 0 0 6px rgba(239,68,68,0); }
}
`;

function StatusDot({ status }: { status?: PingTarget['status'] }) {
  const colorMap: Record<string, string> = {
    up: 'var(--ok)',
    degraded: 'var(--warn)',
    down: 'var(--danger)',
  };
  const animMap: Record<string, string> = {
    up: 'ping-pulse-ok 2s infinite',
    degraded: 'ping-pulse-warn 2s infinite',
    down: 'ping-pulse-danger 2s infinite',
  };
  const bg = status ? colorMap[status] : 'var(--text-dim)';
  const anim = status ? animMap[status] : 'none';
  return (
    <span style={{
      width: '9px', height: '9px', borderRadius: '50%',
      flexShrink: 0, display: 'inline-block',
      background: bg, animation: anim,
    }} />
  );
}

function TypeBadge({ type }: { type: PingTarget['type'] }) {
  return (
    <span style={{
      fontFamily: 'var(--font-mono)', fontSize: '0.68rem',
      padding: '2px 6px', borderRadius: '4px',
      background: 'var(--primary-soft)', color: 'var(--primary)',
      letterSpacing: '0.04em',
    }}>
      {type.toUpperCase()}
    </span>
  );
}

function UptimeBadge({ pct }: { pct: number | undefined }) {
  if (pct == null) return <span style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>—</span>;
  const color = pct >= 99 ? 'var(--ok)' : pct >= 95 ? 'var(--warn)' : 'var(--danger)';
  return (
    <span style={{
      fontFamily: 'var(--font-mono)', fontSize: '0.78rem',
      color, fontWeight: 540,
    }}>
      {pct.toFixed(1)}%
    </span>
  );
}

export function PingMonitor() {
  const targets = usePingStore((s) => s.targets);
  const liveResults = usePingStore((s) => s.liveResults);
  const fetchTargets = usePingStore((s) => s.fetchTargets);
  const setTargets = usePingStore((s) => s.setTargets);

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<PingTarget | null>(null);

  useEffect(() => {
    fetchTargets();
  }, [fetchTargets]);

  const jwt = localStorage.getItem('helio-jwt') ?? '';
  const headers = { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' };

  const upCount = targets.filter(t => t.status === 'up').length;
  const downCount = targets.filter(t => t.status === 'down').length;

  const allLatencies = targets
    .map(t => t.lastPing?.latency_ms)
    .filter((v): v is number => v != null);
  const avgLatency = allLatencies.length
    ? allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length
    : null;

  const handleToggle = async (target: PingTarget, e: React.MouseEvent) => {
    e.stopPropagation();
    const newEnabled = target.enabled === 1 ? 0 : 1;
    try {
      const res = await fetch(`/api/ping/targets/${target.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ enabled: newEnabled }),
      });
      if (res.ok) {
        setTargets(targets.map(t => t.id === target.id ? { ...t, enabled: newEnabled } : t));
      }
    } catch {
      // ignore
    }
  };

  const handleDelete = async (target: PingTarget, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`"${target.name}" wirklich löschen?`)) return;
    try {
      const res = await fetch(`/api/ping/targets/${target.id}`, {
        method: 'DELETE',
        headers,
      });
      if (res.ok) {
        setTargets(targets.filter(t => t.id !== target.id));
        if (selectedTarget?.id === target.id) setSelectedTarget(null);
      }
    } catch {
      // ignore
    }
  };

  return (
    <>
      <style>{pulseKeyframes}</style>

      <div className="page-header">
        <div>
          <h1>Ping Monitor</h1>
          <span className="sub">Scheduled probes · live</span>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '7px 14px', borderRadius: 'var(--radius)', border: 'none',
            background: 'var(--primary)', color: 'var(--primary-fg)',
            fontWeight: 540, cursor: 'pointer', fontSize: '0.85rem',
          }}
        >
          <Plus size={14} /> Ziel hinzufügen
        </button>
      </div>

      {/* Summary row */}
      <div style={{
        display: 'flex', gap: '24px', alignItems: 'center',
        padding: '10px 16px', marginBottom: '20px',
        background: 'var(--bg-soft)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', fontSize: '0.85rem', flexWrap: 'wrap',
      }}>
        <span style={{ color: 'var(--text-muted)' }}>
          {targets.length} Ziele gesamt
        </span>
        <span style={{ color: 'var(--ok)', fontWeight: 540 }}>
          {upCount} up
        </span>
        <span style={{ color: 'var(--danger)', fontWeight: 540 }}>
          {downCount} down
        </span>
        {avgLatency != null && (
          <span style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
            Ø {avgLatency.toFixed(1)} ms
          </span>
        )}
      </div>

      {targets.length === 0 ? (
        <div style={{
          padding: '40px', textAlign: 'center', color: 'var(--text-dim)',
          fontFamily: 'var(--font-mono)', fontSize: '0.85rem',
          border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
        }}>
          Keine Ping-Ziele konfiguriert
        </div>
      ) : (
        <div style={{
          border: '1px solid var(--border)', borderRadius: 'var(--radius)',
          overflow: 'hidden',
        }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '24px 1fr 90px 160px 80px 70px',
            gap: '12px', alignItems: 'center',
            padding: '8px 16px',
            background: 'var(--bg-soft)',
            borderBottom: '1px solid var(--border)',
            fontSize: '0.75rem', color: 'var(--text-dim)',
            fontWeight: 540, letterSpacing: '0.04em', textTransform: 'uppercase',
          }}>
            <span />
            <span>Ziel</span>
            <span>Latenz</span>
            <span>Verlauf (live)</span>
            <span>Uptime</span>
            <span />
          </div>

          {targets.map((target, idx) => {
            const results = liveResults[target.id] ?? [];
            const sparkData = results.slice(-30).map(r => ({
              latency_ms: r.latency_ms ?? 0,
            }));
            const lastLatency = target.lastPing?.latency_ms;
            const isLast = idx === targets.length - 1;

            return (
              <div
                key={target.id}
                onClick={() => setSelectedTarget(target)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '24px 1fr 90px 160px 80px 70px',
                  gap: '12px', alignItems: 'center',
                  padding: '10px 16px',
                  background: 'var(--bg)',
                  borderBottom: isLast ? 'none' : '1px solid var(--border)',
                  cursor: 'pointer', transition: 'background 0.12s',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-soft)'}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--bg)'}
              >
                {/* Status dot */}
                <StatusDot status={target.status} />

                {/* Name + host + badge */}
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{
                      fontWeight: 540, fontSize: '0.88rem',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      opacity: target.enabled ? 1 : 0.5,
                    }}>
                      {target.name}
                    </span>
                    <TypeBadge type={target.type} />
                    {target.tags.map(tag => (
                      <span key={tag} style={{
                        background: 'var(--bg-soft)', color: 'var(--text-dim)',
                        fontSize: '0.68rem', padding: '1px 5px', borderRadius: '3px',
                        border: '1px solid var(--border)',
                      }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                    {target.host}{target.port ? `:${target.port}` : ''}
                  </div>
                </div>

                {/* Live latency */}
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: '0.82rem',
                  color: lastLatency != null ? 'var(--text)' : 'var(--text-dim)',
                }}>
                  {lastLatency != null ? `${lastLatency.toFixed(1)} ms` : '—'}
                </span>

                {/* Sparkline */}
                <div style={{ lineHeight: 0 }}>
                  {sparkData.length > 1 ? (
                    <LineChart width={150} height={40} data={sparkData}>
                      <Line
                        type="monotone"
                        dataKey="latency_ms"
                        stroke="var(--primary)"
                        dot={false}
                        strokeWidth={1.5}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  ) : (
                    <div style={{
                      width: 150, height: 40, display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      color: 'var(--text-dim)', fontSize: '0.72rem',
                    }}>
                      Warte auf Daten…
                    </div>
                  )}
                </div>

                {/* Uptime */}
                <UptimeBadge pct={target.stats24h?.uptimePercent} />

                {/* Actions */}
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    title={target.enabled ? 'Deaktivieren' : 'Aktivieren'}
                    onClick={e => handleToggle(target, e)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: target.enabled ? 'var(--text-muted)' : 'var(--text-dim)',
                      padding: '4px', display: 'flex', alignItems: 'center',
                    }}
                  >
                    {target.enabled ? <Eye size={15} /> : <EyeOff size={15} />}
                  </button>
                  <button
                    title="Löschen"
                    onClick={e => handleDelete(target, e)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--text-dim)', padding: '4px',
                      display: 'flex', alignItems: 'center',
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAddModal && (
        <AddPingTargetModal
          onClose={() => setShowAddModal(false)}
          onSuccess={(newTarget) => {
            setTargets([...targets, newTarget]);
            setShowAddModal(false);
          }}
        />
      )}

      {selectedTarget && (
        <PingDetailPanel
          target={selectedTarget}
          onClose={() => setSelectedTarget(null)}
        />
      )}
    </>
  );
}
