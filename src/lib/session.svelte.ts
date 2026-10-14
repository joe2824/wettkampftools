// Geladene Dateien des laufenden Wettkampfs. Der Stand wird im App-Datenordner gesichert,
// bis „Neuer Wettkampf“ gewählt wird; Inhalte nie in Logs oder Einstellungs-Exporte.
import type { TextEncodingName } from "$lib/io/csv";
import type { Workbook } from "$lib/platform/workbook";
import type { Rename, Team } from "$lib/wwk/registrations";
import type { CompetitionKind, ResultRow } from "$lib/wwk/results";

export interface SessionRegistration {
	fileName: string;
	/** Originaldatei, damit sie bei geänderten Einstellungen neu eingelesen werden kann. */
	sourceBytes: Uint8Array;
	/** Einstellungen, mit denen eingelesen wurde. */
	settingsKey: string;
	encoding: TextEncodingName;
	teams: Team[];
	renames: Rename[];
	/** IDs der Mannschaften, die in der Welle starten. */
	waveSelection: Set<string>;
}

export interface SessionResults {
	fileName: string;
	lastModified: number;
	workbook: Workbook;
	kind: CompetitionKind;
	rows: ResultRow[];
	/** Jahr der Datei, wenn es nicht das laufende ist; sonst null. */
	yearWarning: number | null;
	/** Erstellungsdatum der Datei war nicht ermittelbar. */
	creationUnknown: boolean;
	/** Benutzer hat bestätigt, dass die Datei trotz anderem Jahr richtig ist. */
	yearConfirmed: boolean;
}

export class SessionState {
	// Nur als Ganzes ersetzt, daher ohne tiefe Beobachtung.
	registration = $state.raw<SessionRegistration | null>(null);
	results = $state.raw<SessionResults | null>(null);
	hasRegistration = $derived(this.registration !== null);
	hasResults = $derived(this.results !== null);

	setRegistration(registration: SessionRegistration | null): void {
		this.registration = registration;
	}

	setResults(results: SessionResults | null): void {
		this.results = results;
	}

	/** Ohne geladene Meldungen passiert nichts. */
	setWaveSelection(teamIds: Iterable<string>): void {
		if (this.registration === null) return;
		this.registration = { ...this.registration, waveSelection: new Set(teamIds) };
	}

	clear(): void {
		this.registration = null;
		this.results = null;
	}
}

export const session = new SessionState();
