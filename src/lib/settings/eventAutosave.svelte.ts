// Veranstaltungsdaten beim Tippen verzögert speichern.
import { FIELD_AUTOSAVE_DELAY_MS, FieldAutosave } from "./fieldAutosave.svelte";
import type { SettingsStore } from "./settingsStore.svelte";

/** Wartezeit nach dem letzten Tastendruck, bevor gespeichert wird. */
export const EVENT_AUTOSAVE_DELAY_MS = FIELD_AUTOSAVE_DELAY_MS;

export class EventAutosave extends FieldAutosave<"event"> {
	constructor(store: SettingsStore) {
		super(store, "event", "settings.eventSaveFailed");
	}
}
