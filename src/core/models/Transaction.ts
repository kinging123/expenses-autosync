export interface Transaction {
  /** Unique identifier for the transaction from the source system */
  sourceId: string;
  
  /** Name of the source system (e.g. 'splitwise') */
  sourceName: string;

  /** Absolute amount. Convention: positive is expense, negative is income (or vice versa). */
  amount: number;

  /** Three-letter currency code, e.g., 'USD', 'EUR' */
  currency: string;

  /** Date and time the transaction occurred */
  date: Date;

  /** Description or memo of the transaction */
  description: string;

  /** Category name. Will be mapped to the destination's category. */
  category?: string;

  /** Whether this is a transfer or regular expense. Useful for targets. */
  isTransfer?: boolean;
}
