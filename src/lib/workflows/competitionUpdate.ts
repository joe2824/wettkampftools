// Bestehende Wettkampfdatei (.wk) fürs neue Jahr: neuer Strafenkatalog und neue Rec-Werte, als neue Datei.
import { saveFile } from "$lib/platform/files";
import { updateCompetitionFile } from "$lib/records/competitionFile";
import { toRecUpdates, type RecChange } from "$lib/records/proposal";
import { userMessage } from "./errors";
import type { LoadedPenalties } from "./penalties";
import { newRulebookDescription, type LoadedRulebook } from "./records";

export interface CompetitionUpdateInput {
	penalties: LoadedPenalties;
	club: LoadedRulebook;
	rows: readonly RecChange[];
	year: number;
}

export type CompetitionSaveOutcome =
	{ ok: true; path: string | null; teams: number; ageGroups: number } | { ok: false; message: string };

const BYTES_PER_MB = 1024 * 1024;
const MAX_COMPETITION_MB = 50;
/** Wettkampfdateien mit Logo dürfen so groß sein wie eine Projektdatei. */
export const MAX_COMPETITION_BYTES = MAX_COMPETITION_MB * BYTES_PER_MB;

const COMPETITION_FILTERS = [{ name: "JAuswertung-Wettkampf", extensions: ["wk"] }];
const COMPETITION_EXTENSION = /\.wk$/i;
const SAVE_FAILED = "Die Wettkampfdatei konnte nicht gespeichert werden.";

/** Vorschlag für die neue Datei; das Original bleibt unverändert. */
export const updatedCompetitionFileName = (name: string, year: number): string =>
	`${name.replace(COMPETITION_EXTENSION, "")} – für ${year}.wk`;

/** Prüft, aktualisiert und kontrolliert die Datei und fragt dann nach dem Speicherort. */
export async function saveUpdatedCompetition(
	file: { name: string; bytes: Uint8Array },
	{ penalties, club, rows, year }: CompetitionUpdateInput
): Promise<CompetitionSaveOutcome> {
	const outcome = updateCompetitionFile(file.bytes, {
		catalog: penalties.catalog,
		clubRecords: club.records,
		updates: toRecUpdates(rows),
		description: newRulebookDescription(year)
	});
	if (!outcome.ok) return outcome;
	try {
		const defaultName = updatedCompetitionFileName(file.name, year);
		const path = await saveFile({ defaultName, filters: COMPETITION_FILTERS, bytes: outcome.bytes });
		return { ok: true, path, teams: outcome.teams, ageGroups: outcome.ageGroups };
	} catch (error) {
		return { ok: false, message: userMessage(error, SAVE_FAILED) };
	}
}
