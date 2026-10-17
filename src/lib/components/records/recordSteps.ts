// Schritte zum Regelwerk fürs neue Jahr; Vergleich, Speichern und Wettkampfdatei erst mit Vereins-Regelwerk.
// Die Wellen-Rekorde brauchen keinen Schritt: sie liegen in den Einstellungen und fließen in den Vergleich ein.
import type { Step } from "$lib/components/stepper/stepper";

const NO_CLUB_REASON = "Zuerst das Vereins-Regelwerk laden.";

export interface RecordStepInput {
	hasClub: boolean;
	hasOfficial: boolean;
	/** Rec-Werte, bei denen noch etwas zu tun ist (Rekord übernehmen oder prüfen). */
	openValues: number;
	hasPenalties: boolean;
	/** Befunde der Kontrolle des Strafenkatalogs. */
	penaltyIssues: number;
	saved: boolean;
	competitionUpdated: boolean;
}

function penaltyStatus(input: RecordStepInput): Step["status"] {
	if (!input.hasPenalties) return "open";
	return input.penaltyIssues > 0 ? "warning" : "done";
}

export function recordSteps(input: RecordStepInput): Step[] {
	const needsClub = (step: Step): Step =>
		input.hasClub ? step : { ...step, status: "locked", lockedReason: NO_CLUB_REASON };
	return [
		{
			id: "club",
			label: "Vereins-Regelwerk",
			description: "Das bisherige Regelwerk des Wellenwettkampfs.",
			status: input.hasClub ? "done" : "open"
		},
		{
			id: "official",
			label: "DLRG-Regelwerk",
			description: "Das offizielle Regelwerk liefert die Rec-Werte der Rettungsdisziplinen.",
			status: input.hasOfficial ? "done" : "open"
		},
		needsClub({
			id: "proposal",
			label: "Vergleich",
			description: "Alte und neue Werte; jeder neue Wert lässt sich ändern.",
			status: input.openValues > 0 ? "warning" : "done"
		}),
		{
			id: "penalties",
			label: "Strafenkatalog",
			description: "Offizieller Katalog mit den Vereinsregeln: Fehlstart 100 Strafpunkte, Retten in der Welle.",
			status: penaltyStatus(input)
		},
		needsClub({
			id: "save",
			label: "Speichern",
			description: "Regelwerk mit neuen Rec-Werten und Beschreibung, daneben der Strafenkatalog.",
			status: input.saved ? "done" : "open"
		}),
		needsClub({
			id: "competition",
			label: "Wettkampfdatei",
			description: "Frische JAuswertung-Datei fürs neue Jahr mit den Einstellungen und dem Logo des Vorjahres.",
			status: input.competitionUpdated ? "done" : "open"
		})
	];
}
