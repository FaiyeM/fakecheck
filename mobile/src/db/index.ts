import * as SQLite from "expo-sqlite";

// Local offline mirror of completed scans/verdicts/checks (spec §4.8) and a
// correction outbox for offline-queued disputes (spec §12.5). Full read/write
// helpers are added in Phase 11; this module owns schema + connection.

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync("fakecheck.db").then(async (db) => {
      await migrate(db);
      return db;
    });
  }
  return dbPromise;
}

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS scans (
      id              TEXT PRIMARY KEY,
      category        TEXT NOT NULL,
      product         TEXT,
      display_name    TEXT,
      thumbnail_uri   TEXT,
      verdict         TEXT,
      overall_conf    REAL,
      disputed        INTEGER NOT NULL DEFAULT 0,
      created_at      TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS checks (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      scan_id     TEXT NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
      name        TEXT NOT NULL,
      score       INTEGER NOT NULL,
      result      TEXT NOT NULL,
      observation TEXT
    );

    CREATE TABLE IF NOT EXISTS correction_outbox (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      scan_id     TEXT NOT NULL,
      payload     TEXT NOT NULL,
      created_at  TEXT NOT NULL,
      synced      INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_scans_created ON scans(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_outbox_unsynced ON correction_outbox(synced);
  `);
}

// ---- Minimal read/write helpers used by the Verdict + History screens.
// (Phase 11 extends these with the offline correction-queue flush.)

export interface ScanRow {
  id: string;
  category: string;
  product: string | null;
  display_name: string | null;
  thumbnail_uri: string | null;
  verdict: string | null;
  overall_conf: number | null;
  disputed: number;
  created_at: string;
}

export interface CheckRow {
  name: string;
  score: number;
  result: string;
  observation: string | null;
}

export interface SaveScanInput {
  id: string;
  category: string;
  product?: string | null;
  displayName?: string | null;
  thumbnailUri?: string | null;
  verdict?: string | null;
  overallConf?: number | null;
  checks: CheckRow[];
}

/** Persist a completed scan + its checks (called on every verdict, spec §4.8). */
export async function saveScan(input: SaveScanInput): Promise<void> {
  const db = await getDb();
  const createdAt = new Date().toISOString();
  await db.runAsync(
    `INSERT OR REPLACE INTO scans
       (id, category, product, display_name, thumbnail_uri, verdict, overall_conf, disputed, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT disputed FROM scans WHERE id = ?), 0), ?)`,
    input.id,
    input.category,
    input.product ?? null,
    input.displayName ?? null,
    input.thumbnailUri ?? null,
    input.verdict ?? null,
    input.overallConf ?? null,
    input.id,
    createdAt
  );
  await db.runAsync(`DELETE FROM checks WHERE scan_id = ?`, input.id);
  for (const c of input.checks) {
    await db.runAsync(
      `INSERT INTO checks (scan_id, name, score, result, observation) VALUES (?, ?, ?, ?, ?)`,
      input.id,
      c.name,
      c.score,
      c.result,
      c.observation ?? null
    );
  }
}

export async function listScans(): Promise<ScanRow[]> {
  const db = await getDb();
  return db.getAllAsync<ScanRow>(`SELECT * FROM scans ORDER BY created_at DESC`);
}

export async function getScanWithChecks(
  id: string
): Promise<{ scan: ScanRow; checks: CheckRow[] } | null> {
  const db = await getDb();
  const scan = await db.getFirstAsync<ScanRow>(`SELECT * FROM scans WHERE id = ?`, id);
  if (!scan) return null;
  const checks = await db.getAllAsync<CheckRow>(
    `SELECT name, score, result, observation FROM checks WHERE scan_id = ? ORDER BY id`,
    id
  );
  return { scan, checks };
}

export async function deleteScan(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM scans WHERE id = ?`, id);
}

export async function clearScans(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`DELETE FROM checks; DELETE FROM scans;`);
}

/** Mark a scan disputed (optimistic, spec §12.5) + enqueue a correction payload. */
export async function markDisputedAndQueue(scanId: string, payload: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE scans SET disputed = 1 WHERE id = ?`, scanId);
  await db.runAsync(
    `INSERT INTO correction_outbox (scan_id, payload, created_at, synced) VALUES (?, ?, ?, 0)`,
    scanId,
    payload,
    new Date().toISOString()
  );
}
