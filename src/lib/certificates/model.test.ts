import { describe, expect, it } from "vitest";
import { defaultSettings, type EventInfo } from "$lib/settings/settings";
import { buildAgeGroupOrder } from "$lib/wwk/ageGroups";
import type { ResultRow } from "$lib/wwk/results";
import {
	buildCertificatePages,
	countPages,
	eligibleEntries,
	filterEntries,
	placeholderValues,
	type CertificateEntry,
	type PageOptions
} from "./model";

const ORDER = buildAgeGroupOrder(defaultSettings());
let nextRow = 2;

function row(overrides: Partial<ResultRow>): ResultRow {
	return {
		sourceRow: nextRow++,
		place: 1,
		name: "Musterstadt 1",
		organisation: "Musterstadt",
		ageGroupRaw: "AK 12",
		gender: "weiblich",
		competitionPoints: 1234.5,
		members: [],
		...overrides
	};
}

const EVENT: EventInfo = {
	number: "12",
	title: "Wellenwettkampf",
	host: "DLRG Beispielhausen",
	date: "2026-11-14",
	venue: "Hallenbad Musterstadt",
	signers: [
		{ name: "Anna Meier", role: "Vorsitzende" },
		{ name: "Max Mustermann", role: "Wettkampforganisation" }
	]
};

const TEAM_OPTIONS: PageOptions = {
	competition: "team",
	withMemberNames: false,
	copiesPerTeam: 5,
	copiesPerIndividual: 1
};

function names(entries: readonly CertificateEntry[]): string[] {
	return entries.map((entry) => entry.row.name);
}

describe("eligibleEntries", () => {
	it("behält Wellen-AK nach geänderten Einstellungen", () => {
		// Start-AK nach der Vorbereitung hochgesetzt, Senioren vereinfacht.
		const settings = { ...defaultSettings(), waveStartAgeGroup: "AK Offen", simplifySeniorAgeGroups: true };
		const order = buildAgeGroupOrder(settings);
		const rows = [
			row({ name: "Senioren", ageGroupRaw: "AkW Senioren" }),
			row({ name: "Welle", ageGroupRaw: "AkW 13/14" }),
			row({ name: "Rettung", ageGroupRaw: "AK 13/14" })
		];
		const entries = eligibleEntries(rows, order);
		expect(entries.map((entry) => [entry.row.name, entry.kind])).toEqual([
			["Rettung", "rescue"],
			["Welle", "wave"],
			["Senioren", "wave"]
		]);
	});

	it("schließt Einträge ohne Platz und mit unbekannter AK aus", () => {
		const rows = [
			row({ name: "A" }),
			row({ name: "B", place: null }),
			row({ name: "C", ageGroupRaw: "AK 99" }),
			row({ name: "D", ageGroupRaw: "AK offen" })
		];
		const entries = eligibleEntries(rows, ORDER);
		expect(names(entries)).toEqual(["A", "D"]);
		expect(entries[1].ageGroup).toBe("AK Offen");
	});

	it("übernimmt Kennung, Wertung und Platz", () => {
		const source = row({ ageGroupRaw: "akw 13/14", place: 3 });
		const [entry] = eligibleEntries([source], ORDER);
		expect(entry).toEqual({
			id: `row${source.sourceRow}`,
			row: source,
			ageGroup: "AkW 13/14",
			kind: "wave",
			gender: "weiblich",
			place: 3
		});
		expect(eligibleEntries([row({})], ORDER)[0].kind).toBe("rescue");
	});

	it("sortiert nach AK-Reihenfolge, weiblich vor männlich, Platz absteigend, dann Name", () => {
		const rows = [
			row({ name: "M1", ageGroupRaw: "AK 10", gender: "männlich", place: 1 }),
			row({ name: "W1", ageGroupRaw: "AK 10", gender: "weiblich", place: 1 }),
			row({ name: "W10", ageGroupRaw: "AK 10", gender: "weiblich", place: 10 }),
			row({ name: "W2b", ageGroupRaw: "AK 10", gender: "weiblich", place: 2 }),
			row({ name: "W2a", ageGroupRaw: "AK 10", gender: "weiblich", place: 2 }),
			row({ name: "W9", ageGroupRaw: "AK 10", gender: "weiblich", place: 9 }),
			row({ name: "Welle", ageGroupRaw: "AkW 13/14", gender: "weiblich", place: 1 }),
			row({ name: "Zwölf", ageGroupRaw: "AK 12", gender: "männlich", place: 1 })
		];
		expect(names(eligibleEntries(rows, ORDER))).toEqual(["W10", "W9", "W2a", "W2b", "W1", "M1", "Zwölf", "Welle"]);
	});
});

describe("filterEntries", () => {
	const entries = eligibleEntries(
		[
			row({ name: "A10w", ageGroupRaw: "AK 10" }),
			row({ name: "A12m", ageGroupRaw: "AK 12", gender: "männlich" }),
			row({ name: "A13w", ageGroupRaw: "AK 13/14" }),
			row({ name: "W13w", ageGroupRaw: "AkW 13/14" })
		],
		ORDER
	);

	it("ohne Filter bleiben alle Einträge", () => {
		expect(filterEntries(entries, {})).toEqual(entries);
		expect(filterEntries(entries, { ageGroups: [], genders: [], kinds: [] })).toEqual(entries);
	});

	it("filtert nach Altersklassen, z. B. nur AK 10 und AK 12", () => {
		expect(names(filterEntries(entries, { ageGroups: ["AK 10", "AK 12"] }))).toEqual(["A10w", "A12m"]);
	});

	it("filtert nach Wertung und Geschlecht", () => {
		expect(names(filterEntries(entries, { kinds: ["wave"] }))).toEqual(["W13w"]);
		expect(names(filterEntries(entries, { genders: ["männlich"] }))).toEqual(["A12m"]);
	});

	it("filtert nach ausgewählten Einträgen", () => {
		const selectedIds = new Set([entries[0].id, entries[3].id]);
		expect(names(filterEntries(entries, { selectedIds }))).toEqual(["A10w", "W13w"]);
		expect(filterEntries(entries, { selectedIds: new Set() })).toEqual([]);
	});
});

describe("placeholderValues", () => {
	it("füllt alle Platzhalter aus Eintrag und Veranstaltung", () => {
		const [entry] = eligibleEntries(
			[
				row({
					name: "Musterstadt 2",
					organisation: "Musterstadt",
					ageGroupRaw: "AkW 13/14",
					gender: "männlich",
					competitionPoints: 987.654,
					place: 4
				})
			],
			ORDER
		);
		expect(placeholderValues(entry, EVENT, "Anna Meier")).toEqual({
			name: "Musterstadt 2",
			mitglied: "Anna Meier",
			gliederung: "Musterstadt",
			wertung: "Wellenwertung",
			altersklasse: "AK 13/14",
			geschlecht: "männlich",
			wettkampfpunkte: "987,65",
			platz: "4",
			nr: "12",
			titel: "Wellenwettkampf",
			ausrichter: "DLRG Beispielhausen",
			datum: "14. November 2026",
			ort: "Hallenbad Musterstadt",
			unterzeichner1: "Anna Meier",
			funktion1: "Vorsitzende",
			unterzeichner2: "Max Mustermann",
			funktion2: "Wettkampforganisation"
		});
	});

	it("Rettungswertung und leere Punkte", () => {
		const [entry] = eligibleEntries([row({ competitionPoints: null })], ORDER);
		const values = placeholderValues(entry, EVENT, "");
		expect(values.wertung).toBe("Rettungswertung");
		expect(values.wettkampfpunkte).toBe("");
		expect(values.altersklasse).toBe("AK 12");
	});
});

describe("buildCertificatePages", () => {
	const team = eligibleEntries(
		[
			row({ name: "T1", place: 1, members: ["Anna Meier", "Max Mustermann"] }),
			row({ name: "T2", place: 2, members: ["M1", "M2", "M3", "M4", "M5", "M6"] })
		],
		ORDER
	);

	it("erzeugt 5 Urkunden je Mannschaft direkt hintereinander", () => {
		const { pages, namesShortfall } = buildCertificatePages(team, TEAM_OPTIONS, EVENT);
		expect(pages.map((page) => `${page.values.name}#${page.copyIndex}`)).toEqual([
			"T2#0",
			"T2#1",
			"T2#2",
			"T2#3",
			"T2#4",
			"T1#0",
			"T1#1",
			"T1#2",
			"T1#3",
			"T1#4"
		]);
		expect(pages[0].entryId).toBe(team[0].id);
		expect(pages.every((page) => page.values.mitglied === "")).toBe(true);
		expect(namesShortfall).toBe(0);
	});

	it("verwendet die eingestellte Anzahl, z. B. 3", () => {
		const options = { ...TEAM_OPTIONS, copiesPerTeam: 3 };
		expect(buildCertificatePages(team, options, EVENT).pages).toHaveLength(6);
		expect(countPages(team, options)).toBe(6);
	});

	it("ordnet Mitgliedernamen den Urkunden zu und meldet fehlende", () => {
		const options = { ...TEAM_OPTIONS, withMemberNames: true };
		const { pages, namesShortfall } = buildCertificatePages(team, options, EVENT);
		expect(pages.slice(0, 5).map((page) => page.values.mitglied)).toEqual(["M1", "M2", "M3", "M4", "M5"]);
		expect(pages.slice(5).map((page) => page.values.mitglied)).toEqual(["Anna Meier", "Max Mustermann", "", "", ""]);
		expect(namesShortfall).toBe(1);
	});

	it("Einzelwettkampf: 1 Urkunde je Person, nie Mitgliedernamen", () => {
		const options: PageOptions = { ...TEAM_OPTIONS, competition: "individual", withMemberNames: true };
		const { pages, namesShortfall } = buildCertificatePages(team, options, EVENT);
		expect(pages).toHaveLength(2);
		expect(pages.map((page) => page.values.mitglied)).toEqual(["", ""]);
		expect(namesShortfall).toBe(0);
		expect(countPages(team, options)).toBe(2);
	});
});
