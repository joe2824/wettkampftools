// Gemeinsame Sperre für Schritte, die eine bestätigte Ergebnisdatei brauchen.
export const NO_RESULTS_REASON = "Zuerst die Ergebnisdatei laden.";
export const YEAR_PENDING_REASON = "Zuerst in Schritt 1 bestätigen, dass die Ergebnisdatei die richtige ist.";

export interface ResultsGateInput {
	hasResults: boolean;
	/** Dateijahr weicht ab und ist noch nicht bestätigt. */
	yearPending: boolean;
}

/** Grund der Sperre oder null, wenn die Ergebnisdatei bereit ist. */
export function resultsGateReason({ hasResults, yearPending }: ResultsGateInput): string | null {
	if (!hasResults) return NO_RESULTS_REASON;
	return yearPending ? YEAR_PENDING_REASON : null;
}
