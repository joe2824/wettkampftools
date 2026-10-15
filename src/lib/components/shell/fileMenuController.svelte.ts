// Aktionen des Menüs „Datei“: Neuer Wettkampf, Projekt öffnen, Projekt speichern.
import type { ReadFileResult } from "$lib/components/fileCheck";
import type { FileAction } from "./fileShortcuts";

export interface FileMenuDeps {
	/** Desktop-Hülle mit eigenem Öffnen-Dialog? */
	native: () => boolean;
	/** Öffnen-Dialog der Desktop-Hülle; null bei Abbruch. */
	pickNative: () => Promise<ReadFileResult | null>;
	/** Dateiauswahl des Browsers; das Ergebnis kommt über take(). */
	pickInBrowser: () => void;
	/** Rückfrage „Aktuellen Stand ersetzen?“ anstoßen. */
	requestOpen: (bytes: Uint8Array) => void;
	openBusy: () => boolean;
	/** Nur mit geladenen Dateien gibt es etwas zu entfernen. */
	canStartNew: () => boolean;
	onerror: (message: string) => void;
}

export class FileMenuController {
	saveOpen = $state(false);
	newOpen = $state(false);

	constructor(private readonly deps: FileMenuDeps) {}

	async run(action: FileAction): Promise<void> {
		if (action === "save") this.saveOpen = true;
		else if (action === "new") this.newOpen = this.deps.canStartNew();
		else await this.#open();
	}

	/** Gewählte Projektdatei übernehmen oder den Fehler melden. */
	take(result: ReadFileResult): void {
		if (result.ok) this.deps.requestOpen(result.file.bytes);
		else this.deps.onerror(result.message);
	}

	async #open(): Promise<void> {
		if (this.deps.openBusy()) return;
		if (!this.deps.native()) {
			this.deps.pickInBrowser();
			return;
		}
		const result = await this.deps.pickNative();
		if (result !== null) this.take(result);
	}
}
