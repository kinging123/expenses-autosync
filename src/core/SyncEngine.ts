import type { ISource } from './ports/ISource';
import type { IDestination } from './ports/IDestination';
import type { IStateStore } from './ports/IStateStore';
import type { Transaction } from './models/Transaction';

import pino from 'pino';

const logger = pino({ name: 'SyncEngine', level: process.env.LOG_LEVEL || 'info' });

export class SyncEngine {
  private sources: Map<string, ISource> = new Map();
  private destinations: Map<string, IDestination> = new Map();

  constructor(private stateStore: IStateStore) { }

  async registerSource(source: ISource) {
    if (source.initialize) {
      logger.info({ source: source.name }, 'Initializing source');
      await source.initialize();
    }
    this.sources.set(source.name, source);
    logger.info({ source: source.name }, 'Registered source');
  }

  registerDestination(destination: IDestination) {
    this.destinations.set(destination.name, destination);
    logger.info({ destination: destination.name }, 'Registered destination');
  }

  /**
   * Run the sync process for a specific source to all registered destinations.
   */
  async syncSource(sourceName: string): Promise<void> {
    const source = this.sources.get(sourceName);
    if (!source) {
      throw new Error(`Source ${sourceName} not found`);
    }

    logger.info({ source: sourceName }, 'Starting sync for source');

    try {
      // 1. Get the last sync time
      const lastSyncTime = await this.stateStore.getLastSyncTime(sourceName);
      logger.debug({ source: sourceName, lastSyncTime }, 'Fetched last sync time');

      // 2. Fetch recent transactions from the source
      const transactions = await source.fetchRecent(lastSyncTime || undefined);

      if (transactions.length === 0) {
        logger.info({ source: sourceName }, 'No new transactions found');
        return;
      }

      logger.info({ source: sourceName, count: transactions.length }, 'Fetched new transactions');

      // 3. Push to all registered destinations
      // For simplicity, we push to all destinations. We could also configure mapping.
      for (const dest of this.destinations.values()) {
        logger.info({ source: sourceName, destination: dest.name, count: transactions.length }, 'Pushing transactions to destination');
        await dest.pushTransactions(transactions);
      }

      // 4. Update the sync state globally for this source
      // Find the latest transaction date to set as the new cursor
      const latestDate = new Date(Math.max(...transactions.map(t => t.date.getTime())));

      await this.stateStore.setLastSyncTime(sourceName, latestDate);
      logger.info({ source: sourceName, newCursor: latestDate }, 'Updated sync state cursor');

    } catch (err) {
      logger.error({ source: sourceName, err }, 'Failed to sync source');
      throw err;
    }
  }

  /**
   * Helper to accept webhooks independently from the polling flow.
   * A webhook adapter will receive the payload, parse it into `Transaction[]`,
   * and call this method.
   */
  async processWebhook(sourceName: string, transactions: Transaction[]): Promise<void> {
    if (transactions.length === 0) return;

    logger.info({ source: sourceName, count: transactions.length }, 'Processing webhook transactions');

    for (const dest of this.destinations.values()) {
      logger.info({ source: sourceName, destination: dest.name, count: transactions.length }, 'Pushing webhook transactions to destination');
      await dest.pushTransactions(transactions);
    }

    // Webhooks might not strictly update the state store cursor since they are pushed, 
    // but updating it ensures we don't re-fetch them later if we also poll.
    const latestDate = new Date(Math.max(...transactions.map(t => t.date.getTime())));
    const existingSyncTime = await this.stateStore.getLastSyncTime(sourceName);
    if (!existingSyncTime || latestDate > existingSyncTime) {
      await this.stateStore.setLastSyncTime(sourceName, latestDate);
    }
  }
}
