// Reine Listenoperationen für sortierbare Einträge.

export interface AddItemResult {
	list: string[];
	error?: string;
}

const isIndex = (list: readonly string[], index: number): boolean =>
	Number.isInteger(index) && index >= 0 && index < list.length;

/** Verschiebt einen Eintrag von einer Position an eine andere. */
export function moveItem(list: readonly string[], from: number, to: number): string[] {
	const result = [...list];
	if (!isIndex(list, from) || !isIndex(list, to)) return result;
	const [item] = result.splice(from, 1);
	result.splice(to, 0, item);
	return result;
}

/** Hängt einen bereinigten Eintrag an; leere und doppelte Einträge werden abgelehnt. */
export function addItem(list: readonly string[], value: string): AddItemResult {
	const trimmed = value.trim();
	if (!trimmed) return { list: [...list], error: "Bitte einen Eintrag eingeben." };
	const lower = trimmed.toLowerCase();
	if (list.some((item) => item.toLowerCase() === lower)) {
		return { list: [...list], error: `„${trimmed}“ ist schon in der Liste.` };
	}
	return { list: [...list, trimmed] };
}

/** Entfernt den Eintrag an der Position. */
export function removeItem(list: readonly string[], index: number): string[] {
	return list.filter((_, position) => position !== index);
}

export interface ParsedTextList {
	list: string[];
	duplicates: string[];
}

/** Ein Eintrag je Zeile, zum Bearbeiten und Kopieren als Text. */
export function formatTextList(list: readonly string[]): string {
	return list.join("\n");
}

/** Liest einen Eintrag je Zeile; leere Zeilen fallen weg, Doppelte werden gemeldet. */
export function parseTextList(text: string): ParsedTextList {
	const list: string[] = [];
	const duplicates: string[] = [];
	const seen = new Set<string>();
	for (const line of text.split(/\r?\n/)) {
		const value = line.trim();
		if (!value) continue;
		const key = value.toLowerCase();
		if (seen.has(key)) {
			duplicates.push(value);
			continue;
		}
		seen.add(key);
		list.push(value);
	}
	return { list, duplicates };
}
