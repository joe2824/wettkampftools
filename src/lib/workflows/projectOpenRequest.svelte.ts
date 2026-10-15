// Rückfrage „Aktuellen Stand ersetzen?“ für eine Projektdatei, egal woher sie kommt.
import { openProject, type OpenProjectOutcome } from "./project";

type OpenProject = (bytes: Uint8Array) => Promise<OpenProjectOutcome>;

export class ProjectOpenRequest {
	/** Projektdatei, die auf Bestätigung wartet. */
	pending = $state.raw<Uint8Array | null>(null);
	busy = $state(false);

	constructor(private readonly open: OpenProject = openProject) {}

	/** Neuere Dateien ersetzen eine offene Rückfrage; während des Öffnens bleibt alles, wie es ist. */
	request(bytes: Uint8Array): void {
		if (!this.busy) this.pending = bytes;
	}

	cancel(): void {
		if (!this.busy) this.pending = null;
	}

	/** Ersetzt den Stand; null, wenn nichts vorgemerkt ist oder schon geöffnet wird. */
	async confirm(): Promise<OpenProjectOutcome | null> {
		if (this.pending === null || this.busy) return null;
		this.busy = true;
		try {
			return await this.open(this.pending);
		} finally {
			this.busy = false;
			this.pending = null;
		}
	}
}

export const projectOpenRequest = new ProjectOpenRequest();
