import { SqliteStateStore } from '../adapters/state/SqliteStore';
import { BudgetBakersAdapter } from '../adapters/destinations/budgetbakers/BudgetBakersAdapter';
import { env } from '../config/env';

async function testPush() {
  console.log('--- Triggering Mock Transaction Sync to BudgetBakers ---');

  const store = new SqliteStateStore(env.SQLITE_DB_PATH);

  // Verify token is securely stored
  const token = await store.getValue('budgetbakers_session_token');
  if (!token) {
    console.error('❌ Missing session token! Run `npm run login:budgetbakers` first.');
    process.exit(1);
  }

  const adapter = new BudgetBakersAdapter(store);

  // A standalone mock transaction mimicking our internal layout
  const mockTransaction = {
    id: `test-exp-${Date.now()}`,
    sourceId: `src-${Date.now()}`,
    amount: -15.50, // Negative for expense
    currency: 'ILS', // Note: BudgetBakers automatically infers the currency based on the Account settings, so it will be ILS natively!
    description: 'Test Automation Transaction 🚀',
    category: 'Others', // Use '?', 'General', or 'Others' to drop it into an uncategorized bucket so you can log it later!
    date: new Date(),
    sourceName: 'splitwise', // Note: The Wallet MUST have an account named exactly "splitwise" or it might skip mapping!
  };

  try {
    console.log(`[Status]: Constructing adapter and pushing 1 transaction payload...`);
    await adapter.pushTransactions([mockTransaction]);

    console.log('\n✅ Successfully pushed test transaction!');
    console.log('Please open your BudgetBakers Wallet app (or web portal) and look for an expense of 15.50 labeled "Test Automation Transaction 🚀"!');
  } catch (err: any) {
    console.error('\n❌ Failed to push transaction:', err);
  }
}

testPush();
