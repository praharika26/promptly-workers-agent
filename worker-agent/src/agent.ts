import { getOrCreateWallet, optInToUSDC, hasOptedInToUSDC, getUSDCBalance } from './wallet.js';
import { generateResponse } from './gemini.js';
import { registerAgent, listJobs, submitResponse } from './api.js';
import type { Wallet } from './types.js';

let wallet: Wallet;
let agentId: string = '';
let pollInterval: number = 5000;

async function startAgent() {
  console.log('\n🤖 Starting Worker Agent...\n');
  console.log('='.repeat(50));
  
  console.log('\n📋 Step 1: Wallet Management');
  wallet = getOrCreateWallet();
  console.log('   Wallet Address:', wallet.address);
  
  console.log('\n📋 Step 2: Check USDC opt-in status');
  const optedIn = await hasOptedInToUSDC(wallet);
  if (!optedIn) {
    console.log('   Attempting to opt-in to USDC...');
    const usdcResult = await optInToUSDC(wallet);
    if (usdcResult) {
      console.log('   ✅ Opted-in to USDC');
    } else {
      console.log('   ⚠️ Could not opt-in to USDC (may need funding)');
    }
  } else {
    console.log('   📂 Already opted-in to USDC');
  }
  
  console.log('\n📋 Step 3: Register to Promply (MongoDB)');
  try {
    const regResult = await registerAgent(
      wallet.address,
      process.env.WORKER_NAME || 'worker-agent',
      ['question-answering', 'code-help', 'general']
    );
    console.log('   Registration result:', JSON.stringify(regResult));
    
    if (regResult.success && regResult.agentId) {
      agentId = regResult.agentId;
      console.log('   ✅ MongoDB registration complete with ID:', agentId);
    } else if (regResult.message?.includes('already registered')) {
      console.log('   📂 Agent already registered in MongoDB');
      agentId = regResult.agentId || 'existing-agent';
    } else {
      console.log('   ⚠️ MongoDB registration response:', regResult.message || 'No ID returned');
      agentId = 'worker-agent-id';
    }
  } catch (e: any) {
    console.log('   ⚠️ MongoDB registration error:', e.message);
    agentId = 'worker-agent-id';
  }
  
  console.log('\n📋 Step 4: Starting job polling');
  pollInterval = parseInt(process.env.POLL_INTERVAL || '5000');
  console.log('   Poll interval:', pollInterval, 'ms');
  console.log('\n' + '='.repeat(50));
  console.log('🔄 Polling for jobs...\n');
  
  await pollJobs();
  setInterval(pollJobs, pollInterval);
}

async function pollJobs() {
  try {
    const { jobs } = await listJobs('OPEN');
    
    if (!jobs || jobs.length === 0) {
      return;
    }
    
    console.log(`📋 Found ${jobs.length} open job(s)`);
    
    for (const job of jobs) {
      console.log(`\n📝 Processing job: ${job._id}`);
      console.log(`   Prompt: ${job.prompt.substring(0, 80)}...`);
      console.log(`   Budget: ${job.budget} ALGO`);
      
      try {
        console.log('   🤖 Calling Gemini AI...');
        const response = await generateResponse(job.prompt);
        console.log('   💬 Response:', response.substring(0, 100), '...');
        
        const submitResult = await submitResponse(job._id, response, agentId);
        console.log('   ✅ Response submitted:', JSON.stringify(submitResult));
        
        const balance = await getUSDCBalance(wallet);
        console.log('   💰 Current USDC balance:', balance);
        
      } catch (e: any) {
        console.log('   ❌ Error processing job:', e.message);
      }
    }
  } catch (e: any) {
    if (process.env.LOG_LEVEL === 'debug') {
      console.log('   Polling error:', e.message);
    }
  }
}

startAgent().catch(console.error);

export { startAgent };