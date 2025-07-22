import { DeploymentConfig } from '../types';

// Simple approach: Use relative URLs that work everywhere
// The backend serves both the frontend and API endpoints
const BASE_URL = '';

export async function startDeployment(config: DeploymentConfig) {
  const res = await fetch(`${BASE_URL}/deploy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ config }),
  });
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error || 'Failed to start deployment');
  }
}

export interface LogsResponse {
  logs: string[];
}

export async function fetchLogs(): Promise<string[]> {
  const res = await fetch(`${BASE_URL}/logs`);
  if (!res.ok) return [];
  const data: LogsResponse = await res.json();
  return data.logs || [];
}

export interface StatusResponse {
  running: boolean;
  raw: string;
}

export async function fetchStatus(): Promise<StatusResponse | null> {
  try {
    const res = await fetch(`${BASE_URL}/status`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export interface CancelResponse {
  status: 'cancelled' | 'no_deployment_running';
}

export async function cancelDeployment(): Promise<CancelResponse> {
  const res = await fetch(`${BASE_URL}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error || 'Failed to cancel deployment');
  }
  return res.json();
}
