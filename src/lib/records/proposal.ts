// Vorschlag neuer Rec-Werte: Rettung aus dem offiziellen Regelwerk, Welle aus der Vorjahres-Bestzeit.
import { formatRecTime } from "$lib/format/time";
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
	bestTimes: BestTimes | null;
	mapping: RecMapping;
	/** Zuschlag auf die Bestzeit in Sekunden. */
	waveSurchargeS?: number;
}

export const DEFAULT_WAVE_SURCHARGE_S = 5;
const HUNDREDTHS_PER_SECOND = 100;

const normalize = (text: string): string => text.trim().toLowerCase();

type Outcome = Pick<RecProposalRow, "newRec" | "source" | "note">;

const unchanged = (record: RulebookRecord, note: string): Outcome => ({ newRec: record.rec, source: "unchanged", note });

function officialAgeGroup(ageGroup: string, official: readonly RulebookRecord[], mapping: RecMapping): string | undefined {
	const target = normalize(mapping.ageGroups[ageGroup] ?? ageGroup);
	return official.find((entry) => normalize(entry.ageGroup) === target)?.ageGroup;
}

function officialOutcome(record: RulebookRecord, official: readonly RulebookRecord[] | null, mapping: RecMapping): Outcome {
	if (official === null) return unchanged(record, "Kein offizielles Regelwerk geladen.");
	const ageGroup = officialAgeGroup(record.ageGroup, official, mapping);
	if (!ageGroup) return unchanged(record, "Keine Zuordnung zu einer offiziellen Altersklasse.");
	const discipline = normalize(mapping.disciplineAliases[record.discipline] ?? record.discipline);
	const match = official.find(
		(entry) => entry.ageGroup === ageGroup && entry.gender === record.gender && normalize(entry.discipline) === discipline
	);
	if (!match) return unchanged(record, `„${record.discipline}“ fehlt in ${ageGroup}.`);
	return { newRec: match.rec, source: "official", note: ageGroup };
}

function waveOutcome(record: RulebookRecord, bestTimes: BestTimes | null, surchargeS: number): Outcome {
	const key = recKey({ ...record, ageGroup: normalize(record.ageGroup) });
	const best = bestTimes?.entries.find((entry) => recKey({ ...entry, ageGroup: normalize(entry.ageGroup) }) === key);
	if (!bestTimes || !best) return unchanged(record, "Keine Bestzeit aus dem Vorjahr.");
	const newRec = best.time + Math.round(surchargeS * HUNDREDTHS_PER_SECOND);
	return { newRec, source: "bestTime", note: `Bestzeit ${bestTimes.year}: ${formatRecTime(best.time)}` };
}

export function buildRecProposal(input: RecProposalInput): RecProposalRow[] {
	const { club, official, bestTimes, mapping, waveSurchargeS = DEFAULT_WAVE_SURCHARGE_S } = input;
	return club.map((record) => {
		const { rec, ...target } = record;
		const outcome = isWaveDiscipline(record.discipline)
			? waveOutcome(record, bestTimes, waveSurchargeS)
			: officialOutcome(record, official, mapping);
		return { ...target, oldRec: rec, ...outcome };
	});
}

export interface EditedRecRow extends RecProposalRow {
	/** Wert wurde von Hand geändert. */
	edited: boolean;
}

/** Eigene Werte (Schlüssel aus recKey) über den Vorschlag legen. */
export function applyRecOverrides(rows: readonly RecProposalRow[], overrides: ReadonlyMap<string, number>): EditedRecRow[] {
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
