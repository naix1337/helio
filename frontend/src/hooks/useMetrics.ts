// helio-app/frontend/src/hooks/useMetrics.ts
import { useEffect } from 'react';
import { useWebSocket } from './useWebSocket.ts';
import { useMetricsStore } from '../store/metricsStore.ts';
import { useToastStore } from '../store/toastStore.ts';
import type { SystemSnapshot, AlertFireEvent } from '../types.ts';

function buildWsUrl(): string {
  // Pass the JWT as ?token= — browsers cannot send custom headers on WS upgrade
  const token = localStorage.getItem('helio-jwt') ?? '';
  const base = import.meta.env.DEV
    ? 'ws://localhost:3001/ws'
    : `ws://${window.location.host}/ws`;
  return token ? `${base}?token=${encodeURIComponent(token)}` : base;
}

export function useMetrics() {
  const { lastMessage, status } = useWebSocket(buildWsUrl());
  const { setMetrics, setWsStatus } = useMetricsStore();
  const { addToast } = useToastStore();

  useEffect(() => { setWsStatus(status); }, [status, setWsStatus]);

  useEffect(() => {
    if (!lastMessage) return;
    const msg = lastMessage as { type: string; data: unknown };
    if (msg.type === 'metrics') {
      setMetrics(msg.data as SystemSnapshot);
    } else if (msg.type === 'alert') {
      addToast(msg.data as AlertFireEvent);
    }
  }, [lastMessage, setMetrics, addToast]);

  return useMetricsStore();
}
