// Zuordnung des Vereins-Regelwerks zum offiziellen DLRG-Regelwerk für die Rec-Werte.
import type { RulebookRecord } from "./rulebookRecords";

export interface RecMapping {
	/** Vereins-AK → AK im offiziellen Regelwerk. */
	ageGroups: Record<string, string>;
	/** Disziplinname im Verein → Name im offiziellen Regelwerk. */
	disciplineAliases: Record<string, string>;
}

/*
 * Ermittelt durch Abgleich von „Regelwerk_2025.rwm“ (Wellen-Wk 2025) mit „DLRG 2024/2025/2026.rwm“:
 * - Alle Rettungswerte bis AK offen stimmen mit „DLRG 2025.rwm“ überein (das Regelwerk des
 *   Wettkampfjahrs trägt die Rec-Werte des Vorjahrs).
 * - AK 10 nutzt die Werte der AK 12; „4*25m RLB“ heißt offiziell „4*25m Rückenlage ohne Armtätigkeit“.
 * - AK Senioren passt zu keiner offiziellen AK (Werte teils aus AK 100, teils AK 140, teils ohne
 *   Treffer) und bleibt daher ohne Zuordnung; die Wellendisziplinen sind vereinseigen.
 */
export const DEFAULT_REC_MAPPING: RecMapping = {
	ageGroups: {
		"AK 10": "AK 12",
		"AK 12": "AK 12",
		"AK 13/14": "AK 13/14",
		"AK 15/16": "AK 15/16",
		"AK 17/18": "AK 17/18",
		"AK offen": "AK Offen"
	},
	disciplineAliases: {
		"4*25m RLB": "4*25m Rückenlage ohne Armtätigkeit"
	}
};

function isStringRecord(input: unknown): input is Record<string, string> {
	return (
		typeof input === "object" &&
		input !== null &&
		!Array.isArray(input) &&
		Object.values(input).every((value) => typeof value === "string")
	);
}

/** Gespeicherte Zuordnung prüfen; null bei ungültigem Inhalt. */
export function parseRecMapping(input: unknown): RecMapping | null {
	if (typeof input !== "object" || input === null) return null;
	const { ageGroups, disciplineAliases } = input as Partial<RecMapping>;
	if (!isStringRecord(ageGroups) || !isStringRecord(disciplineAliases)) return null;
	return { ageGroups: { ...ageGroups }, disciplineAliases: { ...disciplineAliases } };
}

const WAVE_MARKER = /welle/i;

/** Wellendisziplinen sind vereinseigen und haben kein offizielles Gegenstück. */
export const isWaveDiscipline = (name: string): boolean => WAVE_MARKER.test(name);

/** Rec-Werte der Rettungsdisziplinen, die aus dem offiziellen Regelwerk kommen. */
export const rescueRecords = (records: readonly RulebookRecord[]): RulebookRecord[] =>
	records.filter((record) => !isWaveDiscipline(record.discipline));

/** Eindeutige Altersklassen- oder Disziplinnamen in Reihenfolge des Regelwerks. */
export function distinctNames(records: readonly RulebookRecord[], field: "ageGroup" | "discipline"): string[] {
	return [...new Set(records.map((record) => record[field]))];
}

function withEntry(entries: Record<string, string>, key: string, value: string | null): Record<string, string> {
	const next = { ...entries };
	if (value === null) delete next[key];
	else next[key] = value;
	return next;
}

/** null entfernt die Zuordnung. */
export function setAgeGroupMapping(
	mapping: RecMapping,
	clubAgeGroup: string,
	officialAgeGroup: string | null
): RecMapping {
	return { ...mapping, ageGroups: withEntry(mapping.ageGroups, clubAgeGroup, officialAgeGroup) };
}

/** null entfernt den Alias. */
export function setDisciplineAlias(mapping: RecMapping, clubName: string, officialName: string | null): RecMapping {
	return { ...mapping, disciplineAliases: withEntry(mapping.disciplineAliases, clubName, officialName) };
}
