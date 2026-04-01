import type { Transaction } from '../models/Transaction';

export interface IDestination {
  /** The unique name/identifier for this destination (e.g. 'budgetbakers') */
  readonly name: string;

  /**
   * Pushes a batch of transactions to the destination system.
   * Should handle mapping internal categories to destination-specific categories.
   * 
   * @param transactions The list of transactions to insert
   * @returns A promise that resolves when the push is successful. Could return statistics.
   */
  pushTransactions(transactions: Transaction[]): Promise<void>;
}
