import { describe, expect, it } from "vitest";
import { recordSteps, type RecordStepInput } from "./recordSteps";

const base: RecordStepInput = {
	hasClub: true,
	hasOfficial: true,
	openValues: 0,
	hasPenalties: true,
	penaltyIssues: 0,
	saved: false,
	competitionUpdated: false
};
const statuses = (input: RecordStepInput) => recordSteps(input).map((step) => step.status);

describe("recordSteps", () => {
	it("liefert die sechs Schritte in fester Reihenfolge", () => {
		expect(recordSteps(base).map((step) => step.id)).toEqual([
			"club",
			"official",
			"proposal",
			"penalties",
			"save",
			"competition"
		]);
	});

	it("sperrt Vergleich, Speichern und Wettkampfdatei ohne Vereins-Regelwerk", () => {
		const steps = recordSteps({ ...base, hasClub: false, hasOfficial: false });
		expect(steps.map((step) => step.status)).toEqual(["open", "open", "locked", "done", "locked", "locked"]);
		expect(steps[2].lockedReason).toBe("Zuerst das Vereins-Regelwerk laden.");
	});

	it("warnt im Vergleich, solange Werte offen sind", () => {
		expect(statuses({ ...base, openValues: 2 })[2]).toBe("warning");
		expect(statuses(base)[2]).toBe("done");
	});

	it("warnt beim Strafenkatalog mit Befunden", () => {
		expect(statuses({ ...base, penaltyIssues: 1 })[3]).toBe("warning");
		expect(statuses({ ...base, hasPenalties: false })[3]).toBe("open");
	});

	it("hakt Speichern und Wettkampfdatei nach dem Schreiben ab", () => {
		expect(statuses({ ...base, saved: true, competitionUpdated: true }).slice(4)).toEqual(["done", "done"]);
	});
});
