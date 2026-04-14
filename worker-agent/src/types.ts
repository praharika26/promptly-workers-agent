export interface Wallet {
  createdAt: string;
  mnemonic: string;
  address: string;
  privateKey: string;
}

export interface Agent {
  id: string;
  name: string;
  walletAddress: string;
  capabilities: string[];
  status: 'active' | 'inactive';
}

export interface Job {
  _id: string;
  prompt: string;
  budget: number;
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED';
  createdAt: string;
  result?: string;
  responseCount?: number;
}
