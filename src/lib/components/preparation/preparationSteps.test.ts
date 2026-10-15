import { describe, expect, it } from "vitest";
import type { EventInfo } from "$lib/settings/settings";
import { preparationSteps, type PreparationStepInput } from "./preparationSteps";

const event: EventInfo = {
	number: "12",
	title: "Wellenwettkampf",
	host: "DLRG Musterstadt",
	date: "2026-11-14",
	venue: "Musterstadt",
	signers: [
		{ name: "Max Mustermann", role: "Vorsitzende/r" },
		{ name: "Anna Meier", role: "Wettkampforganisation" }
	]
};

const base: PreparationStepInput = { event, hasRegistration: true, errorCount: 0, exported: false };
const statuses = (input: PreparationStepInput) => preparationSteps(input).map((step) => step.status);

describe("preparationSteps", () => {
	it("liefert die fünf Schritte in fester Reihenfolge", () => {
		expect(preparationSteps(base).map((step) => step.id)).toEqual(["event", "load", "check", "wave", "export"]);
	});

	it("sperrt Prüfen, Welle und Export ohne Meldedatei", () => {
		const steps = preparationSteps({ ...base, hasRegistration: false });
		expect(steps.map((step) => step.status)).toEqual(["done", "open", "locked", "locked", "locked"]);
		expect(steps[2].lockedReason).toBe("Zuerst die Meldedatei laden.");
	});

	it("warnt bei fehlendem Datum und bei Fehlern in den Meldungen", () => {
		expect(statuses({ ...base, event: { ...event, date: "" }, errorCount: 2 })).toEqual([
			"warning",
			"done",
			"warning",
			"done",
			"open"
		]);
	});

	it("lässt die Veranstaltung offen, wenn Nummer oder Titel fehlen", () => {
		expect(statuses({ ...base, event: { ...event, number: " " } })[0]).toBe("open");
	});

	it("hakt den Export nach dem Speichern ab", () => {
		expect(statuses({ ...base, exported: true })[4]).toBe("done");
	});
});
