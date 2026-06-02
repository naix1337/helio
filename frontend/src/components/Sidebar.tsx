// helio-app/frontend/src/components/Sidebar.tsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Server, Box, Bell, Activity,
  Settings, Users,
} from 'lucide-react';
import { useMetricsStore } from '../store/metricsStore.ts';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Übersicht', to: '/dashboard' },
  { icon: Server,          label: 'Nodes',     to: '/dashboard/nodes' },
  { icon: Box,             label: 'Container', to: '/dashboard/containers' },
  { icon: Bell,            label: 'Alerts',    to: '/dashboard/alerts' },
  { icon: Activity,        label: 'Status-Page', to: '/status' },
];

const SYSTEM_ITEMS = [
  { icon: Settings, label: 'Einstellungen', to: '/dashboard/settings' },
  { icon: Users,    label: 'Team',          to: '/dashboard/team' },
];

function WsIndicator() {
  const status = useMetricsStore((s) => s.wsStatus);
  const color = status === 'open' ? 'var(--ok)' : 'var(--text-dim)';
  return (
    <span title={`WS: ${status}`} style={{
      width: '8px', height: '8px', borderRadius: '50%',
      background: color, display: 'inline-block', flexShrink: 0,
    }} />
  );
}

export function Sidebar() {
  const activeStyle: React.CSSProperties = {
    background: 'var(--primary-soft)',
    color: 'var(--primary)',
    fontWeight: 500,
  };

  const itemStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '9px 11px', borderRadius: '8px',
    fontSize: '0.85rem', color: 'var(--text-muted)',
    transition: 'background 0.15s, color 0.15s',
    cursor: 'pointer',
  };

  return (
    <aside style={{
      background: 'var(--bg-soft)',
      borderRight: '1px solid var(--border)',
      padding: '16px 12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '3px',
      overflowY: 'auto',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px',
        padding: '8px 11px 18px', marginBottom: '4px' }}>
        <span style={{
          width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
          background: 'radial-gradient(circle at 30% 28%, var(--primary), #0e7d72 78%)',
          boxShadow: '0 0 0 1px var(--border-strong), 0 4px 12px -4px var(--primary-glow)',
        }} />
        <span style={{ fontWeight: 640, fontSize: '1.05rem', letterSpacing: '-0.02em' }}>Helio</span>
        <WsIndicator />
      </div>

      {NAV_ITEMS.map(({ icon: Icon, label, to }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/dashboard'}
          style={({ isActive }) => ({ ...itemStyle, ...(isActive ? activeStyle : {}) })}
        >
          <Icon size={16} />
          {label}
        </NavLink>
      ))}

      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: '0.66rem',
        textTransform: 'uppercase', letterSpacing: '0.1em',
        color: 'var(--text-dim)', padding: '18px 11px 6px',
      }}>
        System
      </div>

      {SYSTEM_ITEMS.map(({ icon: Icon, label, to }) => (
        <NavLink
          key={to}
          to={to}
          style={({ isActive }) => ({ ...itemStyle, ...(isActive ? activeStyle : {}) })}
        >
          <Icon size={16} />
          {label}
        </NavLink>
      ))}
    </aside>
  );
}
