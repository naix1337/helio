// helio-app/frontend/src/pages/Settings.tsx
import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { useSettings } from '../hooks/useSettings.ts';
import type { AppSettings } from '../types.ts';

const inputStyle: React.CSSProperties = {
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  padding: '8px 12px',
  color: 'var(--text)',
  fontSize: '0.9rem',
  width: '100%',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.82rem',
  color: 'var(--text-muted)',
  display: 'block',
  marginBottom: '6px',
  fontWeight: 500,
};

interface SectionProps { title: string; children: React.ReactNode; }

function Section({ title, children }: SectionProps) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
      padding: '24px', background: 'var(--surface)', marginBottom: '20px' }}>
      <h2 style={{ margin: '0 0 20px', fontSize: '0.95rem', fontWeight: 600,
        color: 'var(--text)', letterSpacing: '-0.01em' }}>{title}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {children}
      </div>
    </div>
  );
}

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

function ToggleRow({ label, description, checked, onChange }: ToggleRowProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
      <div>
        <div style={{ fontSize: '0.9rem', fontWeight: 500, marginBottom: '2px' }}>{label}</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{description}</div>
      </div>
      <label style={{ position: 'relative', width: '42px', height: '24px', flexShrink: 0, cursor: 'pointer' }}>
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
          style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }} />
        <span style={{
          position: 'absolute', inset: 0, borderRadius: '12px', transition: 'background 0.2s',
          background: checked ? 'var(--primary)' : 'var(--border-strong)',
        }} />
        <span style={{
          position: 'absolute', top: '3px', left: checked ? '21px' : '3px',
          width: '18px', height: '18px', borderRadius: '50%',
          background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }} />
      </label>
    </div>
  );
}

export function Settings() {
  const { settings, loading, saveSettings } = useSettings();
  const [form, setForm] = useState<AppSettings>(settings);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setForm(settings); }, [settings]);

  if (loading) return <div style={{ padding: '24px', color: 'var(--text-dim)' }}>Lade…</div>;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const set = (key: keyof AppSettings) => (value: string) =>
    setForm(f => ({ ...f, [key]: value }));

  const setBool = (key: keyof AppSettings) => (value: boolean) =>
    setForm(f => ({ ...f, [key]: value ? 'true' : 'false' }));

  return (
    <>
      <div className="page-header">
        <h1>Einstellungen</h1>
      </div>
      <form onSubmit={handleSave} style={{ maxWidth: '600px' }}>
        <Section title="Allgemein">
          <div>
            <label style={labelStyle}>App-Titel</label>
            <input style={inputStyle} value={form.app_title}
              onChange={e => set('app_title')(e.target.value)} />
          </div>
        </Section>

        <Section title="Übersicht (Dashboard)">
          <ToggleRow
            label="CPU-Auslastung anzeigen"
            description="CPU-Karte mit Sparkline-Diagramm"
            checked={form.dashboard_show_cpu === 'true'}
            onChange={setBool('dashboard_show_cpu')}
          />
          <ToggleRow
            label="Arbeitsspeicher anzeigen"
            description="RAM-Karte mit Balkendiagramm"
            checked={form.dashboard_show_ram === 'true'}
            onChange={setBool('dashboard_show_ram')}
          />
          <ToggleRow
            label="Nodes-Tabelle anzeigen"
            description="Liste der registrierten Monitoring-Nodes"
            checked={form.dashboard_show_nodes === 'true'}
            onChange={setBool('dashboard_show_nodes')}
          />
        </Section>

        <Section title="Status-Page">
          <div>
            <label style={labelStyle}>Titel</label>
            <input style={inputStyle} value={form.status_title}
              onChange={e => set('status_title')(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Untertitel</label>
            <input style={inputStyle} value={form.status_subtitle}
              onChange={e => set('status_subtitle')(e.target.value)} />
          </div>
          <ToggleRow
            label="Uptime-Prozentsatz anzeigen"
            description="Zeigt den 90-Tage-Uptime-Wert auf der öffentlichen Statusseite"
            checked={form.status_show_uptime === 'true'}
            onChange={setBool('status_show_uptime')}
          />
        </Section>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            padding: '9px 20px', borderRadius: 'var(--radius)', border: 'none',
            background: saved ? 'var(--ok)' : 'var(--primary)',
            color: 'var(--primary-fg)', fontWeight: 540, cursor: 'pointer',
            fontSize: '0.9rem', transition: 'background 0.2s',
          }}>
            <Save size={15} />
            {saved ? 'Gespeichert ✓' : 'Speichern'}
          </button>
        </div>
      </form>
    </>
  );
}
