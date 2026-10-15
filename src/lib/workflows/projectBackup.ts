// Sicherung des bisherigen Stands, bevor ein Projekt ihn ersetzt; die letzten drei bleiben im Datenordner.
import { compactTimestamp, type AppDataStore } from "$lib/platform/fs";
import { PROJECT_EXTENSION } from "$lib/project/projectFile";

export const BACKUP_DIR = "backups";
const BACKUP_PREFIX = "vor-projekt-";
/** So viele Sicherungen bleiben erhalten. */
export const KEEP_BACKUPS = 3;

const isBackupName = (name: string): boolean =>
	name.startsWith(BACKUP_PREFIX) && name.endsWith(`.${PROJECT_EXTENSION}`);

/** Pfad im Datenordner, z. B. „backups/vor-projekt-20261015-080000.wwkprojekt“. */
export const backupPath = (now: Date): string =>
	`${BACKUP_DIR}/${BACKUP_PREFIX}${compactTimestamp(now)}.${PROJECT_EXTENSION}`;

/** Schreibt die Sicherung und entfernt ältere über die Obergrenze hinaus; liefert den Pfad. */
export async function writeBackup(store: AppDataStore, bytes: Uint8Array, now: Date): Promise<string> {
	const path = backupPath(now);
	await store.writeBytes(path, bytes);
	// Der Zeitstempel im Namen sortiert zeitlich.
	const backups = (await store.list(BACKUP_DIR)).filter(isBackupName).sort();
	for (const name of backups.slice(0, -KEEP_BACKUPS)) await store.remove(`${BACKUP_DIR}/${name}`);
	return path;
}
