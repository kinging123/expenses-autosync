import type { IDestination } from '../../../core/ports/IDestination';
import type { Transaction } from '../../../core/models/Transaction';
import pino from 'pino';

const logger = pino({ name: 'BudgetBakersAdapter' });

export class BudgetBakersAdapter implements IDestination {
  public readonly name = 'budgetbakers';

  constructor(private email?: string, private password?: string) {
      if (!email || !password) {
        logger.warn('No credentials for BudgetBakers provided. Operating in dry-run mode.');
      }
  }

  async pushTransactions(transactions: Transaction[]): Promise<void> {
    logger.info(`Pushing ${transactions.length} transactions to BudgetBakers Wallet`);

    // MOCK IMPLEMENTATION
    // Here you would either:
    // 1. Call the BudgetBakers open API (if you use their OpenAPI portal)
    // 2. Or spawn/execute logic from `budgetbakers-wallet-importer` if it provides a Node-compatible SDK.
    
    // Ex: loop over transactions, map the categories to Wallet internal IDs, and push
    for (const trx of transactions) {
      logger.debug({
        amount: trx.amount,
        desc: trx.description,
        timestamp: trx.date,
        source: trx.sourceName
      }, 'Simulated push to budgetbakers');
    }

    // Simulate completion
    await new Promise(resolve => setTimeout(resolve, 800));
    logger.info('Push completed simulated successfully');
  }
}
