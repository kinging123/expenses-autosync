import cron from 'node-cron';
import { SyncEngine } from '../core/SyncEngine';
import pino from 'pino';

const logger = pino({ name: 'CronRegistry' });

export class CronRegistry {
  constructor(private syncEngine: SyncEngine) {}

  /**
   * Registers a sync job to run on a cron schedule
   * @param sourceName The name of the registered source
   * @param schedule A standard cron expression (e.g. '0 * * * *' for every hour)
   */
  scheduleSync(sourceName: string, schedule: string) {
    cron.schedule(schedule, async () => {
      logger.info(`Starting cron job for source: ${sourceName}`);
      try {
        await this.syncEngine.syncSource(sourceName);
        logger.info(`Cron job for ${sourceName} completed successfully.`);
      } catch (err) {
        logger.error(err, `Cron job for ${sourceName} failed:`);
      }
    });

    logger.info(`Registered cron schedule '${schedule}' for source: ${sourceName}`);
  }
}
