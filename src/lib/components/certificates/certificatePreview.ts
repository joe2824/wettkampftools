// Urkunden-Vorschau: Blättern und Beschriftung der aktuellen Seite.
import type { CertificatePage } from "$lib/certificates/model";

const SEPARATOR = " · ";
const WHOLE_NUMBER = /^\d+$/;
const KEY_STEPS: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1 };

export function clampPage(index: number, count: number): number {
	return Math.min(Math.max(index, 0), Math.max(count - 1, 0));
}

/** Eingegebene Seitenzahl (ab 1) als Position; ungültig → null. */
export function parsePageNumber(text: string, count: number): number | null {
	const trimmed = text.trim();
	if (!WHOLE_NUMBER.test(trimmed)) return null;
	return clampPage(Number(trimmed) - 1, count);
}

/** Neue Position für Pfeiltasten, Pos1 und Ende; andere Tasten → null. */
export function pageForKey(key: string, index: number, count: number): number | null {
	if (key === "Home") return 0;
	if (key === "End") return clampPage(count - 1, count);
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
