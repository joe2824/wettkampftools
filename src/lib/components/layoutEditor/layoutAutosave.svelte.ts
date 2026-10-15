// Jede Layout-Änderung (Bearbeiten, Rückgängig, Zurücksetzen, Import) verzögert speichern.
import { DebouncedSave } from "$lib/autosave.svelte";
import type { LayoutSet } from "$lib/certificates/layout";
import { layoutStore } from "$lib/certificates/layoutStore.svelte";
import { layoutSnapshot } from "$lib/workflows/layoutEditor";

/** Wartezeit nach der letzten Änderung, bevor gespeichert wird. */
export const LAYOUT_AUTOSAVE_DELAY_MS = 500;

/** Was das automatische Speichern vom Layout-Speicher braucht */
export interface SavableLayouts {
	layouts: LayoutSet;
	save(): Promise<void>;
}

export class LayoutAutosave extends DebouncedSave {
	#seen: string;

	/** Muss beim Anlegen einer Komponente erzeugt werden; beim Abbau wird Ausstehendes gespeichert. */
	constructor(store: SavableLayouts = layoutStore) {
		super(() => store.save(), LAYOUT_AUTOSAVE_DELAY_MS, "layout.saveFailed");
		this.#seen = layoutSnapshot(store.layouts);
		$effect(() => {
			const snapshot = layoutSnapshot(store.layouts);
			if (snapshot === this.#seen) return;
			this.#seen = snapshot;
			this.schedule();
		});
		$effect(() => () => void this.flush());
	}
}
