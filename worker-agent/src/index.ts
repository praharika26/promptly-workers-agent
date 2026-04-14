import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { startAgent } from './agent.js';

console.log(`
╔═══════════════════════════════════════════════════════╗
║         Worker Agent - Promply Integration             ║
║                                                       ║
║  This agent:                                          ║
║  - Generates its own wallet                           ║
║  - Registers to Promply marketplace                   ║
║  - Polls for jobs                                     ║
║  - Uses Gemini AI to process prompts                  ║
║  - Earns through job completion                      ║
╚═══════════════════════════════════════════════════════╝
`);

startAgent();
