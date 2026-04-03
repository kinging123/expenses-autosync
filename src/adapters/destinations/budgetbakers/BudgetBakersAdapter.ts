import type { IDestination } from '../../../core/ports/IDestination';
import type { Transaction } from '../../../core/models/Transaction';
import type { IStateStore } from '../../../core/ports/IStateStore';
import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';

// Deep imports from the unofficial client
import { fetchUserData, jar, WEB_ORIGIN } from 'budgetbakers-wallet-importer/dist/auth.js';
import { buildCouchClient, buildLookupMaps } from 'budgetbakers-wallet-importer/dist/couch.js';
import { convertRows } from 'budgetbakers-wallet-importer/dist/csv.js';

const logger = pino({ name: 'BudgetBakersAdapter' });

export class BudgetBakersAdapter implements IDestination {
  public readonly name = 'budgetbakers';

  constructor(private stateStore: IStateStore) {}

  async pushTransactions(transactions: Transaction[]): Promise<void> {
    if (transactions.length === 0) return;
    
    logger.info(`Pushing ${transactions.length} transactions to BudgetBakers Wallet`);

    // 1. Rehydrate Session Token
    const sessionToken = await this.stateStore.getValue('budgetbakers_session_token');
    if (!sessionToken) {
      logger.warn('No session token found for BudgetBakers. Skipping sync.');
      return;
    }

    // Set cookie into the jar so `fetchUserData` works
    await jar.setCookie(`__Secure-next-auth.session-token=${sessionToken}; Path=/; Secure; HttpOnly; SameSite=Lax`, WEB_ORIGIN);

    let replication;
    let userId;
    try {
      const user = await fetchUserData();
      userId = user.userId;
      replication = user.replication;
    } catch (err) {
      logger.error('Failed to fetch user data. The session token might be expired.');
      throw err;
    }

    // 2. Initialize CouchDB, Lookup Maps, and Labels
    const couch = buildCouchClient(replication);
    logger.debug('Fetching CouchDB lookups (Accounts, Categories, Currencies, Labels)...');
    let maps: any;
    // Keys are lowercased for case-insensitive lookup
    let labelMap: Record<string, string> = {};
    try {
      [maps] = await Promise.all([
        buildLookupMaps(couch),
        couch.get('/_all_docs?include_docs=true&startkey=%22-HashTag_%22&endkey=%22-HashTag_%EF%BF%BF%22')
          .then((res: any) => {
            for (const row of res.data.rows) {
              if (row.doc?.name) labelMap[row.doc.name.toLowerCase()] = row.doc._id;
            }
          }),
      ]);
    } catch (err) {
      logger.error('Failed to load lookup maps from CouchDB');
      throw err;
    }
    logger.debug({ labelMap }, 'Resolved label map');

    // 3. Transform `Transaction[]` into `CsvRow[]` map structure
    const internalRows = transactions.map(t => {
      const pad = (n: number) => n.toString().padStart(2, '0');
      const dateStr = `${t.date.getFullYear()}-${pad(t.date.getMonth() + 1)}-${pad(t.date.getDate())} ${pad(t.date.getHours())}:${pad(t.date.getMinutes())}:${pad(t.date.getSeconds())}`;

      return {
        date: dateStr,
        account: t.sourceName,
        amount: (-t.amount).toString(),
        category: (t.category && maps.categories[t.category]) ? t.category : 'Others',
        note: t.description || '',
        payee: t.sourceName,
      };
    });

    // 4. Run through `convertRows` to handle transfers and categoryUUID calculation
    const { records, skipped } = convertRows(internalRows, maps);

    if (skipped.length > 0) {
      skipped.forEach((skip: any) => {
        logger.warn({ reason: skip.reason, row: skip.row }, 'Skipped mapping a transaction row');
      });
    }

    if (records.length === 0) {
      logger.info('No valid records mapped to pushing after validations. Skipping _bulk_docs.');
      return;
    }

    // 5. Resolve label UUIDs for AutoSync and per-source labels
    const resolveLabels = (sourceName: string): string[] => {
      const ids: string[] = [];
      if (labelMap['autosync']) ids.push(labelMap['autosync']);
      if (labelMap[sourceName.toLowerCase()]) ids.push(labelMap[sourceName.toLowerCase()]);
      return ids;
    };

    // 6. Write directly to CouchDB so we can include resolved label UUIDs.
    //    (writeRecords from the library hardcodes labels: [] and would erase them.)
    logger.info(`Inserting ${records.length} records into CouchDB via _bulk_docs...`);
    try {
      const now = new Date().toISOString();
      const docs = records.map((r: any, i: number) => {
        const sourceName = transactions[i]?.sourceName ?? '';
        return {
          ...r,
          _id: `Record_${uuidv4()}`,
          refAmount: r.amount,
          recordState: 1,
          categoryChanged: true,
          latitude: 0.0,
          longitude: 0.0,
          accuracy: 0,
          warrantyInMonth: 0,
          suggestedEnvelopeId: 0,
          photos: [],
          refObjects: [],
          labels: resolveLabels(sourceName),
          reservedModelType: 'Record',
          reservedSource: 'web',
          reservedOwnerId: userId,
          reservedAuthorId: userId,
          reservedCreatedAt: now,
          reservedUpdatedAt: now,
        };
      });

      const res = await couch.post('/_bulk_docs', { docs });
      const failed = (res.data as any[]).filter((r: any) => r.error);
      if (failed.length) {
        throw new Error(
          `${failed.length} record(s) rejected by CouchDB:\n` +
          failed.map((r: any) => `  ${r.id}: ${r.error} — ${r.reason}`).join('\n')
        );
      }
      logger.info(`Push completed successfully. Result nodes: ${res.data?.length || 0}`);
    } catch (err) {
      logger.error(err, 'Failed to write records to CouchDB');
      throw err;
    }
  }
}
