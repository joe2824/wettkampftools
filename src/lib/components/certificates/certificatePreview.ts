// Urkunden-Vorschau: Blättern und Beschriftung der aktuellen Seite.
import type { CertificatePage } from "$lib/certificates/model";

const SEPARATOR = " · ";
const WHOLE_NUMBER = /^\d+$/;
const KEY_STEPS: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1 };
const ENTRY_KEYS: Record<string, (pages: readonly CertificatePage[], index: number) => number> = {
	PageDown: nextEntryPage,
	PageUp: previousEntryPage
};

export function clampPage(index: number, count: number): number {
	return Math.min(Math.max(index, 0), Math.max(count - 1, 0));
}

/** Eingegebene Seitenzahl (ab 1) als Position; ungültig → null. */
export function parsePageNumber(text: string, count: number): number | null {
	const trimmed = text.trim();
	if (!WHOLE_NUMBER.test(trimmed)) return null;
	return clampPage(Number(trimmed) - 1, count);
}

/** Erste Seite des Eintrags, zu dem die Seite gehört. */
function entryStart(pages: readonly CertificatePage[], index: number): number {
	let start = index;
	while (start > 0 && pages[start - 1].entryId === pages[index].entryId) start -= 1;
	return start;
}

/** Erste Seite des nächsten Eintrags (nächster Platz); beim letzten Eintrag bleibt die Seite. */
export function nextEntryPage(pages: readonly CertificatePage[], index: number): number {
	const current = pages[index];
	if (!current) return clampPage(index, pages.length);
	const next = pages.findIndex((page, position) => position > index && page.entryId !== current.entryId);
	return next === -1 ? index : next;
}

/** Erste Seite des vorherigen Eintrags; beim ersten Eintrag die erste Seite. */
export function previousEntryPage(pages: readonly CertificatePage[], index: number): number {
	if (!pages[index]) return 0;
	const start = entryStart(pages, index);
	return start === 0 ? 0 : entryStart(pages, start - 1);
}

/** Mehr als eine Urkunde je Eintrag: dann lohnt das Springen von Platz zu Platz. */
export function hasMultiplePagesPerEntry(pages: readonly CertificatePage[]): boolean {
	return pages.some((page) => page.copyIndex > 0);
}

/** Neue Position für Pfeiltasten, Bild auf/ab (Platz), Pos1 und Ende; andere Tasten → null. */
export function pageForKey(key: string, index: number, pages: readonly CertificatePage[]): number | null {
	const count = pages.length;
	if (key === "Home") return 0;
	if (key === "End") return clampPage(count - 1, count);
	const entryJump = ENTRY_KEYS[key];
	if (entryJump) return entryJump(pages, index);
	const step = KEY_STEPS[key];
	return step === undefined ? null : clampPage(index + step, count);
}

/** „Seite 3 von 115 · Musterstadt 2 · 3. Platz · AK 13/14 weiblich · Urkunde 2/5“ (+ Mitglied). */
export function pageCaption(pages: readonly CertificatePage[], index: number): string {
	const page = pages[index];
	if (!page) return "";
	const { values } = page;
	const copies = pages.filter((other) => other.entryId === page.entryId).length;
	const parts = [
		`Seite ${index + 1} von ${pages.length}`,
		values.name ?? "",
		`${values.platz ?? ""}. Platz`,
		`${values.altersklasse ?? ""} ${values.geschlecht ?? ""}`.trim()
	];
	if (copies > 1) parts.push(`Urkunde ${page.copyIndex + 1}/${copies}`);
	if (values.mitglied) parts.push(values.mitglied);
	return parts.filter((part) => part !== "").join(SEPARATOR);
}
