/**
 * Pure migration plan, decoupled from expo-sqlite so it can be sanity-checked
 * in plain Node. Applied against `PRAGMA user_version` in database.ts.
 */

export interface Migration {
  version: number
  statements: string[]
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    statements: [
      `CREATE TABLE IF NOT EXISTS ingreso (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        rango_edad TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );`,
    ],
  },
  {
    version: 2,
    statements: [
      `ALTER TABLE ingreso ADD COLUMN remote_user_id TEXT;`,
      `ALTER TABLE ingreso ADD COLUMN synced_at TEXT;`,
      `CREATE TABLE IF NOT EXISTS busquedas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        termino TEXT,
        radio_km INTEGER NOT NULL,
        latitud REAL NOT NULL,
        longitud REAL NOT NULL,
        resultados INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );`,
      `CREATE TABLE IF NOT EXISTS calificaciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        business_id TEXT NOT NULL,
        rating INTEGER NOT NULL,
        comentario TEXT NOT NULL DEFAULT '',
        remote_id TEXT,
        synced_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );`,
    ],
  },
  {
    version: 3,
    statements: [
      `CREATE TABLE IF NOT EXISTS negocio (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        remote_id TEXT,
        owner_remote_id TEXT NOT NULL,
        trade_name TEXT NOT NULL,
        ruc TEXT NOT NULL,
        phone TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        product_name TEXT NOT NULL,
        product_price REAL NOT NULL,
        password TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        pending_action TEXT,
        pending_reason TEXT,
        pending_comment TEXT,
        synced_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );`,
    ],
  },
  {
    version: 4,
    statements: [`ALTER TABLE negocio ADD COLUMN pending_skill_name TEXT;`],
  },
  {
    version: 5,
    statements: [`ALTER TABLE busquedas ADD COLUMN hora_buscada TEXT;`],
  },
]

export function pendingMigrations(currentVersion: number): Migration[] {
  return MIGRATIONS.filter((m) => m.version > currentVersion).sort((a, b) => a.version - b.version)
}

export function latestVersion(): number {
  return MIGRATIONS.reduce((max, m) => Math.max(max, m.version), 0)
}
