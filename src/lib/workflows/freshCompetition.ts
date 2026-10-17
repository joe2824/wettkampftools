// Frische Wettkampfdatei (.wk) fürs neue Jahr aus der Vorjahresdatei, mit neuem Regelwerk, Strafenkatalog
// und den Angaben der Veranstaltung; als neue Datei neben dem Original.
import { saveFile } from "$lib/platform/files";
import { buildFreshCompetition, type CompetitionProperties } from "$lib/records/freshCompetition";
import { toRecUpdates, type RecChange } from "$lib/records/proposal";
import { writeRulebookRecords } from "$lib/records/rulebookRecords";
import type { EventInfo } from "$lib/settings/settings";
import { userMessage } from "./errors";
import type { LoadedPenalties } from "./penalties";
import { newRulebookDescription, type LoadedRulebook } from "./records";

export interface FreshCompetitionJob {
	previous: { name: string; bytes: Uint8Array };
	club: LoadedRulebook;
	rows: readonly RecChange[];
	penalties: LoadedPenalties;
	event: EventInfo;
	year: number;
}

export type CompetitionSaveOutcome =
	{ ok: true; path: string | null; ageGroups: number; hasLogo: boolean } | { ok: false; message: string };

const BYTES_PER_MB = 1024 * 1024;
const MAX_COMPETITION_MB = 50;
/** Wettkampfdateien mit Logo dürfen so groß sein wie eine Projektdatei. */
export const MAX_COMPETITION_BYTES = MAX_COMPETITION_MB * BYTES_PER_MB;

const COMPETITION_FILTERS = [{ name: "JAuswertung-Wettkampf", extensions: ["wk"] }];
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const SAVE_FAILED = "Die Wettkampfdatei konnte nicht gespeichert werden.";

export const freshCompetitionFileName = (year: number): string => `Wellenwettkampf ${year}.wk`;

/** „TT.MM.JJJJ“ wie JAuswertung; leer, wenn kein Datum eingetragen ist. */
export function competitionDate(iso: string): string {
	const match = ISO_DATE.exec(iso.trim());
	return match ? `${match[3]}.${match[2]}.${match[1]}` : "";
}

/** Name wie auf Urkunden und Aushang: „39. Wellenwettkampf“, ohne Nummer nur der Titel. */
export function competitionName(event: Pick<EventInfo, "number" | "title">): string {
	const number = event.number.trim();
	const title = event.title.trim();
	return number ? `${number}. ${title}` : title;
}

export function competitionProperties(event: EventInfo, year: number): CompetitionProperties {
	return { name: competitionName(event), date: competitionDate(event.date), year, host: event.host.trim() };
}

/** Baut die Datei, kontrolliert sie und fragt dann nach dem Speicherort; bei Abbruch path null. */
export async function saveFreshCompetition(
	job: FreshCompetitionJob,
	now: Date = new Date()
): Promise<CompetitionSaveOutcome> {
	const rulebook = writeRulebookRecords(job.club.bytes, toRecUpdates(job.rows), newRulebookDescription(job.year));
	const outcome = buildFreshCompetition({
		previous: job.previous.bytes,
		rulebook,
		catalog: job.penalties.catalog,
		properties: competitionProperties(job.event, job.year),
		now
	});
	if (!outcome.ok) return outcome;
	try {
		const defaultName = freshCompetitionFileName(job.year);
		const path = await saveFile({ defaultName, filters: COMPETITION_FILTERS, bytes: outcome.bytes });
		return { ok: true, path, ageGroups: outcome.ageGroups, hasLogo: outcome.hasLogo };
	} catch (error) {
		return { ok: false, message: userMessage(error, SAVE_FAILED) };
	}
}
