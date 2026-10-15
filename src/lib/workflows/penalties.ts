// Strafenkatalog fürs neue Jahr: offiziellen Katalog laden, Vereinsregeln anwenden, Datei vorbereiten.
import { platformFetch } from "$lib/platform/http";
import {
	describePenalty,
	readPenaltyCatalog,
	writePenaltyCatalog,
	type PenaltyCatalog
} from "$lib/records/penaltyCatalog";
import { applyClubPenaltyRules, verifyPenaltyCatalog, type PenaltyChange } from "$lib/records/penaltyRules";
import { userMessage } from "./errors";

export interface LoadedPenalties {
	/** Name der Quelldatei. */
	name: string;
	/** Katalog mit Vereinsregeln. */
	catalog: PenaltyCatalog;
	changes: PenaltyChange[];
	/** Befunde der Kontrolle der fertigen Datei; leer = in Ordnung. */
	issues: string[];
	/** Fertige .def zum Speichern. */
	bytes: Uint8Array;
}

export type PenaltyOutcome = { ok: true; penalties: LoadedPenalties } | { ok: false; message: string };

export const OFFICIAL_PENALTY_NAME = "defaultm.def";
export const OFFICIAL_PENALTY_URL =
	"https://raw.githubusercontent.com/dennisfabri/JAuswertung/main/jauswertung-files/src/main/resources/penalties/" +
	OFFICIAL_PENALTY_NAME;

const UNREADABLE = "Die Datei ist kein JAuswertung-Strafenkatalog.";
const DOWNLOAD_FAILED = "Der Strafenkatalog konnte nicht geladen werden. Besteht eine Internetverbindung?";
const NEW_ENTRY = "neu";

export function preparePenalties(name: string, bytes: Uint8Array): PenaltyOutcome {
	try {
		const { catalog, changes } = applyClubPenaltyRules(readPenaltyCatalog(bytes));
		const file = writePenaltyCatalog(bytes, catalog);
		return { ok: true, penalties: { name, catalog, changes, issues: verifyPenaltyCatalog(file), bytes: file } };
	} catch (error) {
		return { ok: false, message: userMessage(error, UNREADABLE) };
	}
}

export async function downloadOfficialPenalties(): Promise<PenaltyOutcome> {
	let response: Response;
	try {
		response = await platformFetch(OFFICIAL_PENALTY_URL);
	} catch {
		return { ok: false, message: DOWNLOAD_FAILED };
	}
	if (!response.ok) return { ok: false, message: DOWNLOAD_FAILED };
	return preparePenalties(OFFICIAL_PENALTY_NAME, new Uint8Array(await response.arrayBuffer()));
}

/** Alter und neuer Wert für die Änderungstabelle. */
export function changeValues(change: PenaltyChange): { before: string; after: string } {
	return {
		before: change.before === null ? NEW_ENTRY : describePenalty(change.before),
		after: describePenalty(change.after)
	};
}
