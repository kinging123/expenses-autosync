import Database from 'better-sqlite3';
import type { IStateStore } from '../../core/ports/IStateStore';

export class SqliteStateStore implements IStateStore {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.init();
  }

  private init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sync_state (
        source_name TEXT PRIMARY KEY,
        last_sync_time TEXT NOT NULL
      )
    `);
  }

  async getLastSyncTime(sourceName: string): Promise<Date | null> {
    const row = this.db.prepare(
      'SELECT last_sync_time FROM sync_state WHERE source_name = ?'
    ).get(sourceName) as { last_sync_time: string } | undefined;

    return row ? new Date(row.last_sync_time) : null;
  }

  async setLastSyncTime(sourceName: string, timestamp: Date): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO sync_state(source_name, last_sync_time)
      VALUES(?, ?)
      ON CONFLICT(source_name) DO UPDATE SET last_sync_time=excluded.last_sync_time
    `);
    
    stmt.run(sourceName, timestamp.toISOString());
  }
}
