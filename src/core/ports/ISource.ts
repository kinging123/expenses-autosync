import type { Transaction } from '../models/Transaction';

export interface ISource {
  /** The unique name/identifier for this source (e.g. 'splitwise') */
  readonly name: string;

  /** 
   * Optional initialization to run during startup (e.g. fetching necessary static config)
   */
  initialize?: () => Promise<void>;

  /** 
   * Fetches recent transactions from the source.
   * @param since Optional Date indicating the last successfully synced transaction time. 
   *              If provided, the source should only fetch transactions after this date.
   */
  fetchRecent(since?: Date): Promise<Transaction[]>;
}
