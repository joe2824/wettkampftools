// Update-Kanal umstellen: Der Schalter wird sofort gespeichert und wirkt nach einem Neustart.
import { relaunch } from "@tauri-apps/plugin-process";
import { flushLog, logError, logInfo } from "$lib/log";
import type { Settings } from "$lib/settings/settings";

export const CHANNEL_SAVE_ERROR = "Die Einstellung konnte nicht gespeichert werden. Bitte erneut versuchen.";
export const RESTART_ERROR =
	"Der Neustart hat nicht geklappt. Bitte DLRG Dorheim Wettkampftools schließen und wieder öffnen.";

interface ChannelStore {
	settings: Pick<Settings, "betaUpdates">;
	saveFields(patch: Partial<Settings>): Promise<void>;
}

/** Liefert eine Fehlermeldung oder null; scheitert das Speichern, bleibt der alte Wert. */
export async function changeBetaUpdates(store: ChannelStore, enabled: boolean): Promise<string | null> {
	const previous = store.settings.betaUpdates;
	try {
		await store.saveFields({ betaUpdates: enabled });
	} catch {
		store.settings.betaUpdates = previous;
		logError("update.channelSaveFailed");
		return CHANNEL_SAVE_ERROR;
	}
	logInfo("update.channelChanged", { beta: enabled });
	return null;
}

/** Liefert eine Fehlermeldung oder null; bei Erfolg kehrt der Aufruf praktisch nicht zurück. */
export async function restartApp(): Promise<string | null> {
	try {
		// Vor dem Neustart schreiben, sonst gehen die letzten Zeilen verloren.
		await flushLog();
		await relaunch();
		return null;
	} catch {
		logError("app.restartFailed");
		return RESTART_ERROR;
	}
}
