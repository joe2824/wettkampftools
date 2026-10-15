// Vorschlag neuer Rec-Werte: Rettung aus dem offiziellen Regelwerk, Welle aus der Vorjahres-Bestzeit.
import { formatRecTime, formatSeconds } from "$lib/format/time";
import type { BestTimes } from "./bestTimes";
import { isWaveDiscipline, type RecMapping } from "./mapping";
import { recKey, type RecTarget, type RecUpdate, type RulebookRecord } from "./rulebookRecords";

export type RecSource = "official" | "bestTime" | "unchanged";

export interface RecProposalRow extends Omit<RulebookRecord, "rec"> {
	oldRec: number;
	newRec: number;
	source: RecSource;
	/** Herkunft oder Grund, warum der alte Wert bleibt. */
	note: string | null;
}

export interface RecProposalInput {
	club: readonly RulebookRecord[];
	official: readonly RulebookRecord[] | null;
	/** Name des offiziellen Regelwerks für die Herkunft, z. B. „DLRG 2026“. */
	officialName: string | null;
	bestTimes: BestTimes | null;
	mapping: RecMapping;
	/** Zuschlag auf die Bestzeit in Sekunden. */
	waveSurchargeS?: number;
}

export const DEFAULT_WAVE_SURCHARGE_S = 5;
const HUNDREDTHS_PER_SECOND = 100;
const OFFICIAL_FALLBACK_NAME = "Offizielles Regelwerk";
const NOTE_SEPARATOR = " · ";

const normalize = (text: string): string => text.trim().toLowerCase();

type Outcome = Pick<RecProposalRow, "newRec" | "source" | "note">;

const unchanged = (record: RulebookRecord, note: string): Outcome => ({
	newRec: record.rec,
	source: "unchanged",
	note
});

function officialAgeGroup(
	ageGroup: string,
	official: readonly RulebookRecord[],
	mapping: RecMapping
): string | undefined {
	const target = normalize(mapping.ageGroups[ageGroup] ?? ageGroup);
	return official.find((entry) => normalize(entry.ageGroup) === target)?.ageGroup;
}

interface OfficialSource {
	records: readonly RulebookRecord[] | null;
	name: string | null;
}

function officialNote(source: OfficialSource, ageGroup: string, alias: string | undefined): string {
	const parts = [source.name ?? OFFICIAL_FALLBACK_NAME, ageGroup];
	if (alias !== undefined) parts.push(`als „${alias}“`);
	return parts.join(NOTE_SEPARATOR);
}

function officialOutcome(record: RulebookRecord, source: OfficialSource, mapping: RecMapping): Outcome {
	const official = source.records;
	if (official === null) return unchanged(record, "Kein offizielles Regelwerk geladen.");
	const ageGroup = officialAgeGroup(record.ageGroup, official, mapping);
	if (!ageGroup) return unchanged(record, "Keine Zuordnung zu einer offiziellen Altersklasse.");
	const alias = mapping.disciplineAliases[record.discipline];
	const discipline = normalize(alias ?? record.discipline);
	const match = official.find(
		(entry) =>
			entry.ageGroup === ageGroup && entry.gender === record.gender && normalize(entry.discipline) === discipline
	);
	if (!match) return unchanged(record, `„${record.discipline}“ fehlt in ${ageGroup}.`);
	const usedAlias = alias === undefined ? undefined : match.discipline;
	return { newRec: match.rec, source: "official", note: officialNote(source, ageGroup, usedAlias) };
}

function waveOutcome(record: RulebookRecord, bestTimes: BestTimes | null, surchargeS: number): Outcome {
	const key = recKey({ ...record, ageGroup: normalize(record.ageGroup) });
	const best = bestTimes?.entries.find((entry) => recKey({ ...entry, ageGroup: normalize(entry.ageGroup) }) === key);
	if (!bestTimes || !best) return unchanged(record, "Keine Bestzeit aus dem Vorjahr.");
	const surcharge = Math.round(surchargeS * HUNDREDTHS_PER_SECOND);
	const note = `Bestzeit ${bestTimes.year}: ${formatRecTime(best.time)} + ${formatSeconds(surcharge)}`;
	return { newRec: best.time + surcharge, source: "bestTime", note };
}

export function buildRecProposal(input: RecProposalInput): RecProposalRow[] {
	const { club, official, officialName, bestTimes, mapping, waveSurchargeS = DEFAULT_WAVE_SURCHARGE_S } = input;
	const source: OfficialSource = { records: official, name: officialName };
	return club.map((record) => {
		const { rec, ...target } = record;
		const outcome = isWaveDiscipline(record.discipline)
			? waveOutcome(record, bestTimes, waveSurchargeS)
			: officialOutcome(record, source, mapping);
		return { ...target, oldRec: rec, ...outcome };
	});
}

export interface EditedRecRow extends RecProposalRow {
	/** Wert wurde von Hand geändert. */
	edited: boolean;
}

/** Eigene Werte (Schlüssel aus recKey) über den Vorschlag legen. */
export function applyRecOverrides(
	rows: readonly RecProposalRow[],
	overrides: ReadonlyMap<string, number>
): EditedRecRow[] {
	return rows.map((row) => {
		const override = overrides.get(recKey(row));
		return override === undefined ? { ...row, edited: false } : { ...row, newRec: override, edited: true };
	});
}

export interface RecChange extends RecTarget {
	oldRec: number;
	newRec: number;
}

/** Nur die geänderten Werte, zum Schreiben ins Regelwerk. */
export function toRecUpdates(rows: readonly RecChange[]): RecUpdate[] {
	return rows
		.filter((row) => row.newRec !== row.oldRec)
		.map(({ ageGroup, gender, disciplineIndex, newRec }) => ({ ageGroup, gender, disciplineIndex, rec: newRec }));
}

/** Neu minus alt in Hundertsteln; positiv heißt langsamer. */
export const difference = (row: Pick<RecChange, "oldRec" | "newRec">): number => row.newRec - row.oldRec;

export interface ProposalSummary {
	changed: number;
	unchanged: number;
	noSource: number;
	edited: number;
}

type SummaryRow = Pick<RecProposalRow, "oldRec" | "newRec" | "source"> & { edited?: boolean };

function summaryCategory(row: SummaryRow): keyof ProposalSummary {
	if (row.edited) return "edited";
	if (row.source === "unchanged") return "noSource";
	return difference(row) === 0 ? "unchanged" : "changed";
}

/** Jede Zeile zählt genau einmal; eigene Werte gehen vor. */
export function summarizeProposal(rows: readonly SummaryRow[]): ProposalSummary {
	const summary: ProposalSummary = { changed: 0, unchanged: 0, noSource: 0, edited: 0 };
	for (const row of rows) summary[summaryCategory(row)] += 1;
	return summary;
}

/** „9 geändert · 27 unverändert · 3 ohne Quelle · 1 eigener Wert“; leere Zusatzgruppen entfallen. */
export function formatProposalSummary({ changed, unchanged, noSource, edited }: ProposalSummary): string {
	const parts = [`${changed} geändert`, `${unchanged} unverändert`];
	if (noSource > 0) parts.push(`${noSource} ohne Quelle`);
	if (edited > 0) parts.push(`${edited} ${edited === 1 ? "eigener Wert" : "eigene Werte"}`);
	return parts.join(NOTE_SEPARATOR);
}

/** Rettung vor Welle, sonst Reihenfolge des Regelwerks; auf Wunsch nur geänderte Werte. */
export function displayRows<T extends RecProposalRow>(rows: readonly T[], onlyChanges: boolean): T[] {
	const visible = onlyChanges ? rows.filter((row) => difference(row) !== 0) : [...rows];
	return [
		...visible.filter((row) => !isWaveDiscipline(row.discipline)),
		...visible.filter((row) => isWaveDiscipline(row.discipline))
	];
}
