// helio-app/backend/src/collectors/dockerCollector.ts
import Dockerode from 'dockerode';
import type { ContainerInfo } from '../types.js';

let docker: Dockerode | null = null;
let dockerWarned = false;

function getDocker(): Dockerode | null {
  if (docker) return docker;
  try {
    docker = new Dockerode();
    return docker;
  } catch {
    if (!dockerWarned) {
      console.warn('[Docker] Cannot connect to Docker socket — container metrics disabled');
      dockerWarned = true;
    }
    return null;
  }
}

function calcCpuPercent(stats: Dockerode.ContainerStats): number {
  try {
    const cpu = stats.cpu_stats.cpu_usage.total_usage -
                stats.precpu_stats.cpu_usage.total_usage;
    const sys = stats.cpu_stats.system_cpu_usage -
                (stats.precpu_stats.system_cpu_usage ?? 0);
    const numCpus = stats.cpu_stats.online_cpus ??
                    stats.cpu_stats.cpu_usage.percpu_usage?.length ?? 1;
    return sys > 0 ? (cpu / sys) * numCpus * 100 : 0;
  } catch {
    return 0;
  }
}

function mapStatus(state: string): ContainerInfo['status'] {
  const s = state.toLowerCase();
  if (s === 'running') return 'running';
  if (s === 'exited' || s === 'created') return 'stopped';
  if (s === 'restarting') return 'restarting';
  if (s === 'dead') return 'dead';
  return 'unknown';
}

export async function collectContainers(): Promise<ContainerInfo[]> {
  const d = getDocker();
  if (!d) return [];

  try {
    const list = await d.listContainers({ all: true });

    const results = await Promise.allSettled(
      list.map(async (info) => {
        const container = d.getContainer(info.Id);
        let stats: Dockerode.ContainerStats | null = null;
        try {
          stats = await container.stats({ stream: false }) as Dockerode.ContainerStats;
        } catch {
          // stats may fail for stopped containers
        }

        const memUsed = stats?.memory_stats?.usage ?? 0;
        const memLimit = stats?.memory_stats?.limit ?? 0;
        const cpuPercent = stats ? calcCpuPercent(stats) : 0;

        return {
          id: info.Id.slice(0, 12),
          name: (info.Names[0] ?? info.Id).replace(/^\//, ''),
          image: info.Image,
          status: mapStatus(info.State),
          cpu_percent: Math.round(cpuPercent * 100) / 100,
          mem_used: memUsed,
          mem_limit: memLimit,
          mem_percent: memLimit > 0 ? (memUsed / memLimit) * 100 : 0,
          created: info.Created,
          ports: info.Ports.map(p =>
            p.PublicPort ? `${p.PublicPort}:${p.PrivatePort}/${p.Type}` : `${p.PrivatePort}/${p.Type}`
          ),
        } satisfies ContainerInfo;
      })
    );

    return results
      .filter((r): r is PromiseFulfilledResult<ContainerInfo> => r.status === 'fulfilled')
      .map(r => r.value);
  } catch (err) {
    if (!dockerWarned) {
      console.warn('[Docker] Error fetching containers:', err);
      dockerWarned = true;
    }
    return [];
  }
}
