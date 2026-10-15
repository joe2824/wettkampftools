// Urkunden-Warteschlange: auswählbare Einträge, Reihenfolge und Seiten mit Platzhalterwerten.
import { formatGermanDate } from "$lib/format/date";
import { formatCompetitionPoints } from "$lib/format/points";
import type { EventInfo } from "$lib/settings/settings";
import { classifyAgeGroup, displayAgeGroup, type AgeGroupKind } from "$lib/wwk/ageGroups";
import { placedEntries, type PlacedEntry } from "$lib/wwk/certificateOrder";
import type { CompetitionKind, ResultRow } from "$lib/wwk/results";
import type { PlaceholderValues } from "./layoutTemplate";

export interface CertificateEntry {
	id: string;
	row: ResultRow;
	/** Konfigurierte Schreibweise der Altersklasse. */
	ageGroup: string;
	kind: AgeGroupKind;
	gender: string;
	place: number;
}

export interface EntryFilter {
	ageGroups?: string[];
	genders?: string[];
	kinds?: AgeGroupKind[];
	selectedIds?: ReadonlySet<string>;
}

export interface CertificatePage {
	entryId: string;
	copyIndex: number;
	values: PlaceholderValues;
}

export interface PageOptions {
	competition: CompetitionKind;
	withMemberNames: boolean;
	copiesPerTeam: number;
	copiesPerIndividual: number;
}

export interface CertificatePages {
	pages: CertificatePage[];
	/** Einträge, bei denen nicht jedes Mitglied eine namentliche Urkunde erhält. */
	namesShortfall: number;
}

const KIND_LABELS: Record<AgeGroupKind, string> = {
	rescue: "Rettungswertung",
	wave: "Wellenwertung"
};

function toEntry(entry: PlacedEntry, order: readonly string[]): CertificateEntry | null {
	const kind = classifyAgeGroup(entry.ageGroup, order);
	if (kind === null) return null;
	const { row, ageGroup, place } = entry;
	return { id: `row${row.sourceRow}`, row, ageGroup, kind, gender: row.gender, place };
}

/** Platzierte Einträge mit Rettungs- oder Wellenwertung in Urkunden-Reihenfolge. */
export function eligibleEntries(rows: readonly ResultRow[], order: readonly string[]): CertificateEntry[] {
	return placedEntries(rows, order)
		.map((entry) => toEntry(entry, order))
		.filter((entry): entry is CertificateEntry => entry !== null);
}

/** Leere oder fehlende Liste bedeutet „alle“. */
function allows<T>(values: readonly T[] | undefined, value: T): boolean {
	return values === undefined || values.length === 0 || values.includes(value);
}

export function filterEntries(entries: readonly CertificateEntry[], filter: EntryFilter): CertificateEntry[] {
	return entries.filter(
		(entry) =>
			allows(filter.ageGroups, entry.ageGroup) &&
			allows(filter.genders, entry.gender) &&
			allows(filter.kinds, entry.kind) &&
			(filter.selectedIds === undefined || filter.selectedIds.has(entry.id))
	);
}

export function placeholderValues(
	entry: CertificateEntry,
	event: EventInfo,
	memberName: string
): PlaceholderValues {
	const [first, second] = event.signers;
	return {
		name: entry.row.name,
		mitglied: memberName,
		gliederung: entry.row.organisation,
		wertung: KIND_LABELS[entry.kind],
		altersklasse: displayAgeGroup(entry.ageGroup),
		geschlecht: entry.row.gender,
		wettkampfpunkte: formatCompetitionPoints(entry.row.competitionPoints),
		platz: String(entry.place),
		nr: event.number,
		titel: event.title,
		ausrichter: event.host,
		datum: formatGermanDate(event.date),
		ort: event.venue,
		unterzeichner1: first.name,
		funktion1: first.role,
		unterzeichner2: second.name,
		funktion2: second.role
	};
}

function copiesPerEntry(options: PageOptions): number {
	return options.competition === "team" ? options.copiesPerTeam : options.copiesPerIndividual;
}

function usesMemberNames(options: PageOptions): boolean {
	return options.competition === "team" && options.withMemberNames;
}

export function countPages(entries: readonly CertificateEntry[], options: PageOptions): number {
	return entries.length * copiesPerEntry(options);
}

export function buildCertificatePages(
	entries: readonly CertificateEntry[],
	options: PageOptions,
	event: EventInfo
): CertificatePages {
	const copies = copiesPerEntry(options);
	const withNames = usesMemberNames(options);
	const pages: CertificatePage[] = [];
	let namesShortfall = 0;
	for (const entry of entries) {
		if (withNames && entry.row.members.length > copies) namesShortfall++;
		for (let copyIndex = 0; copyIndex < copies; copyIndex++) {
			const memberName = withNames ? (entry.row.members[copyIndex] ?? "") : "";
			pages.push({ entryId: entry.id, copyIndex, values: placeholderValues(entry, event, memberName) });
		}
	}
	return { pages, namesShortfall };
}
