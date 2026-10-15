// Schritte der Vorbereitung mit Zustand aus Veranstaltung, Meldedatei und Export.
import type { Step } from "$lib/components/stepper/stepper";
import { isEventComplete } from "$lib/settings/eventInfo";
import type { EventInfo } from "$lib/settings/settings";

export const NO_REGISTRATION_REASON = "Zuerst die Meldedatei laden.";

export interface PreparationStepInput {
	event: EventInfo;
	hasRegistration: boolean;
	/** Meldungen, die JAuswertung verwerfen würde. */
	errorCount: number;
	/** Export zum aktuellen Stand gespeichert. */
	exported: boolean;
}

function eventStatus(event: EventInfo): Step["status"] {
	if (event.date.trim() === "") return "warning";
	return isEventComplete(event) ? "done" : "open";
}

function needsRegistration(step: Step, hasRegistration: boolean): Step {
	return hasRegistration ? step : { ...step, status: "locked", lockedReason: NO_REGISTRATION_REASON };
}

export function preparationSteps(input: PreparationStepInput): Step[] {
	const { hasRegistration } = input;
	return [
		{
			id: "event",
			label: "Veranstaltung",
			description: "Angaben für Urkunden und Aushang – werden sofort gespeichert.",
			status: eventStatus(input.event)
		},
		{
			id: "load",
			label: "Meldedatei",
			description: "Mannschaften-Export (CSV) aus dem Meldeportal.",
			status: hasRegistration ? "done" : "open"
		},
		needsRegistration(
			{
				id: "check",
				label: "Prüfen",
				description: "Gründe, aus denen JAuswertung Meldungen verwerfen würde.",
				status: input.errorCount > 0 ? "warning" : "done"
			},
			hasRegistration
		),
		needsRegistration(
			{
				id: "wave",
				label: "Welle",
				description: "Welche Mannschaften starten zusätzlich in der Welle?",
				status: "done"
			},
			hasRegistration
		),
		needsRegistration(
			{
				id: "export",
				label: "Export",
				description: "Excel-Datei zum Import in JAuswertung speichern.",
				status: input.exported ? "done" : "open"
			},
			hasRegistration
		)
	];
}
