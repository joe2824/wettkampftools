import { describe, expect, it } from "vitest";
import { NO_RESULTS_REASON, YEAR_PENDING_REASON } from "$lib/components/resultsGate";
import { evaluationSteps, INDIVIDUAL_REASON, type EvaluationStepInput } from "./evaluationSteps";

const ready: EvaluationStepInput = { hasResults: true, yearPending: false, individualOnly: false };
const reasons = (input: EvaluationStepInput) => evaluationSteps(input).map((step) => step.lockedReason);

describe("evaluationSteps", () => {
	it("liefert Ergebnisdatei, Gesamtwertung und Speichern", () => {
		expect(evaluationSteps(ready).map((step) => step.id)).toEqual(["results", "standings", "save"]);
		expect(evaluationSteps(ready).map((step) => step.status)).toEqual(["done", "open", "open"]);
	});

	it("sperrt ohne Ergebnisdatei", () => {
		const input = { ...ready, hasResults: false };
		expect(evaluationSteps(input).map((step) => step.status)).toEqual(["open", "locked", "locked"]);
		expect(reasons(input)[1]).toBe(NO_RESULTS_REASON);
	});

	it("sperrt und warnt, solange das Dateijahr nicht bestätigt ist", () => {
		const input = { ...ready, yearPending: true };
		expect(evaluationSteps(input).map((step) => step.status)).toEqual(["warning", "locked", "locked"]);
		expect(reasons(input)[2]).toBe(YEAR_PENDING_REASON);
	});

	it("sperrt beim Einzelwettkampf", () => {
		const input = { ...ready, individualOnly: true };
		expect(evaluationSteps(input).map((step) => step.status)).toEqual(["warning", "locked", "locked"]);
		expect(reasons(input)[1]).toBe(INDIVIDUAL_REASON);
	});
});
