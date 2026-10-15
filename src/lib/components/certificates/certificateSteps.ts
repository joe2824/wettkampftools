// Schritte der Urkunden-Seite: Ergebnisdatei, Auswahl, Vorschau und Druck.
import { NO_RESULTS_REASON, resultsGateReason, type ResultsGateInput } from "$lib/components/resultsGate";
import type { Step } from "$lib/components/stepper/stepper";

export const NO_SELECTION_REASON = "Zuerst Einträge auswählen.";

export interface CertificateStepInput extends ResultsGateInput {
	/** Einträge mit Platz und bekannter Altersklasse. */
	entryCount: number;
	selectedCount: number;
}

const locked = (step: Step, reason: string | null): Step =>
	reason === null ? step : { ...step, status: "locked", lockedReason: reason };

function selectStatus({ entryCount, selectedCount }: CertificateStepInput): Step["status"] {
	if (entryCount === 0) return "warning";
	return selectedCount > 0 ? "done" : "open";
}

export function certificateSteps(input: CertificateStepInput): Step[] {
	const noResults = input.hasResults ? null : NO_RESULTS_REASON;
	const noSelection = noResults ?? (input.selectedCount === 0 ? NO_SELECTION_REASON : null);
	let resultsStatus: Step["status"] = "open";
	if (input.hasResults) resultsStatus = input.yearPending ? "warning" : "done";
	return [
		{
			id: "results",
			label: "Ergebnisdatei",
			description: "Aus der Auswertung übernommen oder hier neu laden.",
			status: resultsStatus
		},
		locked(
			{
				id: "select",
				label: "Auswählen",
				description: "Filtern und einzelne Einträge an- oder abwählen – z. B. zwischendurch nur AK 10 und AK 12.",
				status: selectStatus(input)
			},
			noResults
		),
		locked(
			{
				id: "preview",
				label: "Vorschau",
				description: "Anzahl festlegen und die Urkunden vor dem Druck durchblättern.",
				status: "open"
			},
			noSelection
		),
		locked(
			{
				id: "print",
				label: "Drucken",
				description: "PDF erzeugen und in tatsächlicher Größe drucken.",
				status: "open"
			},
			noSelection ?? resultsGateReason(input)
		)
	];
}
