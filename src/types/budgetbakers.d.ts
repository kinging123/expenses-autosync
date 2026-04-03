declare module 'budgetbakers-wallet-importer/dist/auth.js' {
  export const WEB_ORIGIN: string;
  export const jar: any;
  export function fetchUserData(): Promise<{ userId: string; replication: any }>;
  export function login(email: string, sessionToken: string | null, log: (msg: string, ctx?: any) => void): Promise<{ sessionToken: string; userId: string; replication: any }>;
}

declare module 'budgetbakers-wallet-importer/dist/couch.js' {
  export function buildCouchClient(replication: any): any;
  export function buildLookupMaps(couch: any): Promise<any>;
}

declare module 'budgetbakers-wallet-importer/dist/csv.js' {
  export function convertRows(rows: any[], maps: any): { records: any[]; skipped: any[] };
}

declare module 'budgetbakers-wallet-importer/dist/records.js' {
  export function writeRecords(couch: any, userId: string, records: any[]): Promise<any[]>;
}
