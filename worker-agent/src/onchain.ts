import algosdk from 'algosdk';
import type { Wallet } from './types.js';

const AGENT_REGISTRY_APP_ID = 758825158;
const ALGOD_URL = 'https://testnet-api.algonode.cloud';

interface OnChainAgent {
  agentId: bigint;
  owner: string;
  metadataUri: string;
  active: boolean;
  createdAt: bigint;
  updatedAt: bigint;
  capabilityCount: bigint;
}

function getMethodSelector(methodName: string, types: string[]): Uint8Array {
  const signature = `${methodName}(${types.join(',')})`;
  const hash = new Uint8Array(32);
  const encoder = new TextEncoder();
  const data = encoder.encode(signature);
  
  let h = 0;
  for (let i = 0; i < data.length; i++) {
    h = ((h << 5) - h + data[i]) | 0;
  }
  
  const view = new DataView(hash.buffer);
  view.setInt32(0, h, true);
  return hash.slice(0, 4);
}

export async function registerAgentOnChain(wallet: Wallet): Promise<{ agentId: bigint; txId: string } | null> {
  console.log('⚠️ On-chain registration skipped (requires funded wallet)');
  return null;
}

export async function getTotalAgentsOnChain(): Promise<number> {
  try {
    const algoclient = new algosdk.Algodv2('', ALGOD_URL, '');
    
    const result = await algoclient
      .getApplicationByID(AGENT_REGISTRY_APP_ID)
      .do();
    
    const globalState = result.params['global-state'] || [];
    const nextAgentIdState = globalState.find((s: any) => atob(s.key) === 'nextAgentId');
    
    if (nextAgentIdState) {
      return Number(nextAgentIdState.value.uint) - 1;
    }
    
    return 0;
  } catch (err: any) {
    console.error('Error getting total agents:', err.message);
    return 0;
  }
}