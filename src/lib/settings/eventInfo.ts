// Veranstaltungsdaten: nächster Wettkampf, Vollständigkeit, Überschrift.
import type { EventInfo } from "./settings";

const WHOLE_NUMBER = /^\d+$/;
const UNTITLED = "Veranstaltung ohne Titel";

/** Ganze Zahl → um 1 erhöht; alles andere bleibt, wie es ist. */
function nextNumber(number: string): string {
	const trimmed = number.trim();
	return WHOLE_NUMBER.test(trimmed) ? String(Number(trimmed) + 1) : number;
}

/** Für „Neuer Wettkampf“: Nummer hochzählen, Datum leeren, alles andere behalten. */
export function nextCompetitionEvent(event: EventInfo): EventInfo {
	return {
		...event,
		number: nextNumber(event.number),
		date: "",
		signers: [{ ...event.signers[0] }, { ...event.signers[1] }]
	};
}

/** Nummer, Titel und Datum sind eingetragen. */
export function isEventComplete(event: EventInfo): boolean {
	return [event.number, event.title, event.date].every((value) => value.trim() !== "");
}

/** „39. Wellenwettkampf“; ohne Nummer nur der Titel. */
export function eventHeadline(event: EventInfo): string {
	const title = event.title.trim();
	const number = event.number.trim();
	if (title === "" && number === "") return UNTITLED;
	return number === "" ? title : `${number}. ${title}`.trim();
}

/** Hinweis im Dialog „Neuer Wettkampf“: was mit der Veranstaltung passiert. */
export function nextCompetitionHint(event: EventInfo): string {
	const next = nextNumber(event.number);
	return next === event.number ? "Das Datum wird geleert." : `Die Nummer wird auf ${next} erhöht, das Datum geleert.`;
}
