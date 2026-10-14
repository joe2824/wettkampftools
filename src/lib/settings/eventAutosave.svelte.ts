// Veranstaltungsdaten beim Tippen verzögert speichern, andere Einstellungen bleiben unberührt.
import { logError } from "$lib/log";
import type { SettingsStore } from "./settingsStore.svelte";

/** Wartezeit nach dem letzten Tastendruck, bevor gespeichert wird. */
export const EVENT_AUTOSAVE_DELAY_MS = 400;

export type AutosaveStatus = "idle" | "pending" | "saved" | "failed";

export class EventAutosave {
	status = $state<AutosaveStatus>("idle");
	readonly #store: SettingsStore;
	#timer: ReturnType<typeof setTimeout> | null = null;
	#queue: Promise<void> = Promise.resolve();

	constructor(store: SettingsStore) {
		this.#store = store;
	}

	/** Nach jeder Änderung aufrufen; gespeichert wird erst nach einer Pause. */
	schedule = (): void => {
		this.#cancel();
		this.status = "pending";
		this.#timer = setTimeout(() => {
			this.#timer = null;
			void this.#enqueue();
		}, EVENT_AUTOSAVE_DELAY_MS);
	};

	/** Ausstehende Änderung sofort speichern, z. B. beim Verlassen der Seite. */
	flush(): Promise<void> {
		if (this.#timer === null) return this.#queue;
		this.#cancel();
		return this.#enqueue();
	}

	idle(): Promise<void> {
		return this.#queue;
	}

	#cancel(): void {
		if (this.#timer === null) return;
		clearTimeout(this.#timer);
		this.#timer = null;
	}

	#enqueue(): Promise<void> {
		this.#queue = this.#queue.then(() => this.#write());
		return this.#queue;
	}

	async #write(): Promise<void> {
		try {
			await this.#store.saveFields({ event: $state.snapshot(this.#store.settings.event) });
			if (this.#timer === null) this.status = "saved";
		} catch {
			logError("settings.eventSaveFailed");
			this.status = "failed";
		}
	}
}
