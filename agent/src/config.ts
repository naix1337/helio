import os from 'os';

function required(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Required env var ${name} is not set`);
  return val;
}

export const config = {
  serverUrl: required('HELIO_SERVER_URL'),      // e.g. "ws://192.168.1.10:3001"
  agentToken: required('HELIO_AGENT_TOKEN'),
  agentName: process.env.HELIO_AGENT_NAME || os.hostname(),
  agentTags: (process.env.HELIO_AGENT_TAGS || '').split(',').filter(Boolean),
  reportInterval: Number(process.env.HELIO_REPORT_INTERVAL || 5000),
};
