// Ungespeicherte Einstellungen beim Schließen des Fensters sichern, statt sie stillschweigend zu verlieren.
import { registerPendingSave, unregisterPendingSave } from "$lib/pendingSaves";
import type { SettingsStore } from "./settingsStore.svelte";

/** Muss beim Anlegen einer Komponente oder in $effect.root aufgerufen werden (nutzt $effect). */
export function saveSettingsOnClose(store: Pick<SettingsStore, "dirty">, save: () => Promise<void>): void {
	const flush = async (): Promise<void> => {
		if (store.dirty) await save();
	};
	$effect(() => {
		if (store.dirty) registerPendingSave(flush);
		else unregisterPendingSave(flush);
		return () => unregisterPendingSave(flush);
	});
}
