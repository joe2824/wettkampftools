// Textvorlagen: Platzhalter in geschweiften Klammern, **fett** für Fettdruck.

export const PLACEHOLDERS = [
	{ key: "name", token: "{name}", description: "Name der Mannschaft bzw. des Teilnehmers" },
	{ key: "mitglied", token: "{mitglied}", description: "Name des Mannschaftsmitglieds" },
	{ key: "gliederung", token: "{gliederung}", description: "Gliederung" },
	{ key: "wertung", token: "{wertung}", description: "Wertung" },
	{ key: "altersklasse", token: "{altersklasse}", description: "Altersklasse" },
	{ key: "geschlecht", token: "{geschlecht}", description: "Geschlecht" },
	{ key: "wettkampfpunkte", token: "{wettkampfpunkte}", description: "Erreichte Wettkampfpunkte" },
	{ key: "platz", token: "{platz}", description: "Platzierung" },
	{ key: "nr", token: "{nr}", description: "Nummer der Veranstaltung" },
	{ key: "titel", token: "{titel}", description: "Titel der Veranstaltung" },
	{ key: "ausrichter", token: "{ausrichter}", description: "Ausrichter" },
	{ key: "datum", token: "{datum}", description: "Datum der Veranstaltung" },
	{ key: "ort", token: "{ort}", description: "Ort der Veranstaltung" },
	{ key: "unterzeichner1", token: "{unterzeichner1}", description: "Name der ersten Unterschrift" },
	{ key: "funktion1", token: "{funktion1}", description: "Funktion der ersten Unterschrift" },
	{ key: "unterzeichner2", token: "{unterzeichner2}", description: "Name der zweiten Unterschrift" },
	{ key: "funktion2", token: "{funktion2}", description: "Funktion der zweiten Unterschrift" }
] as const;

export type PlaceholderKey = (typeof PLACEHOLDERS)[number]["key"];
export type PlaceholderValues = Partial<Record<PlaceholderKey, string>>;

export interface TextRun {
	text: string;
	bold: boolean;
}

const BOLD_MARKER = "**";
const PLACEHOLDER_PATTERN = /\{([a-z0-9]+)\}/g;
const PLACEHOLDER_KEYS: ReadonlySet<string> = new Set(PLACEHOLDERS.map((p) => p.key));

export function parseTemplate(template: string): TextRun[] {
	const parts = template.split(BOLD_MARKER);
	// Bei ungerader Markeranzahl bleibt der letzte Marker normaler Text.
	if (parts.length % 2 === 0) {
		const tail = parts.splice(-2).join(BOLD_MARKER);
		parts.push(tail);
	}
	const runs: TextRun[] = [];
	parts.forEach((text, index) => {
		if (text === "") return;
		runs.push({ text, bold: index % 2 === 1 });
	});
	return runs;
}

export function fillTemplate(template: string, values: PlaceholderValues): TextRun[] {
	return parseTemplate(template).map((run) => ({
		bold: run.bold,
		text: run.text.replace(PLACEHOLDER_PATTERN, (token, key: string) => {
			if (!PLACEHOLDER_KEYS.has(key)) return token;
			return values[key as PlaceholderKey] ?? token;
		})
	}));
}
