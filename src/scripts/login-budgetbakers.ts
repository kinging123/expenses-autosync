import * as readline from 'readline';
import { env } from '../config/env';
import { SqliteStateStore } from '../adapters/state/SqliteStore';
import { fetchUserData, jar, WEB_ORIGIN } from 'budgetbakers-wallet-importer/dist/auth.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('--- BudgetBakers CLI Authenticator ---');
console.log('Due to aggressive Cloudflare & NextAuth anti-bot protection on BudgetBakers, automated login is blocked.\n');
console.log('To authenticate the background sync server reliably, please do the following step one time:');
console.log('1. Go to https://web.budgetbakers.com and log in normally using your browser.');
console.log('2. Open Developer Tools (F12 or right-click -> Inspect).');
console.log('3. Go to the "Application" or "Storage" tab.');
console.log('4. Expand "Cookies", select "https://web.budgetbakers.com".');
console.log('5. Look for the cookie named "__Secure-next-auth.session-token".');
console.log('6. Double-click to copy its long Value.');

rl.question('\nPaste the __Secure-next-auth.session-token value here: ', async (cookieValue) => {
  const cleanCookie = cookieValue.trim();
  if (!cleanCookie) {
    console.error('Cookie is required.');
    process.exit(1);
  }

  try {
    console.log('\n[Status]: Validating session token with BudgetBakers API...');
    
    // Inject into JAR and perform a dry-run test
    await jar.setCookie(`__Secure-next-auth.session-token=${cleanCookie}; Path=/; Secure; HttpOnly; SameSite=Lax`, WEB_ORIGIN);
    
    try {
      const user = await fetchUserData();
      console.log(`[Status]: Successfully validated! Logged in as User ID: ${user.userId}`);
    } catch (err: any) {
      console.error('\n❌ Validation Failed: BudgetBakers rejected the token. Please make sure you copied the entire value.');
      process.exit(1);
    }

    // Save to DB
    const store = new SqliteStateStore(env.SQLITE_DB_PATH);
    await store.setValue('budgetbakers_session_token', cleanCookie);
    
    console.log('\n✅ Mission accomplished! Validated and saved your tracking session token to the SQLite database.');
    console.log('Your background server will now automatically leverage this token for all headless syncs.');
    process.exit(0);

  } catch (err: any) {
    console.error('\n❌ Setup failed:', err.message);
    process.exit(1);
  }
});
