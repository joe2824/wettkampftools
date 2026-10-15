// Startseite: Hinweis auf die Rec-Werte, solange ein neuer Wettkampf vorbereitet wird.

export interface RecUpdateHintState {
	/** Ergebnisse des Wettkampfs sind geladen. */
	hasResults: boolean;
	/** Veranstaltungsdatum als „JJJJ-MM-TT“, leer nach „Neuer Wettkampf“. */
	eventDate: string;
	today: Date;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const pad2 = (n: number): string => String(n).padStart(2, "0");

const isoDate = (date: Date): string => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

/** Sichtbar ohne Ergebnisse, solange das Datum fehlt oder der Wettkampf noch bevorsteht. */
export function shouldShowRecUpdateHint({ hasResults, eventDate, today }: RecUpdateHintState): boolean {
	if (hasResults) return false;
	const date = eventDate.trim();
	return !ISO_DATE.test(date) || date >= isoDate(today);
}
