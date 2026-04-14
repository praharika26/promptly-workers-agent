import algosdk from 'algosdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WALLET_PATH = path.join(__dirname, '..', 'wallet.json');
const USDC_ASSET_ID = 10458941;
const ALGOD_URL = process.env.ALGOD_URL || 'https://testnet-api.algonode.cloud';
const FUNDER_MNEMONIC = process.env.FUNDER_MNEMONIC;
const FUND_AMOUNT_ALGO = parseFloat(process.env.FUND_AMOUNT_ALGO || '0.2');

interface Wallet {
  createdAt: string;
  mnemonic: string;
  address: string;
  privateKey: string;
}

async function main() {
  console.log('🔧 Worker Agent Setup\n');

  if (!FUNDER_MNEMONIC) {
    console.error('❌ FUNDER_MNEMONIC not set in .env');
    process.exit(1);
  }

  const algoclient = new algosdk.Algodv2({ 'X-API-Key': '' }, ALGOD_URL, '');

  let wallet: Wallet | null = null;

  if (fs.existsSync(WALLET_PATH)) {
    console.log('📂 Found existing wallet.json');
    wallet = JSON.parse(fs.readFileSync(WALLET_PATH, 'utf-8'));
    console.log('   Address:', wallet.address);
  } else {
    console.log('🆕 Generating new wallet...');
    const account = algosdk.generateAccount();
    const mnemonic = algosdk.secretKeyToMnemonic(account.sk);
    
    const pubKey = account.sk.slice(32);
    const address = algosdk.encodeAddress(pubKey);
    const privateKey = Buffer.from(account.sk).toString('base64');

    wallet = {
      createdAt: new Date().toISOString(),
      mnemonic,
      address,
      privateKey,
    };

    fs.writeFileSync(WALLET_PATH, JSON.stringify(wallet, null, 2));
    console.log('✅ Wallet generated and saved');
  }

  console.log('\n💰 Checking wallet balance...');
  let accountInfo;
  try {
    accountInfo = await algoclient.accountInformation(wallet.address).do();
  } catch (e) {
    console.log('   Account not found on-chain (needs funding)');
    accountInfo = { amount: 0n, assets: [] };
  }

  const algoBalance = Number(accountInfo.amount) / 1e6;
  console.log('   ALGO balance:', algoBalance.toFixed(4));

  const assets = (accountInfo as any).assets || [];
  const hasUSDC = assets.some((a: any) => a['asset-id'] === USDC_ASSET_ID);
  const needsMore = !hasUSDC && algoBalance < 0.3;

  if (algoBalance < 0.1 || needsMore) {
    const fundAmount = needsMore ? 0.3 - algoBalance : FUND_AMOUNT_ALGO;
    console.log('\n💸 Funding wallet with', fundAmount.toFixed(4), 'ALGO...');
    
    const funderAccount = algosdk.mnemonicToSecretKey(FUNDER_MNEMONIC);
    console.log('   Funder address:', funderAccount.addr);
    console.log('   Worker address:', wallet.address);

    const params = await algoclient.getTransactionParams().do();
    
    const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: funderAccount.addr,
      to: wallet.address,
      amount: Math.floor(fundAmount * 1e6),
      suggestedParams: params,
    });

    const signedTxn = txn.signTxn(funderAccount.sk);
    const { txId } = await algoclient.sendRawTransaction(signedTxn).do();
    await algosdk.waitForConfirmation(algoclient, txId, 4);
    console.log('✅ Wallet funded! Transaction:', txId);
  } else {
    console.log('   Wallet already has sufficient ALGO');
  }

  console.log('\n🎯 Checking USDC opt-in status...');

  if (!hasUSDC) {
    console.log('   Opting into USDC...');
    
    const account = algosdk.mnemonicToSecretKey(wallet.mnemonic);
    
    const params = await algoclient.getTransactionParams().do();
    
    const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: account.addr,
      to: account.addr,
      amount: 0,
      assetIndex: USDC_ASSET_ID,
      suggestedParams: params,
    });

    const signedTxn = txn.signTxn(account.sk);
    const { txId } = await algoclient.sendRawTransaction(Buffer.from(signedTxn)).do();
    await algosdk.waitForConfirmation(algoclient, txId, 4);
    console.log('✅ Opted into USDC! Transaction:', txId);
  } else {
    console.log('   Already opted into USDC');
  }

  const finalAccountInfo = await algoclient.accountInformation(wallet.address).do();
  const finalAlgo = Number(finalAccountInfo.amount) / 1e6;
  const finalAssets = finalAccountInfo.assets || [];
  const usdcAsset = finalAssets.find((a: any) => a['asset-id'] === USDC_ASSET_ID);
  const usdcBalance = usdcAsset ? Number(usdcAsset.amount) / 1e6 : 0;

  console.log('\n📊 Final Wallet Status:');
  console.log('   Address:', wallet.address);
  console.log('   ALGO:', finalAlgo.toFixed(4));
  console.log('   USDC:', usdcBalance.toFixed(6));
  console.log('\n✅ Setup complete! Run "npm start" to start the worker agent.');
}

main().catch(console.error);