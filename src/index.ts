import { env } from './config/env';
import { SyncEngine } from './core/SyncEngine';
import { SqliteStateStore } from './adapters/state/SqliteStore';
import { SplitwiseAdapter } from './adapters/sources/splitwise/SplitwiseAdapter';
import { BudgetBakersAdapter } from './adapters/destinations/budgetbakers/BudgetBakersAdapter';
import { WebhookServer } from './adapters/sources/webhooks/WebhookServer';
import { CronRegistry } from './cron/cronRegistry';
import pino from 'pino';

const logger = pino({ name: 'App' });

async function bootstrap() {
  logger.info('Starting Expense Sync System...');

  // 1. Initialize State Storage
  const stateStore = new SqliteStateStore(env.SQLITE_DB_PATH);

  // 2. Initialize Core Engine
  const syncEngine = new SyncEngine(stateStore);

  // 3. Initialize & Register Adapters
  const splitwise = new SplitwiseAdapter(env.SPLITWISE_API_KEY);
  await syncEngine.registerSource(splitwise);

  const budgetBakers = new BudgetBakersAdapter(stateStore);
  syncEngine.registerDestination(budgetBakers);

  // 4. Start Infrastructure (Cron & Webhooks)
  const cronRegistry = new CronRegistry(syncEngine);
  // Schedule Splitwise to sync every hour at minute 0
  cronRegistry.scheduleSync('splitwise', '0 * * * *');

  const webhookServer = new WebhookServer(syncEngine, stateStore);
  await webhookServer.start(parseInt(env.PORT, 10));

  logger.info('System bootstrapped and running!');

  // Trigger an initial sync right away just as a dry-run check
  logger.info('Triggering initial dry-run sync...');
  await syncEngine.syncSource('splitwise');
}

bootstrap().catch(err => {
  logger.error(err, 'Failed to bootstrap application');
  process.exit(1);
});
