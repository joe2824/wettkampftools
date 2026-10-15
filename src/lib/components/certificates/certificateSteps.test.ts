import { describe, expect, it } from "vitest";
import { NO_RESULTS_REASON, YEAR_PENDING_REASON } from "$lib/components/resultsGate";
import { certificateSteps, NO_SELECTION_REASON, type CertificateStepInput } from "./certificateSteps";

const ready: CertificateStepInput = { hasResults: true, yearPending: false, entryCount: 10, selectedCount: 4 };
const statuses = (input: CertificateStepInput) => certificateSteps(input).map((step) => step.status);

describe("certificateSteps", () => {
	it("liefert Ergebnisdatei, Auswählen, Vorschau und Drucken", () => {
		expect(certificateSteps(ready).map((step) => step.id)).toEqual(["results", "select", "preview", "print"]);
		expect(statuses(ready)).toEqual(["done", "done", "open", "open"]);
	});

	it("sperrt alles nach der Ergebnisdatei, solange keine geladen ist", () => {
		const steps = certificateSteps({ ...ready, hasResults: false, entryCount: 0, selectedCount: 0 });
		expect(steps.map((step) => step.status)).toEqual(["open", "locked", "locked", "locked"]);
		expect(steps[1].lockedReason).toBe(NO_RESULTS_REASON);
	});

	it("sperrt Vorschau und Drucken ohne ausgewählte Einträge", () => {
		const steps = certificateSteps({ ...ready, selectedCount: 0 });
		expect(steps.map((step) => step.status)).toEqual(["done", "open", "locked", "locked"]);
		expect(steps[2].lockedReason).toBe(NO_SELECTION_REASON);
	});

	it("warnt, wenn die Datei keine passenden Einträge enthält", () => {
		expect(statuses({ ...ready, entryCount: 0, selectedCount: 0 })[1]).toBe("warning");
	});

	it("sperrt nur das Drucken, solange das Dateijahr nicht bestätigt ist", () => {
		const steps = certificateSteps({ ...ready, yearPending: true });
		expect(steps.map((step) => step.status)).toEqual(["warning", "done", "open", "locked"]);
		expect(steps[3].lockedReason).toBe(YEAR_PENDING_REASON);
	});
});
