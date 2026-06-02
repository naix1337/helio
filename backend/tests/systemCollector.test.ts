// helio-app/backend/tests/systemCollector.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock systeminformation before importing collector
vi.mock('systeminformation', () => ({
  default: {
    currentLoad: vi.fn().mockResolvedValue({ currentLoad: 42.5 }),
    mem: vi.fn().mockResolvedValue({ used: 4_000_000_000, total: 16_000_000_000, free: 12_000_000_000 }),
    fsSize: vi.fn().mockResolvedValue([
      { mount: '/', size: 100_000_000_000, used: 20_000_000_000, type: 'ext4' },
      { mount: '/dev/loop0', size: 1000, used: 1000, type: 'squashfs' },
    ]),
    networkStats: vi.fn().mockResolvedValue([
      { iface: 'eth0', rx_sec: 1024, tx_sec: 512 },
      { iface: 'lo', rx_sec: 0, tx_sec: 0 },
    ]),
    cpuTemperature: vi.fn().mockResolvedValue({ main: 55 }),
    osInfo: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('os')>();
  return { ...actual, uptime: () => 86400, loadavg: () => [0.5, 0.4, 0.3] };
});

import { collectSnapshot } from '../src/collectors/systemCollector.js';

describe('collectSnapshot', () => {
  it('returns a snapshot with correct cpu value', async () => {
    const snap = await collectSnapshot();
    expect(snap.cpu).toBe(42.5);
  });

  it('computes mem.percent correctly', async () => {
    const snap = await collectSnapshot();
    expect(snap.mem.percent).toBeCloseTo(25, 0);
    expect(snap.mem.total).toBe(16_000_000_000);
  });

  it('filters loop devices from disk', async () => {
    const snap = await collectSnapshot();
    expect(snap.disk.every(d => !d.mount.includes('loop'))).toBe(true);
  });

  it('filters loopback from net', async () => {
    const snap = await collectSnapshot();
    expect(snap.net.every(n => n.iface !== 'lo')).toBe(true);
    expect(snap.net).toHaveLength(1);
  });

  it('includes uptime and loadAvg from os module', async () => {
    const snap = await collectSnapshot();
    expect(snap.uptime).toBe(86400);
    expect(snap.loadAvg).toEqual([0.5, 0.4, 0.3]);
  });
});
