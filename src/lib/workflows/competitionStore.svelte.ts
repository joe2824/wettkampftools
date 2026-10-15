// Wettkampfstand über Neustarts: beim Start wiederherstellen, bei Änderungen verzögert sichern.
import { certificateSelection, type SelectionState } from "$lib/certificates/selectionState.svelte";
import {
	clearCompetitionState,
	decodeBase64,
	encodeBase64,
	loadCompetition,
	saveCompetitionState,
	type CompetitionState,
	type StoredCertificateSelection,
	type StoredRegistration
} from "$lib/competition/persistence";
import { clearStoredResults, saveStoredResults, type StoredResults } from "$lib/competition/resultsFile";
import { logError, logInfo } from "$lib/log";
import { session as defaultSession, type SessionResults, type SessionState } from "$lib/session.svelte";
import { nextCompetitionEvent } from "$lib/settings/eventInfo";
import type { Settings } from "$lib/settings/settings";
import { settingsStore as defaultSettingsStore, type SettingsStore } from "$lib/settings/settingsStore.svelte";
import { readJAuswertungResults } from "$lib/wwk/results";
import { loadRegistrations } from "./preparation";
import { resultsYearCheck } from "./results";

/** Wartezeit nach der letzten Änderung, bevor gesichert wird. */
export const AUTOSAVE_DELAY_MS = 500;

export interface CompetitionDeps {
	session: SessionState;
	selection: SelectionState;
	settings?: SettingsStore;
	now?: () => Date;
}

type Snapshot = Omit<CompetitionState, "savedAt">;

/** Wettkampfstand im Format der Sicherung, z. B. für die Projektdatei. */
export interface StoredCompetition {
	state: CompetitionState | null;
	results: StoredResults | null;
}

function toStoredResults(results: SessionResults): StoredResults {
	const { fileName, createdMs, modifiedMs, workbook, yearWarning, yearConfirmed } = results;
	return { fileName, createdMs, modifiedMs, workbook, yearWarning, yearConfirmed };
}

/** Noch nicht abgeglichen: beim nächsten Sichern schreiben oder entfernen. */
const UNSYNCED = Symbol("unsynced");

export class CompetitionStore {
	/** ISO-Zeitpunkt der letzten Sicherung; null, wenn nichts gespeichert ist. */
	savedAt = $state<string | null>(null);
	/** Beim Wiederherstellen beiseitegelegte, unlesbare Dateien. */
	setAside: string[] = [];
	#session: SessionState;
	#selection: SelectionState;
	#settings: SettingsStore;
	#now: () => Date;
	#timer: ReturnType<typeof setTimeout> | null = null;
	#queue: Promise<void> = Promise.resolve();
	/** Zuletzt in die eigene Datei geschriebene Ergebnisse. */
	#savedResults: SessionResults | null | typeof UNSYNCED = UNSYNCED;

	constructor(deps: CompetitionDeps) {
		this.#session = deps.session;
		this.#selection = deps.selection;
		this.#settings = deps.settings ?? defaultSettingsStore;
		this.#now = deps.now ?? (() => new Date());
	}

	/** Meldungen werden mit den aktuellen Einstellungen neu eingelesen. */
	async restore(settings: Settings): Promise<void> {
		const { state, results, needsMigration, setAside } = await loadCompetition(this.#now());
		this.setAside = setAside;
		this.#apply({ state, results }, settings);
		// Nicht wiederherstellbare Ergebnisse beim nächsten Sichern entfernen.
		const restored = results === null || this.#session.results !== null;
		this.#savedResults = restored && !needsMigration ? this.#session.results : UNSYNCED;
		if (needsMigration) await this.saveNow();
	}

	/** Ersetzt den ganzen Stand, z. B. aus einer Projektdatei, und sichert ihn sofort. */
	async replace(stored: StoredCompetition, settings: Settings): Promise<void> {
		this.#cancel();
		this.#session.clear();
		this.#selection.attach(null);
		await this.#enqueue(() => this.#clear());
		this.#apply(stored, settings);
		this.#savedResults = UNSYNCED;
		await this.saveNow();
	}

	/** Aktueller Stand im Format der Sicherung. */
	stored(): StoredCompetition {
		const snapshot = this.snapshot();
		const results = this.#session.results;
		return {
			state: snapshot === null ? null : { savedAt: this.#now().toISOString(), ...snapshot },
			results: results === null ? null : toStoredResults(results)
		};
	}

	/** Beobachtet Sitzung und Urkunden-Auswahl; liefert eine Funktion zum Beenden. */
	startAutosave(): () => void {
		let initial = true;
		const stop = $effect.root(() => {
			$effect(() => {
				this.#trackChanges();
				if (initial) initial = false;
				else this.#schedule();
			});
		});
		return () => {
			stop();
			this.#cancel();
		};
	}

	/** Sofort sichern; ohne geladene Dateien wird der Stand entfernt. */
	saveNow(): Promise<void> {
		this.#cancel();
		return this.#enqueue(() => this.#write());
	}

	/** Alle Wettkampfdaten entfernen und die Veranstaltung weiterzählen; Layout und Unterschriften bleiben. */
	async newCompetition(): Promise<void> {
		this.#cancel();
		this.#session.clear();
		this.#selection.attach(null);
		await this.#enqueue(() => this.#clear());
		await this.#advanceEvent();
		logInfo("competition.cleared");
	}

	/** Wartet, bis alle Sicherungen geschrieben sind. */
	idle(): Promise<void> {
		return this.#queue;
	}

	snapshot(): Snapshot | null {
		const { registration, results } = this.#session;
		if (registration === null && results === null) return null;
		const snapshot: Snapshot = {};
		if (registration) {
			snapshot.registration = {
				fileName: registration.fileName,
				csvBase64: encodeBase64(registration.sourceBytes),
				waveSelection: [...registration.waveSelection]
			};
		}
		if (results) {
			const { hidden, excluded } = this.#selection;
			snapshot.certificateSelection = {
				hidden: { ageGroups: [...hidden.ageGroups], genders: [...hidden.genders], kinds: [...hidden.kinds] },
				excluded: [...excluded]
			};
		}
		return snapshot;
	}

	#apply({ state, results }: StoredCompetition, settings: Settings): void {
		if (state) this.savedAt = state.savedAt;
		if (state?.registration) this.#restoreRegistration(state.registration, settings);
		if (results) this.#restoreResults(results, state?.certificateSelection);
	}

	#restoreRegistration(stored: StoredRegistration, settings: Settings): void {
		try {
			const outcome = loadRegistrations(decodeBase64(stored.csvBase64), stored.fileName, settings);
			if (!outcome.ok) {
				logError("competition.registrationUnusable");
				return;
			}
			const known = new Set(outcome.registration.teams.map((team) => team.id));
			const waveSelection = new Set(stored.waveSelection.filter((id) => known.has(id)));
			this.#session.setRegistration({ ...outcome.registration, waveSelection });
		} catch {
			logError("competition.registrationRestoreFailed");
		}
	}

	/** Das Dateijahr wird neu geprüft; eine Bestätigung gilt nur für dasselbe Jahr. */
	#restoreResults(stored: StoredResults, selection: StoredCertificateSelection | undefined): void {
		try {
			const { kind, rows } = readJAuswertungResults(stored.workbook);
			const check = resultsYearCheck(stored.workbook, stored, this.#now());
			const yearConfirmed = stored.yearConfirmed && stored.yearWarning === check.yearWarning;
			this.#session.setResults({ ...stored, kind, rows, ...check, yearConfirmed });
		} catch {
			logError("competition.resultsRestoreFailed");
			return;
		}
		// An die wiederhergestellte Arbeitsmappe binden, damit die Urkunden-Seite nichts zurücksetzt.
		this.#selection.attach(this.#session.results?.workbook ?? null);
		if (selection) {
			this.#selection.hidden = selection.hidden;
			this.#selection.excluded = new Set(selection.excluded);
		}
	}

	/** Nummer hochzählen und Datum leeren; ein Fehler hält den neuen Wettkampf nicht auf. */
	async #advanceEvent(): Promise<void> {
		try {
			const event = nextCompetitionEvent($state.snapshot(this.#settings.settings.event));
			await this.#settings.saveFields({ event });
		} catch {
			logError("competition.eventAdvanceFailed");
		}
	}

	#trackChanges(): void {
		void [this.#session.registration, this.#session.results, this.#selection.hidden, this.#selection.excluded];
	}

	#schedule(): void {
		this.#cancel();
		this.#timer = setTimeout(() => {
			this.#timer = null;
			void this.#enqueue(() => this.#write());
		}, AUTOSAVE_DELAY_MS);
	}

	#cancel(): void {
		if (this.#timer === null) return;
		clearTimeout(this.#timer);
		this.#timer = null;
	}

	/** Schreibvorgänge nacheinander, damit „Neuer Wettkampf“ nie überschrieben wird. */
	#enqueue(task: () => Promise<void>): Promise<void> {
		this.#queue = this.#queue.then(task).catch(() => logError("competition.saveFailed"));
		return this.#queue;
	}

	async #write(): Promise<void> {
		const snapshot = this.snapshot();
		if (snapshot === null) return this.#clear();
		await this.#writeResultsIfChanged();
		const savedAt = this.#now().toISOString();
		await saveCompetitionState({ savedAt, ...snapshot });
		this.savedAt = savedAt;
	}

	/** Die großen Ergebnisse nur nach Laden, Bestätigen oder Entfernen schreiben. */
	async #writeResultsIfChanged(): Promise<void> {
		const results = this.#session.results;
		if (results === this.#savedResults) return;
		if (results) await saveStoredResults(toStoredResults(results));
		else await clearStoredResults();
		this.#savedResults = results;
	}

	async #clear(): Promise<void> {
		await clearCompetitionState();
		this.#savedResults = null;
		this.savedAt = null;
	}
}

export const competitionStore = new CompetitionStore({ session: defaultSession, selection: certificateSelection });
