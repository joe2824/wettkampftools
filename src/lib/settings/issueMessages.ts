// Prüfhinweise beim Einstellungs-Import als deutsche Sätze.

const GENERIC_MESSAGE = "Ein Wert war ungültig und wurde auf Standard zurückgesetzt.";

/** Ganze Codes mit eigenem Satz. */
const FULL_MESSAGES: Record<string, string> = {
	"root.invalid": "Die Datei ist keine gültige Einstellungsdatei. Es wurde nichts geändert.",
	"unknownKeys.dropped": "Unbekannte Einträge wurden ignoriert.",
	"schemaVersion.unsupported": "Die Datei stammt aus einer anderen Version. Passende Werte wurden übernommen.",
	"ageGroups.invalid": "Altersklassen waren ungültig und wurden zurückgesetzt.",
	"ageGroups.empty": "Die Liste der Altersklassen war leer und wurde zurückgesetzt.",
	"waveStartAgeGroup.invalid": "Die Wellen-Starterlaubnis passte nicht zu den Altersklassen und wurde angepasst.",
	"rulebook.invalid": "Das Regelwerk war ungültig und wurde entfernt.",
	"event.signers.invalid": "Die Unterzeichner waren ungültig und wurden zurückgesetzt.",
	"event.date.invalid": "Das Datum war ungültig und wurde zurückgesetzt.",
	"teamNameOverrides.invalid": "Die eigenen Mannschaftsnamen waren ungültig und wurden entfernt.",
	"teamNameOverrides.invalidEntries": "Ungültige eigene Mannschaftsnamen wurden entfernt."
};

const FIELD_LABELS: Record<string, string> = {
	ageGroups: "Altersklassen",
	seniorTeamAgeGroups: "Senioren-Altersklassen (Mannschaft)",
	seniorIndividualAgeGroups: "Senioren-Altersklassen (Einzel)",
	waveStartAgeGroup: "Wellen-Starterlaubnis",
	simplifySeniorAgeGroups: "Senioren zusammenfassen",
	excludeUnplacedTeams: "Nicht angetretene Teams ausschließen",
	legacyMigrated: "Übernahme der alten Version",
	event: "Veranstaltung",
	"event.number": "Nr. des Wettkampfs",
	"event.title": "Titel",
	"event.host": "Ausrichter",
	"event.venue": "Ort",
	"event.signers.0.name": "Name Unterzeichner 1",
	"event.signers.0.role": "Funktion Unterzeichner 1",
	"event.signers.1.name": "Name Unterzeichner 2",
	"event.signers.1.role": "Funktion Unterzeichner 2",
	certificates: "Urkunden",
	"certificates.withMemberNames": "Mitgliedernamen",
	"certificates.copiesPerTeam": "Urkunden je Mannschaft",
	"certificates.copiesPerIndividual": "Urkunden je Einzelstarter",
	"certificates.printOffsetMm": "Druckversatz",
	"certificates.printOffsetMm.x": "Druckversatz waagerecht",
	"certificates.printOffsetMm.y": "Druckversatz senkrecht"
};

const KIND_MESSAGES: Record<string, string> = {
	invalid: "Der Wert war ungültig und wurde auf Standard zurückgesetzt.",
	empty: "Die Liste war leer und wurde auf Standard zurückgesetzt.",
	invalidEntries: "Ungültige Einträge wurden entfernt.",
	clamped: "Der Wert lag außerhalb des erlaubten Bereichs und wurde angepasst.",
	rounded: "Der Wert wurde auf eine ganze Zahl gerundet."
};

/** Ein Hinweiscode als verständlicher Satz; Unbekanntes wird allgemein beschrieben. */
export function issueMessage(code: string): string {
	const full = FULL_MESSAGES[code];
	if (full) return full;
	const dot = code.lastIndexOf(".");
	const label = FIELD_LABELS[code.slice(0, dot)];
	const kind = KIND_MESSAGES[code.slice(dot + 1)];
	return dot > 0 && label && kind ? `${label}: ${kind}` : GENERIC_MESSAGE;
}

/** Alle Hinweise ohne doppelte Sätze. */
export function issueMessages(codes: readonly string[]): string[] {
	return [...new Set(codes.map(issueMessage))];
}
