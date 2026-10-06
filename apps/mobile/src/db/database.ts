import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite'
import { latestVersion, pendingMigrations } from './migrations'

export const db: SQLiteDatabase = openDatabaseSync('eco.db')

/**
 * Local SQLite storage (app móvil, requisito 5).
 *
 * Applies pending migrations tracked via `PRAGMA user_version`, upgrading an
 * existing v1 database (plain `ingreso` table) without losing data.
 */
export function initLocalDatabase(): void {
  const row = db.getFirstSync<{ user_version: number }>('PRAGMA user_version')
  const currentVersion = row?.user_version ?? 0

  for (const migration of pendingMigrations(currentVersion)) {
    db.withTransactionSync(() => {
      for (const statement of migration.statements) {
        db.execSync(statement)
      }
    })
    db.execSync(`PRAGMA user_version = ${migration.version}`)
  }

  if (currentVersion > latestVersion()) {
    throw new Error(`Local database version ${currentVersion} is newer than supported ${latestVersion()}`)
  }
}
