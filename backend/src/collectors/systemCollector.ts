// helio-app/backend/src/collectors/systemCollector.ts
import si from 'systeminformation';
import os from 'os';
import type { SystemSnapshot } from '../types.js';

const LOOP_PATTERN = /loop|tmpfs|devtmpfs|squashfs|overlay/i;
const LOOPBACK_IFACES = new Set(['lo', 'localhost']);

export async function collectSnapshot(): Promise<SystemSnapshot> {
  const ts = Math.floor(Date.now() / 1000);

  const [load, mem, disks, nets, temp] = await Promise.all([
    si.currentLoad().catch(() => ({ currentLoad: 0 })),
    si.mem().catch(() => ({ used: 0, total: 0 })),
    si.fsSize().catch(() => []),
    si.networkStats().catch(() => []),
    si.cpuTemperature().catch(() => ({ main: undefined })),
  ]);

  const memTotal = (mem as { total: number }).total;
  const memUsed = (mem as { used: number }).used;
  const memPercent = memTotal > 0 ? (memUsed / memTotal) * 100 : 0;

  const diskData = (disks as Array<{ mount: string; size: number; used: number; type?: string }>)
    .filter(d => d.size > 0 && !LOOP_PATTERN.test(d.type ?? '') && !LOOP_PATTERN.test(d.mount))
    .map(d => ({
      mount: d.mount,
      size: d.size,
      used: d.used,
      percent: d.size > 0 ? (d.used / d.size) * 100 : 0,
    }));

  const netData = (nets as Array<{ iface: string; rx_sec: number; tx_sec: number }>)
    .filter(n => !LOOPBACK_IFACES.has(n.iface))
    .map(n => ({ iface: n.iface, rx_sec: n.rx_sec ?? 0, tx_sec: n.tx_sec ?? 0 }));

  const raw = os.loadavg();

  return {
    ts,
    cpu: (load as { currentLoad: number }).currentLoad ?? 0,
    cpuTemp: (temp as { main?: number }).main,
    mem: { used: memUsed, total: memTotal, percent: memPercent },
    disk: diskData,
    net: netData,
    uptime: os.uptime(),
    loadAvg: [raw[0] ?? 0, raw[1] ?? 0, raw[2] ?? 0],
  };
}
