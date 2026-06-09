import WebSocket from 'ws';
import { config } from './config';
import type { AgentMetrics } from './types';

const MAX_BUFFER = 60;
const MAX_BACKOFF_MS = 30_000;

export class Reporter {
  private ws: WebSocket | null = null;
  private agentId: string | null = null;
  private buffer: AgentMetrics[] = [];
  private backoffMs = 1000;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private registered = false;

  connect(): void {
    this.doConnect();
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
      this.ws = null;
    }
    console.log('[Agent] Reporter disconnected.');
  }

  send(metrics: AgentMetrics): void {
    if (!this.registered || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      // Buffer the metric
      if (this.buffer.length >= MAX_BUFFER) {
        this.buffer.shift(); // drop oldest
      }
      this.buffer.push(metrics);
      return;
    }

    this.ws.send(JSON.stringify({
      type: 'agent:metrics',
      agentId: this.agentId,
      data: metrics,
    }));
  }

  private doConnect(): void {
    const url = `${config.serverUrl}/ws/agent`;
    console.log(`[Agent] Connecting to ${url} ...`);

    const ws = new WebSocket(url);
    this.ws = ws;

    ws.on('open', () => this.onOpen());
    ws.on('message', (data) => this.onMessage(data));
    ws.on('close', () => this.onClose());
    ws.on('error', (err) => {
      console.error('[Agent] WebSocket error:', err.message);
    });
  }

  private onOpen(): void {
    console.log('[Agent] Connected. Sending registration...');
    this.ws!.send(JSON.stringify({
      type: 'agent:register',
      token: config.agentToken,
      name: config.agentName,
      tags: config.agentTags,
      version: '1.0.0',
    }));
  }

  private onMessage(data: WebSocket.RawData): void {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(data.toString()) as Record<string, unknown>;
    } catch {
      console.warn('[Agent] Received non-JSON message, ignoring.');
      return;
    }

    if (msg.type === 'agent:registered') {
      this.agentId = msg.agentId as string;
      this.registered = true;
      this.backoffMs = 1000; // reset backoff on successful registration
      console.log(`[Agent] Registered with server. agentId=${this.agentId}`);
      this.flushBuffer();
    } else if (msg.type === 'error') {
      console.error('[Agent] Server error:', msg.message);
    }
  }

  private onClose(): void {
    this.registered = false;
    this.agentId = null;
    console.warn(`[Agent] Connection closed. Reconnecting in ${this.backoffMs}ms...`);
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.doConnect();
    }, this.backoffMs);

    // Exponential backoff, capped at MAX_BACKOFF_MS
    this.backoffMs = Math.min(this.backoffMs * 2, MAX_BACKOFF_MS);
  }

  private flushBuffer(): void {
    if (this.buffer.length === 0) return;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    console.log(`[Agent] Flushing ${this.buffer.length} buffered metrics...`);
    this.ws.send(JSON.stringify({
      type: 'agent:metrics_bulk',
      agentId: this.agentId,
      data: this.buffer,
    }));
    this.buffer = [];
  }
}
