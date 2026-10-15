// Ein Einstellungsfeld beim Tippen verzögert speichern, andere Einstellungen bleiben unberührt.
import { logError } from "$lib/log";
import type { Settings } from "./settings";
import type { SettingsStore } from "./settingsStore.svelte";

/** Wartezeit nach dem letzten Tastendruck, bevor gespeichert wird. */
export const FIELD_AUTOSAVE_DELAY_MS = 400;

export type AutosaveStatus = "idle" | "pending" | "saved" | "failed";

export class FieldAutosave<K extends keyof Settings> {
	status = $state<AutosaveStatus>("idle");
	readonly #store: SettingsStore;
	readonly #field: K;
	readonly #failureCode: string;
	#timer: ReturnType<typeof setTimeout> | null = null;
	#queue: Promise<void> = Promise.resolve();

	constructor(store: SettingsStore, field: K, failureCode: string) {
		this.#store = store;
		this.#field = field;
		this.#failureCode = failureCode;
	}

	/** Nach jeder Änderung aufrufen; gespeichert wird erst nach einer Pause. */
	schedule = (): void => {
		this.#cancel();
		this.status = "pending";
		this.#timer = setTimeout(() => {
			this.#timer = null;
			void this.#enqueue();
		}, FIELD_AUTOSAVE_DELAY_MS);
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
			const value = $state.snapshot(this.#store.settings[this.#field]) as Settings[K];
			await this.#store.saveFields({ [this.#field]: value } as Partial<Settings>);
			if (this.#timer === null) this.status = "saved";
		} catch {
			logError(this.#failureCode);
			this.status = "failed";
		}
	}
}
