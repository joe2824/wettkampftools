// Erfundener Wettkampfstand für Tests.
import type { StoredResults } from "$lib/competition/resultsFile";

/** Gesicherte Ergebnisse mit allen Angaben. */
export function storedResults(): StoredResults {
	return {
		fileName: "JAuswertung.xlsx",
		createdMs: 1_600_000_000_000,
		modifiedMs: 1_700_000_000_000,
		workbook: {
			sheets: [
				{
					name: "Daten",
					rows: [
						["Platz", "Name"],
						[1, "Musterstadt"],
						[null, true]
					]
				}
			],
			properties: { created: "2026-10-01T10:00:00Z", modified: null }
		},
		yearWarning: 2025,
		yearConfirmed: true
	};
}
