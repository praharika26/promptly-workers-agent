import algosdk from 'algosdk';
import fs from 'fs';
import path from 'path';
import type { Wallet } from './types.js';

const WALLET_PATH = path.join(process.cwd(), 'wallet.json');
const USDC_ASSET_ID = 10458941;
const ALGOD_URL = 'https://testnet-api.algonode.cloud';

export function generateWallet(): Wallet {
  const account = algosdk.generateAccount();
  const sk = account.sk;
  
  const mnemonic = algosdk.secretKeyToMnemonic(sk);
  const address = algosdk.encodeAddress(sk.slice(32));
  const privateKey = Buffer.from(sk).toString('base64');
  
  return { 
    createdAt: new Date().toISOString(), 
    mnemonic, 
    address, 
    privateKey 
  };
}

export function saveWallet(wallet: Wallet): void {
  fs.writeFileSync(WALLET_PATH, JSON.stringify(wallet, null, 2));
  console.log('💾 Wallet saved to wallet.json');
}

export function loadWallet(): Wallet | null {
  if (fs.existsSync(WALLET_PATH)) {
    return JSON.parse(fs.readFileSync(WALLET_PATH, 'utf-8'));
  }
  return null;
}

export function getOrCreateWallet(): Wallet {
  let wallet = loadWallet();
  if (!wallet) {
    wallet = generateWallet();
    saveWallet(wallet);
    console.log('✅ New wallet generated:', wallet.address);
  } else {
    console.log('📂 Existing wallet loaded:', wallet.address);
  }
  return wallet;
}

export async function fundWallet(wallet: Wallet): Promise<boolean> {
  console.log('⚠️ Using fund-worker.ts script instead of automatic funding');
  console.log('   Run: npx tsx ../../scripts/fund-worker.ts');
  return false;
}

export async function optInToUSDC(wallet: Wallet): Promise<boolean> {
  try {
    const algoclient = new algosdk.Algodv2('', ALGOD_URL, '');
    const params = await algoclient.getTransactionParams().do();
    
    const sender = wallet.address;
    const sk = Buffer.from(wallet.privateKey, 'base64');
    
    const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: sender,
      to: sender,
      assetIndex: USDC_ASSET_ID,
      amount: 0,
      suggestedParams: params,
    });
    
    const signedTxn = txn.signTxn(sk);
    const { txId } = await algoclient.sendRawTransaction(signedTxn).do();
    
    await algosdk.waitForConfirmation(algoclient, txId, 4);
    console.log('✅ Opted-in to USDC');
    return true;
  } catch (err: any) {
    if (err.message.includes('already opted-in') || err.message.includes('assetID') || err.message.includes('overspend')) {
      console.log('📂 Already opted-in to USDC or insufficient funds');
      return true;
    }
    console.error('❌ Error opting in to USDC:', err.message);
    return false;
  }
}

export async function hasOptedInToUSDC(wallet: Wallet): Promise<boolean> {
  try {
    const algoclient = new algosdk.Algodv2('', ALGOD_URL, '');
    const accountInfo = await algoclient.accountInformation(wallet.address).do();
    const assets = accountInfo.assets || [];
    return assets.some((a: any) => a['asset-id'] === USDC_ASSET_ID);
  } catch (err: any) {
    console.error('Error checking USDC opt-in:', err.message);
    return false;
  }
}

export async function getUSDCBalance(wallet: Wallet): Promise<number> {
  try {
    const algoclient = new algosdk.Algodv2('', ALGOD_URL, '');
    const accountInfo = await algoclient.accountInformation(wallet.address).do();
    const assets = accountInfo.assets || [];
    const usdcAsset = assets.find((a: any) => a['asset-id'] === USDC_ASSET_ID);
    return usdcAsset ? usdcAsset.amount / 1e6 : 0;
  } catch (err: any) {
    console.error('Error getting USDC balance:', err.message);
    return 0;
  }
}