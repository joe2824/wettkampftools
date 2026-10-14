import { describe, expect, it } from "vitest";
import { eligibleEntries, type CertificateEntry } from "$lib/certificates/model";
import { defaultSettings } from "$lib/settings/settings";
import { buildAgeGroupOrder } from "$lib/wwk/ageGroups";
import type { ResultRow } from "$lib/wwk/results";
import {
	NO_HIDDEN,
	clampCopies,
	hiddenValuesFor,
	shownValues,
	filterOptions,
	groupEntries,
	groupState,
	selectedEntries,
	visibleEntries,
	withIds,
	type HiddenValues
} from "./certificateSelection";

function row(sourceRow: number, place: number, ageGroupRaw: string, gender = "weiblich"): ResultRow {
	return { sourceRow, place, name: `Team ${sourceRow}`, organisation: "Musterstadt", ageGroupRaw, gender, competitionPoints: 1, members: [] };
}

const ENTRIES: CertificateEntry[] = eligibleEntries(
	[
		row(1, 1, "AK 12"),
		row(2, 2, "AK 12"),
		row(3, 1, "AK 12", "männlich"),
		row(4, 1, "AK 10"),
		row(5, 1, "AkW 13/14"),
		row(6, 1, "AK 13/14")
	],
	buildAgeGroupOrder(defaultSettings())
);

const ids = (entries: readonly CertificateEntry[]) => entries.map((entry) => entry.id);
const hidden = (overrides: Partial<HiddenValues>): HiddenValues => ({ ...NO_HIDDEN, ...overrides });

describe("filterOptions", () => {
	it("nennt vorhandene Altersklassen in Anzeigeform und Reihenfolge, ohne Doppelte", () => {
		expect(filterOptions(ENTRIES)).toEqual({
			ageGroups: ["AK 10", "AK 12", "AK 13/14"],
			genders: ["weiblich", "männlich"],
			kinds: ["rescue", "wave"]
		});
	});
});

describe("visibleEntries", () => {
	it("zeigt ohne ausgeblendete Werte alles", () => {
		expect(visibleEntries(ENTRIES, NO_HIDDEN)).toHaveLength(ENTRIES.length);
	});

	it("blendet Altersklassen in Anzeigeform aus, auch die Welle", () => {
		const shown = visibleEntries(ENTRIES, hidden({ ageGroups: ["AK 13/14", "AK 10"] }));
		expect(ids(shown)).toEqual(["row2", "row1", "row3"]);
	});

	it("filtert nach Geschlecht und Wertung", () => {
		expect(ids(visibleEntries(ENTRIES, hidden({ genders: ["weiblich"] })))).toEqual(["row3"]);
		expect(ids(visibleEntries(ENTRIES, hidden({ kinds: ["rescue"] })))).toEqual(["row5"]);
	});
});

describe("groupEntries", () => {
	it("bildet Blöcke je Altersklasse, Wertung und Geschlecht in Urkunden-Reihenfolge", () => {
		const groups = groupEntries(ENTRIES);
		expect(groups.map((group) => group.label)).toEqual([
			"AK 10 weiblich",
			"AK 12 weiblich",
			"AK 12 männlich",
			"AK 13/14 weiblich",
			"AK 13/14 weiblich"
		]);
		expect(groups.map((group) => group.kind)).toEqual(["rescue", "rescue", "rescue", "rescue", "wave"]);
		expect(ids(groups[1].entries)).toEqual(["row2", "row1"]);
		expect(new Set(groups.map((group) => group.key)).size).toBe(groups.length);
	});
});

describe("Auswahl", () => {
	it("nimmt alle sichtbaren außer den abgewählten", () => {
		expect(ids(selectedEntries(ENTRIES, new Set(["row1", "row5"])))).toEqual(["row4", "row2", "row3", "row6"]);
	});

	it("beschreibt den Zustand einer Gruppe", () => {
		const group = groupEntries(ENTRIES)[1];
		expect(groupState(group.entries, new Set())).toBe("all");
		expect(groupState(group.entries, new Set(["row1"]))).toBe("some");
		expect(groupState(group.entries, new Set(["row1", "row2"]))).toBe("none");
	});

	it("wählt Einträge ab und wieder an, ohne die Vorlage zu ändern", () => {
		const before = new Set(["row9"]);
		const excluded = withIds(before, ["row1", "row2"], true);
		expect([...excluded].sort()).toEqual(["row1", "row2", "row9"]);
		expect([...withIds(excluded, ["row1"], false)].sort()).toEqual(["row2", "row9"]);
		expect([...before]).toEqual(["row9"]);
	});
});

describe("clampCopies", () => {
	it("hält die Anzahl zwischen 1 und 10 und rundet auf ganze Zahlen", () => {
		expect(clampCopies(0)).toBe(1);
		expect(clampCopies(12)).toBe(10);
		expect(clampCopies(3.6)).toBe(4);
		expect(clampCopies(Number.NaN)).toBe(1);
	});
});

describe("shownValues / hiddenValuesFor", () => {
	it("rechnet zwischen angezeigten und ausgeblendeten Werten um", () => {
		const all = ["AK 10", "AK 12", "AK 13/14"];
		expect(shownValues(all, ["AK 12"])).toEqual(["AK 10", "AK 13/14"]);
		expect(hiddenValuesFor(all, ["AK 10"])).toEqual(["AK 12", "AK 13/14"]);
	});
});
