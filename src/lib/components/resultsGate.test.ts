import { describe, expect, it } from "vitest";
import { NO_RESULTS_REASON, resultsGateReason, YEAR_PENDING_REASON } from "./resultsGate";

describe("resultsGateReason", () => {
	it("sperrt ohne Ergebnisdatei", () => {
		expect(resultsGateReason({ hasResults: false, yearPending: false })).toBe(NO_RESULTS_REASON);
	});

	it("sperrt, solange das Dateijahr nicht bestätigt ist", () => {
		expect(resultsGateReason({ hasResults: true, yearPending: true })).toBe(YEAR_PENDING_REASON);
	});

	it("gibt frei, wenn die Datei geladen und bestätigt ist", () => {
		expect(resultsGateReason({ hasResults: true, yearPending: false })).toBeNull();
	});
});
