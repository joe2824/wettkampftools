// Vorschlag neuer Rec-Werte: Rettung aus dem offiziellen Regelwerk, Welle aus dem Rekord aller Jahre.
// Offizielle Werte gelten sofort; ein Wellen-Rekord zählt nur, wenn er schneller ist, und wird erst
// auf Wunsch übernommen.
import { formatRecTime } from "$lib/format/time";
import { isWaveDiscipline, type RecMapping } from "./mapping";
import { recKey, type RecTarget, type RecUpdate, type RulebookRecord } from "./rulebookRecords";
import { findRecord, type WaveRecord } from "./waveRecords";

export type RecSource = "official" | "bestTime" | "none";

export interface RecProposalRow extends Omit<RulebookRecord, "rec"> {
	oldRec: number;
	/** Wert aus der Quelle; null ohne Quelle. */
	proposedRec: number | null;
	source: RecSource;
	/** Herkunft oder Grund, warum keine Quelle gefunden wurde. */
	note: string | null;
}

export interface RecProposalInput {
	club: readonly RulebookRecord[];
	official: readonly RulebookRecord[] | null;
	/** Name des offiziellen Regelwerks für die Herkunft, z. B. „DLRG 2026“. */
	officialName: string | null;
	/** Rekorde der Wellendisziplinen über alle Jahre. */
	records: readonly WaveRecord[];
	mapping: RecMapping;
}

const OFFICIAL_FALLBACK_NAME = "Offizielles Regelwerk";
const NOTE_SEPARATOR = " · ";

const normalize = (text: string): string => text.trim().toLowerCase();

type Outcome = Pick<RecProposalRow, "proposedRec" | "source" | "note">;

const noSource = (note: string): Outcome => ({ proposedRec: null, source: "none", note });

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
	if (official === null) return noSource("Kein offizielles Regelwerk geladen.");
	const ageGroup = officialAgeGroup(record.ageGroup, official, mapping);
	if (!ageGroup) return noSource("Keine Zuordnung zu einer offiziellen Altersklasse.");
	const alias = mapping.disciplineAliases[record.discipline];
	const discipline = normalize(alias ?? record.discipline);
	const match = official.find(
		(entry) =>
			entry.ageGroup === ageGroup && entry.gender === record.gender && normalize(entry.discipline) === discipline
	);
	if (!match) return noSource(`„${record.discipline}“ fehlt in ${ageGroup}.`);
	const usedAlias = alias === undefined ? undefined : match.discipline;
	return { proposedRec: match.rec, source: "official", note: officialNote(source, ageGroup, usedAlias) };
}

function waveOutcome(record: RulebookRecord, records: readonly WaveRecord[]): Outcome {
	const best = findRecord(records, record);
	if (!best) return noSource("Kein Rekord in der Welle bekannt.");
	return { proposedRec: best.time, source: "bestTime", note: `Rekord ${best.year}: ${formatRecTime(best.time)}` };
}

export function buildRecProposal(input: RecProposalInput): RecProposalRow[] {
	const { club, official, officialName, records, mapping } = input;
	const source: OfficialSource = { records: official, name: officialName };
	return club.map((record) => {
		const { rec, ...target } = record;
		const outcome = isWaveDiscipline(record.discipline)
			? waveOutcome(record, records)
			: officialOutcome(record, source, mapping);
		return { ...target, oldRec: rec, ...outcome };
	});
}

/**
 * Stand einer Zeile:
 * - adopted: neuer Wert aus der Quelle gilt
 * - unchanged: die Quelle nennt den bisherigen Wert
 * - record: schnellerer Wellen-Rekord wartet auf die Übernahme
 * - noRecord: der Wellen-Rekord ist langsamer, der alte Wert bleibt
 * - missing: keine Quelle, der Wert muss selbst geprüft werden
 * - edited: von Hand eingetragen
 */
export type RecStatus = "adopted" | "unchanged" | "record" | "noRecord" | "missing" | "edited";

export interface ResolvedRecRow extends RecProposalRow {
	newRec: number;
	status: RecStatus;
}

export interface RecDecisions {
	/** Schlüssel (recKey) der übernommenen Wellen-Rekorde. */
	accepted: ReadonlySet<string>;
	/** Eigene Werte je Schlüssel (recKey). */
	overrides: ReadonlyMap<string, number>;
}

export const EMPTY_DECISIONS: RecDecisions = { accepted: new Set(), overrides: new Map() };

/** Nur eine schnellere Zeit ist ein neuer Rekord. */
const isRecord = (row: RecProposalRow): boolean => row.proposedRec !== null && row.proposedRec < row.oldRec;

function resolveRow(row: RecProposalRow, decisions: RecDecisions): ResolvedRecRow {
	const key = recKey(row);
	const override = decisions.overrides.get(key);
	if (override !== undefined) return { ...row, newRec: override, status: "edited" };
	if (row.proposedRec === null) return { ...row, newRec: row.oldRec, status: "missing" };
	if (row.proposedRec === row.oldRec) return { ...row, newRec: row.oldRec, status: "unchanged" };
	if (row.source === "official") return { ...row, newRec: row.proposedRec, status: "adopted" };
	if (!isRecord(row)) return { ...row, newRec: row.oldRec, status: "noRecord" };
	return decisions.accepted.has(key)
		? { ...row, newRec: row.proposedRec, status: "adopted" }
		: { ...row, newRec: row.oldRec, status: "record" };
}

/** Eigene Werte und übernommene Rekorde über den Vorschlag legen. */
export function resolveRecRows(rows: readonly RecProposalRow[], decisions: RecDecisions): ResolvedRecRow[] {
	return rows.map((row) => resolveRow(row, decisions));
}

/** Schlüssel aller Wellen-Rekorde, die noch nicht übernommen sind. */
export const pendingRecordKeys = (rows: readonly ResolvedRecRow[]): string[] =>
	rows.filter((row) => row.status === "record").map(recKey);

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

export type ProposalSummary = Record<RecStatus, number>;

export function summarizeProposal(rows: readonly Pick<ResolvedRecRow, "status">[]): ProposalSummary {
	const summary: ProposalSummary = { adopted: 0, unchanged: 0, record: 0, noRecord: 0, missing: 0, edited: 0 };
	for (const row of rows) summary[row.status] += 1;
	return summary;
}

/** Zeilen, bei denen noch etwas zu tun ist: Rekord übernehmen oder Wert selbst prüfen. */
export const openCount = (summary: ProposalSummary): number => summary.record + summary.missing;

const plural = (count: number, one: string, many: string): string => `${count} ${count === 1 ? one : many}`;

/** „9 übernommen · 27 unverändert · 2 Rekorde zum Übernehmen · 3 ohne Quelle · 1 eigener Wert“; leere Zusatzgruppen entfallen. */
export function formatProposalSummary(summary: ProposalSummary): string {
	const parts = [`${summary.adopted} übernommen`, `${summary.unchanged} unverändert`];
	if (summary.record > 0) parts.push(plural(summary.record, "Rekord zum Übernehmen", "Rekorde zum Übernehmen"));
	if (summary.noRecord > 0) parts.push(plural(summary.noRecord, "Rekord langsamer", "Rekorde langsamer"));
	if (summary.missing > 0) parts.push(`${summary.missing} ohne Quelle`);
	if (summary.edited > 0) parts.push(plural(summary.edited, "eigener Wert", "eigene Werte"));
	return parts.join(NOTE_SEPARATOR);
}

const SETTLED: readonly RecStatus[] = ["unchanged", "noRecord"];

/** Rettung vor Welle, sonst Reihenfolge des Regelwerks; auf Wunsch ohne Zeilen, bei denen der alte Wert bleibt. */
export function displayRows<T extends ResolvedRecRow>(rows: readonly T[], hideSettled: boolean): T[] {
	const visible = hideSettled ? rows.filter((row) => !SETTLED.includes(row.status)) : [...rows];
	return [
		...visible.filter((row) => !isWaveDiscipline(row.discipline)),
		...visible.filter((row) => isWaveDiscipline(row.discipline))
	];
}
