export interface IStateStore {
  /**
   * Retrieves the last successful sync time for a specific source.
   * @param sourceName The identifier of the source
   * @returns The Date of the last sync, or null if never synced.
   */
  getLastSyncTime(sourceName: string): Promise<Date | null>;

  /**
   * Updates the last successful sync time for a specific source.
   * @param sourceName The identifier of the source
   * @param timestamp The new latest timestamp
   */
  setLastSyncTime(sourceName: string, timestamp: Date): Promise<void>;

  /**
   * Retrieves a persistent value by key.
   * @param key The persistent key string
   * @returns The value string or null
   */
  getValue(key: string): Promise<string | null>;

  /**
   * Sets a persistent value by key.
   * @param key The persistent key string
   * @param value The value string to persist
   */
  setValue(key: string, value: string): Promise<void>;
}
