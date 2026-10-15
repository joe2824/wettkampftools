import { describe, expect, it } from "vitest";
import { placedEntries } from "./certificateOrder";
import type { ResultRow } from "./results";

const ORDER = ["AK 10", "AK 12", "AkW 13/14"];

function row(overrides: Partial<ResultRow>): ResultRow {
	return {
		sourceRow: 1,
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

describe("placedEntries", () => {
	it("lässt Zeilen ohne Platz oder mit unbekannter AK weg und übernimmt die konfigurierte Schreibweise", () => {
		const source = row({ name: "A", ageGroupRaw: "akw 13/14", place: 3 });
		const entries = placedEntries([source, row({ place: null }), row({ ageGroupRaw: "AK 99" })], ORDER);
		expect(entries).toEqual([{ row: source, place: 3, ageGroup: "AkW 13/14" }]);
	});

	it("sortiert nach AK-Reihenfolge, weiblich zuerst, letzter Platz zuerst, dann Name", () => {
		const rows = [
			row({ name: "M1", ageGroupRaw: "AK 10", gender: "männlich", place: 1 }),
			row({ name: "W1", ageGroupRaw: "AK 10", place: 1 }),
			row({ name: "W2b", ageGroupRaw: "AK 10", place: 2 }),
			row({ name: "W2a", ageGroupRaw: "AK 10", place: 2 }),
			row({ name: "X", ageGroupRaw: "AK 12", place: 5 })
		];
		expect(placedEntries(rows, ORDER).map((entry) => entry.row.name)).toEqual(["W2a", "W2b", "W1", "M1", "X"]);
	});
});
