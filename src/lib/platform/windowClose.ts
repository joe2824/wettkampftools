// Letzte Arbeiten, bevor das Hauptfenster schließt.
import type { UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauri } from "./env";

/**
 * Führt die Aufgabe beim Schließen aus; das Fenster schließt danach immer, auch bei einem Fehler.
 * Die Aufgabe muss selbst eine Zeitgrenze haben. Liefert null außerhalb der Desktop-Hülle.
 */
export async function beforeWindowClose(task: () => Promise<unknown>): Promise<UnlistenFn | null> {
	if (!isTauri()) return null;
	return getCurrentWindow().onCloseRequested(async () => {
		await task().catch(() => undefined);
	});
}
