import type { ISource } from '../../../core/ports/ISource';
import type { Transaction } from '../../../core/models/Transaction';
import pino from 'pino';

const logger = pino({ name: 'SplitwiseAdapter' });

export class SplitwiseAdapter implements ISource {
  public readonly name = 'splitwise';
  private myUserId: number | null = null;

  constructor(private apiKey?: string) {
    if (!apiKey) {
      logger.warn('No Splitwise API Key provided. Will return mock data.');
    }
  }

  async initialize(): Promise<void> {
    if (!this.apiKey) return;

    logger.info('Initializing Splitwise Adapter, fetching user ID...');
    try {
      const userRes = await fetch('https://secure.splitwise.com/api/v3.0/get_current_user', {
        headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Accept': 'application/json' }
      });
      if (userRes.ok) {
        const userData = (await userRes.json()) as any;
        this.myUserId = userData?.user?.id;
        logger.info({ myUserId: this.myUserId }, 'Stored current Splitwise user ID during initialization');
      }
    } catch (err) {
      logger.error(err, 'Failed to fetch current user from Splitwise during initialize');
    }
  }

  async fetchRecent(since?: Date): Promise<Transaction[]> {
    logger.info({ since }, 'Fetching recent transactions from Splitwise');

    if (!this.apiKey) {
      throw new Error('Splitwise API key is missing. Please set SPLITWISE_API_KEY in your .env file.');
    }

    const url = new URL('https://secure.splitwise.com/api/v3.0/get_expenses');
    // Fetch up to the last 100 expenses; in a production app, you might want to handle pagination
    url.searchParams.append('limit', '100');

    if (since) {
      // Splitwise expects ISO 8601 string for dated_after
      url.searchParams.append('dated_after', since.toISOString());
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ status: response.status, body: errorText }, 'Failed to fetch from Splitwise');
      throw new Error(`Splitwise API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as any;

    if (!data.expenses || !Array.isArray(data.expenses)) {
      return [];
    }

    /*
      Example Splitwise Expense Structure for future reference:
      {
        "id": 4384706551,
        "group_id": 92571184,
        "description": "אמפמ חלדייץ",
        "payment": false,
        "creation_method": "equal",
        "transaction_method": "offline",
        "cost": "116.0",
        "currency_code": "ILS",
        "date": "2026-04-01T08:39:34Z",
        "created_at": "2026-04-01T08:39:55Z",
        "category": {
          "id": 18,
          "name": "General"
        },
        "users": [
          {
            "user": { "id": 39696325, "first_name": "Shani", ... },
            "user_id": 39696325,
            "paid_share": "116.0",
            "owed_share": "58.0",
            "net_balance": "58.0"
          },
          ...
        ]
      }
    */

    return data.expenses
      .filter((expense: any) => !expense.deleted_at) // Ignore deleted expenses
      .map((expense: any) => {
        // Find our personal portion of the split
        const myUserObj = expense.users?.find((u: any) => u.user_id === this.myUserId);
        
        if (!myUserObj) return null; // We aren't part of this split somehow

        // For budget tracking, our "share" of an expense is what we ultimately owed for it.
        // Even if we paid the entire $100 bill, if our share is $50, our expense is $50.
        let amount = parseFloat(myUserObj.owed_share);

        // If it's a pure payment (repaying someone or getting repaid) we might look at net balance
        if (expense.creation_method === 'payment') {
          amount = Math.abs(parseFloat(myUserObj.net_balance));
        }

        // If neither applies and we owe 0 on a normal expense (we just paid for others), skip or set 0
        if (amount === 0) return null;

        return {
          sourceId: expense.id.toString(),
          sourceName: this.name,
          amount,
          currency: expense.currency_code,
          date: new Date(expense.date),
          description: expense.description,
          category: expense.category?.name || 'Uncategorized',
          isTransfer: expense.creation_method === 'payment'
        } satisfies Transaction;
      })
      .filter((t: any) => t !== null); // Remove skipped expenses
  }
}
