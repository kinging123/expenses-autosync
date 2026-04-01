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
}
