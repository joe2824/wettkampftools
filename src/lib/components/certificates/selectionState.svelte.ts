// Auswahl der Urkunden-Seite; bleibt beim Seitenwechsel erhalten, solange dieselbe Ergebnisdatei geladen ist.
import { NO_HIDDEN, type HiddenValues } from "./certificateSelection";

export class SelectionState {
	hidden = $state.raw<HiddenValues>(NO_HIDDEN);
	excluded = $state.raw<ReadonlySet<string>>(new Set());
	#source: object | null = null;

	/** Andere Ergebnisdatei: Filter und Häkchen zurücksetzen. */
	attach(source: object | null): void {
		if (source === this.#source) return;
		this.#source = source;
		this.hidden = NO_HIDDEN;
		this.excluded = new Set();
	}
}

export const certificateSelection = new SelectionState();
