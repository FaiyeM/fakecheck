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
