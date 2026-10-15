// Ein Einstellungsfeld beim Tippen verzögert speichern, andere Einstellungen bleiben unberührt.
import { DebouncedSave } from "$lib/autosave.svelte";
import type { Settings } from "./settings";
import type { SettingsStore } from "./settingsStore.svelte";

/** Wartezeit nach dem letzten Tastendruck, bevor gespeichert wird. */
export const FIELD_AUTOSAVE_DELAY_MS = 400;

export class FieldAutosave<K extends keyof Settings> extends DebouncedSave {
	constructor(store: SettingsStore, field: K, failureCode: string) {
		super(
			() => {
				const value = $state.snapshot(store.settings[field]) as Settings[K];
				return store.saveFields({ [field]: value } as Partial<Settings>);
			},
			FIELD_AUTOSAVE_DELAY_MS,
			failureCode
		);
	}
}
