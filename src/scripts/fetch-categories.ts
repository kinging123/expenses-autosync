import { SplitwiseAdapter } from '../adapters/sources/splitwise/SplitwiseAdapter.js';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  const sw = new SplitwiseAdapter(process.env.SPLITWISE_API_KEY);
  await sw.initialize();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const txs = await sw.fetchRecent(since);
  for (const t of txs) {
    console.log(JSON.stringify({ desc: t.description, category: t.category, amount: t.amount }));
  }
}
main().catch(console.error);
