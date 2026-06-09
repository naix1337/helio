import { config } from './config';
import { collectMetrics } from './collector';
import { Reporter } from './reporter';

console.log(`[Agent] Starting helio-agent v1.0.0`);
console.log(`[Agent] Server: ${config.serverUrl}`);
console.log(`[Agent] Name:   ${config.agentName}`);
console.log(`[Agent] Tags:   ${config.agentTags.join(', ') || '(none)'}`);
console.log(`[Agent] Interval: ${config.reportInterval}ms`);

const reporter = new Reporter();
reporter.connect();

setInterval(async () => {
  try {
    const metrics = await collectMetrics();
    reporter.send(metrics);
  } catch (err) {
    console.error('[Agent] Collection error:', err);
  }
}, config.reportInterval);

// Graceful shutdown
process.on('SIGTERM', () => { reporter.disconnect(); process.exit(0); });
process.on('SIGINT',  () => { reporter.disconnect(); process.exit(0); });
