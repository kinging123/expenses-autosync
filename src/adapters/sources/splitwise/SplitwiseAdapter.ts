import type { ISource } from '../../../core/ports/ISource';
import type { Transaction } from '../../../core/models/Transaction';
import pino from 'pino';

const logger = pino({ name: 'SplitwiseAdapter' });

export class SplitwiseAdapter implements ISource {
  public readonly name = 'splitwise';

  constructor(private apiKey?: string) {
    if (!apiKey) {
      logger.warn('No Splitwise API Key provided. Will return mock data.');
    }
  }

  async fetchRecent(since?: Date): Promise<Transaction[]> {
    logger.info({ since }, 'Fetching recent transactions from Splitwise');

    // MOCK IMPLEMENTATION
    // This is where you would make standard HTTP requests to the Splitwise API using `fetch` or `axios`
    // Example:
    // const url = `https://secure.splitwise.com/api/v3.0/get_expenses?dated_after=${since?.toISOString() || '2000-01-01'}`;
    // const res = await fetch(url, { headers: { Authorization: `Bearer ${this.apiKey}` }});
    // const data = await res.json();
    // return data.expenses.map(expense => this.mapToUnifiedTransaction(expense));
    
    // Simulating delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Return dummy data if 'since' is older than today or not provided
    if (!since || since.getTime() < Date.now() - 86400000) {
      return [
        {
          sourceId: 'sw_mock_1',
          sourceName: 'splitwise',
          amount: 25.50,
          currency: 'USD',
          date: new Date(),
          description: 'Lunch at Cafe',
          category: 'Dining Out'
        }
      ];
    }
    
    return []; // No new transactions
  }
}
