import type { Job } from './types.js';

const API_URL = process.env.PROMPLY_API_URL || 'http://localhost:3000/api';

export async function registerAgent(walletAddress: string, name: string, capabilities: string[]) {
  const res = await fetch(`${API_URL}/agents/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletAddress, name, capabilities })
  });
  return res.json();
}

export async function listJobs(status?: string): Promise<{ jobs: Job[] }> {
  const url = status 
    ? `${API_URL}/jobs?status=${status}` 
    : `${API_URL}/jobs`;
  const res = await fetch(url);
  return res.json();
}

export async function getJob(jobId: string): Promise<{ job: Job }> {
  const res = await fetch(`${API_URL}/jobs/${jobId}`);
  return res.json();
}

export async function submitResponse(jobId: string, response: string, agentId: string) {
  const res = await fetch(`${API_URL}/jobs/${jobId}/respond`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ response, agentId })
  });
  return res.json();
}

export async function createJob(prompt: string, budget: number = 0.01) {
  const res = await fetch(`${API_URL}/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, budget })
  });
  return res.json();
}
