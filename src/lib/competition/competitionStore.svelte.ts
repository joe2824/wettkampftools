// Wettkampfstand über Neustarts: beim Start wiederherstellen, bei Änderungen verzögert sichern.
import { certificateSelection, type SelectionState } from "$lib/components/certificates/selectionState.svelte";
import { logError, logInfo } from "$lib/log";
import { session as defaultSession, type SessionState } from "$lib/session.svelte";
import type { Settings } from "$lib/settings/settings";
import { loadRegistrations } from "$lib/workflows/preparation";
import { readJAuswertungResults } from "$lib/wwk/results";
import {
	clearCompetitionState,
	decodeBase64,
	encodeBase64,
	loadCompetitionState,
	saveCompetitionState,
	type CompetitionState,
	type StoredCertificateSelection,
	type StoredRegistration,
	type StoredResults
} from "./persistence";

/** Wartezeit nach der letzten Änderung, bevor gesichert wird. */
export const AUTOSAVE_DELAY_MS = 500;

export interface CompetitionDeps {
	session: SessionState;
	selection: SelectionState;
	now?: () => Date;
}

type Snapshot = Omit<CompetitionState, "savedAt">;

export class CompetitionStore {
	/** ISO-Zeitpunkt der letzten Sicherung; null, wenn nichts gespeichert ist. */
	savedAt = $state<string | null>(null);
	#session: SessionState;
	#selection: SelectionState;
	#now: () => Date;
	#timer: ReturnType<typeof setTimeout> | null = null;
	#queue: Promise<void> = Promise.resolve();

	constructor(deps: CompetitionDeps) {
		this.#session = deps.session;
		this.#selection = deps.selection;
		this.#now = deps.now ?? (() => new Date());
	}

	/** Meldungen werden mit den aktuellen Einstellungen neu eingelesen. */
	async restore(settings: Settings): Promise<void> {
		const state = await loadCompetitionState();
		if (state === null) return;
		this.savedAt = state.savedAt;
		if (state.registration) this.#restoreRegistration(state.registration, settings);
		if (state.results) this.#restoreResults(state.results, state.certificateSelection);
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

	/** Alle Wettkampfdaten entfernen; Einstellungen, Layout und Unterschriften bleiben. */
	async newCompetition(): Promise<void> {
		this.#cancel();
		this.#session.clear();
		this.#selection.attach(null);
		await this.#enqueue(() => this.#clear());
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
			const { fileName, lastModified, workbook, yearWarning } = results;
			snapshot.results = { fileName, lastModified, workbook, yearWarning };
			const { hidden, excluded } = this.#selection;
			snapshot.certificateSelection = {
				hidden: { ageGroups: [...hidden.ageGroups], genders: [...hidden.genders], kinds: [...hidden.kinds] },
				excluded: [...excluded]
			};
		}
		return snapshot;
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

	#restoreResults(stored: StoredResults, selection: StoredCertificateSelection | undefined): void {
		try {
			const { kind, rows } = readJAuswertungResults(stored.workbook);
			this.#session.setResults({ ...stored, kind, rows });
		} catch {
			logError("competition.resultsRestoreFailed");
			return;
		}
		// An die wiederhergestellten Ergebnisse binden, damit die Urkunden-Seite nichts zurücksetzt.
		this.#selection.attach(this.#session.results);
		if (selection) {
			this.#selection.hidden = selection.hidden;
			this.#selection.excluded = new Set(selection.excluded);
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
		const savedAt = this.#now().toISOString();
		await saveCompetitionState({ savedAt, ...snapshot });
		this.savedAt = savedAt;
	}

	async #clear(): Promise<void> {
		await clearCompetitionState();
		this.savedAt = null;
	}
}

export const competitionStore = new CompetitionStore({ session: defaultSession, selection: certificateSelection });
