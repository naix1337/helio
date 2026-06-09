// helio-app/frontend/src/pages/Agents.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAgentsStore } from '../store/agentsStore.ts';
import { AddAgentModal } from '../components/AddAgentModal.tsx';

function relativeTime(ts: number): string {
  const diff = Date.now() / 1000 - ts;
  if (diff < 60) return 'gerade eben';
  if (diff < 3600) return `vor ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `vor ${Math.floor(diff / 3600)}h`;
  return `vor ${Math.floor(diff / 86400)}d`;
}

const pulseKeyframes = `
@keyframes helio-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.4); }
  50%       { box-shadow: 0 0 0 6px rgba(34,197,94,0); }
}
`;

function StatusDot({ online }: { online: boolean }) {
  return (
    <span style={{
      width: '9px', height: '9px', borderRadius: '50%', flexShrink: 0, display: 'inline-block',
      background: online ? 'var(--ok)' : 'var(--text-dim)',
      animation: online ? 'helio-pulse 2s infinite' : 'none',
    }} />
  );
}

function MiniBar({ value, color }: { value: number; color: string }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div style={{ height: '4px', borderRadius: '2px', background: 'var(--border)', overflow: 'hidden', flex: 1 }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '2px', transition: 'width 0.4s' }} />
    </div>
  );
}

export function Agents() {
  const agents = useAgentsStore((s) => s.agents);
  const fetchAgents = useAgentsStore((s) => s.fetchAgents);
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const online = agents.filter(a => a.status === 'online').length;
  const offline = agents.length - online;

  const avgCpu = agents.length
    ? agents.reduce((s, a) => s + (a.latestMetrics?.cpuUsage ?? 0), 0) / agents.length
    : 0;
  const avgRam = agents.length
    ? agents.reduce((s, a) => s + (a.latestMetrics?.memUsedPercent ?? 0), 0) / agents.length
    : 0;

  return (
    <>
      {/* Inject keyframes once */}
      <style>{pulseKeyframes}</style>

      <div className="page-header">
        <div>
          <h1>Agents</h1>
          <span className="sub">Live · remote nodes</span>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '7px 14px', borderRadius: 'var(--radius)', border: 'none',
            background: 'var(--primary)', color: 'var(--primary-fg)',
            fontWeight: 540, cursor: 'pointer', fontSize: '0.85rem',
          }}
        >
          <Plus size={14} /> Agent hinzufügen
        </button>
      </div>

      {/* Summary bar */}
      <div style={{
        display: 'flex', gap: '24px', alignItems: 'center',
        padding: '10px 16px', marginBottom: '20px',
        background: 'var(--bg-soft)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', fontSize: '0.85rem',
      }}>
        <span>
          <span style={{ color: 'var(--ok)', fontWeight: 540 }}>{online} online</span>
          {' / '}
          <span style={{ color: 'var(--text-muted)' }}>{offline} offline</span>
        </span>
        <span style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
          Ø CPU {avgCpu.toFixed(1)}%
        </span>
        <span style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
          Ø RAM {avgRam.toFixed(1)}%
        </span>
      </div>

      {agents.length === 0 ? (
        <div style={{
          padding: '40px', textAlign: 'center', color: 'var(--text-dim)',
          fontFamily: 'var(--font-mono)', fontSize: '0.85rem',
          border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
        }}>
          Keine Agents registriert
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '12px',
        }}>
          {agents.map(agent => {
            const cpu = agent.latestMetrics?.cpuUsage ?? null;
            const ram = agent.latestMetrics?.memUsedPercent ?? null;
            const osStr = agent.osInfo
              ? `${agent.osInfo.distro} ${agent.osInfo.release}`
              : null;

            return (
              <div
                key={agent.id}
                onClick={() => navigate('/dashboard/agents/' + agent.id)}
                style={{
                  border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                  padding: '16px', background: 'var(--bg-soft)',
                  cursor: 'pointer', transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--primary)'}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'}
              >
                {/* Top row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <StatusDot online={agent.status === 'online'} />
                  <span style={{ fontWeight: 540, fontSize: '0.95rem', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {agent.name}
                  </span>
                  {agent.tags.map(tag => (
                    <span key={tag} style={{
                      background: 'var(--primary-soft)', color: 'var(--primary)',
                      fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px',
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>

                {/* CPU bar */}
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', width: '32px' }}>CPU</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text)', width: '42px', textAlign: 'right' }}>
                      {cpu != null ? `${cpu.toFixed(1)}%` : '—'}
                    </span>
                    <MiniBar value={cpu ?? 0} color="var(--primary)" />
                  </div>
                </div>

                {/* RAM bar */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', width: '32px' }}>RAM</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text)', width: '42px', textAlign: 'right' }}>
                      {ram != null ? `${ram.toFixed(1)}%` : '—'}
                    </span>
                    <MiniBar value={ram ?? 0} color="#8b5cf6" />
                  </div>
                </div>

                {/* Bottom row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>
                    {osStr ?? 'Unbekanntes OS'}
                  </span>
                  <span>{relativeTime(agent.lastSeen)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <AddAgentModal
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); fetchAgents(); }}
        />
      )}
    </>
  );
}
