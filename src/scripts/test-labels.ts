import { SqliteStateStore } from '../adapters/state/SqliteStore';
import { fetchUserData, jar, WEB_ORIGIN } from 'budgetbakers-wallet-importer/dist/auth.js';
import { buildCouchClient } from 'budgetbakers-wallet-importer/dist/couch.js';
import * as dotenv from 'dotenv';
import pino from 'pino';

dotenv.config();

const logger = pino();

async function main() {
  const store = new SqliteStateStore(process.env.SQLITE_DB_PATH || 'sync_state.db');
  const token = await store.getValue('budgetbakers_session_token');
  if (!token) {
    logger.error('No budgetbakers_session_token');
    return;
  }
  
  await jar.setCookie(`__Secure-next-auth.session-token=${token}; Path=/; Secure; HttpOnly; SameSite=Lax`, WEB_ORIGIN);

  const user = await fetchUserData();
  const couch = buildCouchClient(user.replication);

  // Fetch labels (stored as HashTag documents; startkey/endkey must be URL params for _all_docs)
  const res = await couch.get('/_all_docs?include_docs=true&startkey=%22-HashTag_%22&endkey=%22-HashTag_%EF%BF%BF%22');
  console.log("Labels:", JSON.stringify(res.data.rows.map((r: any) => r.doc).filter(Boolean), null, 2));
}

main().catch(console.error);
