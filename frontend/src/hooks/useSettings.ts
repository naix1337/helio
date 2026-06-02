// helio-app/frontend/src/hooks/useSettings.ts
import { useState, useEffect } from 'react';
import type { AppSettings } from '../types.ts';

const DEFAULTS: AppSettings = {
  app_title: 'Helio',
  status_title: 'System Status',
  status_subtitle: 'Echtzeit-Überwachung aller Systeme',
  status_show_uptime: 'true',
  dashboard_show_cpu: 'true',
  dashboard_show_ram: 'true',
  dashboard_show_nodes: 'true',
};

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then((data: AppSettings) => setSettings({ ...DEFAULTS, ...data }))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const saveSettings = async (updates: Partial<AppSettings>): Promise<void> => {
    const updated = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }).then(r => r.json()) as AppSettings;
    setSettings({ ...DEFAULTS, ...updated });
  };

  return { settings, loading, saveSettings };
}
