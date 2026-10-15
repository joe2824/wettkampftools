// Schritte der Auswertung; Wertung und Speichern erst mit bestätigter Mannschafts-Ergebnisdatei.
import { resultsGateReason, type ResultsGateInput } from "$lib/components/resultsGate";
import type { Step } from "$lib/components/stepper/stepper";

export const INDIVIDUAL_REASON = "Einzelwettkampf – hier gibt es keine Pokalwertung.";

export interface EvaluationStepInput extends ResultsGateInput {
	/** Einzelwettkampf: keine Pokalwertung möglich. */
	individualOnly: boolean;
}

function lockReason(input: EvaluationStepInput): string | null {
	const gate = resultsGateReason(input);
	if (gate !== null) return gate;
	return input.individualOnly ? INDIVIDUAL_REASON : null;
}

export function evaluationSteps(input: EvaluationStepInput): Step[] {
	const reason = lockReason(input);
	const gated = (step: Step): Step => (reason === null ? step : { ...step, status: "locked", lockedReason: reason });
	let resultsStatus: Step["status"] = "open";
	if (input.hasResults) resultsStatus = reason === null ? "done" : "warning";
	return [
		{
			id: "results",
			label: "Ergebnisdatei",
			description: "Excel-Export aus JAuswertung laden – er wird danach auch für die Urkunden genutzt.",
			status: resultsStatus
		},
		gated({
			id: "standings",
			label: "Gesamtwertung",
			description: "Pokalpunkte je Ortsgruppe. Eine Zeile aufklappen, um die Rechnung zu sehen.",
			status: "open"
		}),
		gated({
			id: "save",
			label: "Speichern",
			description: "Aushang zum Ausdrucken und Excel-Datei für die Unterlagen.",
			status: "open"
		})
	];
}
