// Verzögertes Speichern nach Änderungen; Schreibvorgänge laufen nacheinander.
import { logError } from "$lib/log";
import { registerPendingSave, unregisterPendingSave } from "$lib/pendingSaves";

export type AutosaveStatus = "idle" | "pending" | "saved" | "failed";

export class DebouncedSave {
	status = $state<AutosaveStatus>("idle");
	readonly #write: () => Promise<void>;
	readonly #delayMs: number;
	readonly #failureCode: string;
	#timer: ReturnType<typeof setTimeout> | null = null;
	#queue: Promise<void> = Promise.resolve();
	readonly #flushOnClose = (): Promise<void> => this.flush();

	constructor(write: () => Promise<void>, delayMs: number, failureCode: string) {
		this.#write = write;
		this.#delayMs = delayMs;
		this.#failureCode = failureCode;
	}

	/** Nach jeder Änderung aufrufen; gespeichert wird erst nach einer Pause. */
	schedule = (): void => {
		this.#cancel();
		this.status = "pending";
		registerPendingSave(this.#flushOnClose);
		this.#timer = setTimeout(() => {
			this.#timer = null;
			void this.#enqueue();
		}, this.#delayMs);
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
		const queue = this.#queue.then(() => this.#run());
		this.#queue = queue;
		void queue.then(() => {
			// Erst abmelden, wenn nichts mehr wartet.
			if (this.#queue === queue && this.#timer === null) unregisterPendingSave(this.#flushOnClose);
		});
		return queue;
	}

	async #run(): Promise<void> {
		try {
			await this.#write();
			if (this.#timer === null) this.status = "saved";
		} catch {
			logError(this.#failureCode);
			this.status = "failed";
		}
	}
}
