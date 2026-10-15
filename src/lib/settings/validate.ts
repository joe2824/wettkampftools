/** Geprüfter Wert; `issue` ist ein Code, falls korrigiert oder ersetzt wurde. */
export interface Checked<T> {
	value: T;
	issue?: string;
}

export function isRecord(input: unknown): input is Record<string, unknown> {
	return typeof input === "object" && input !== null && !Array.isArray(input);
}

/** Texte kürzen, Leere und Doppelte (ohne Groß-/Kleinschreibung) entfernen. */
export function checkStringList(input: unknown, fallback: readonly string[], field: string): Checked<string[]> {
	if (!Array.isArray(input)) return { value: [...fallback], issue: `${field}.invalid` };
	const seen = new Set<string>();
	const value: string[] = [];
	let hasInvalidEntries = false;
	for (const entry of input) {
		if (typeof entry !== "string") {
			hasInvalidEntries = true;
			continue;
		}
		const trimmed = entry.trim();
		const key = trimmed.toLocaleLowerCase("de");
		if (trimmed === "" || seen.has(key)) continue;
		seen.add(key);
		value.push(trimmed);
	}
	if (value.length === 0) return { value: [...fallback], issue: `${field}.empty` };
	return hasInvalidEntries ? { value, issue: `${field}.invalidEntries` } : { value };
}

/** Text-Zuordnung prüfen: kürzen, Leere, zu Lange und doppelte Schlüssel (ohne Groß-/Kleinschreibung) entfernen. */
export function checkStringMap(input: unknown, maxLength: number, field: string): Checked<Record<string, string>> {
	if (!isRecord(input)) return { value: {}, issue: `${field}.invalid` };
	const seen = new Set<string>();
	const value: Record<string, string> = {};
	let hasInvalidEntries = false;
	for (const [rawKey, rawValue] of Object.entries(input)) {
		const key = rawKey.trim();
		const text = typeof rawValue === "string" ? rawValue.trim() : "";
		const lowerKey = key.toLocaleLowerCase("de");
		if (key === "" || text === "" || text.length > maxLength || seen.has(lowerKey)) {
			hasInvalidEntries = true;
			continue;
		}
		seen.add(lowerKey);
		value[key] = text;
	}
	return hasInvalidEntries ? { value, issue: `${field}.invalidEntries` } : { value };
}

export function checkString(input: unknown, fallback: string, field: string): Checked<string> {
	return typeof input === "string" ? { value: input } : { value: fallback, issue: `${field}.invalid` };
}

export function checkBoolean(input: unknown, fallback: boolean, field: string): Checked<boolean> {
	return typeof input === "boolean" ? { value: input } : { value: fallback, issue: `${field}.invalid` };
}

export function checkNumberInRange(
	input: unknown,
	fallback: number,
	min: number,
	max: number,
	field: string
): Checked<number> {
	if (typeof input !== "number" || !Number.isFinite(input)) return { value: fallback, issue: `${field}.invalid` };
	const value = Math.min(max, Math.max(min, input));
	return value === input ? { value } : { value, issue: `${field}.clamped` };
}

export function checkIntegerInRange(
	input: unknown,
	fallback: number,
	min: number,
	max: number,
	field: string
): Checked<number> {
	const checked = checkNumberInRange(input, fallback, min, max, field);
	if (checked.issue || Number.isInteger(checked.value)) return checked;
	return { value: Math.round(checked.value), issue: `${field}.rounded` };
}

/** Sammelt Hinweiscodes; fehlende Felder bekommen still den Standard. */
export class IssueCollector {
	readonly issues: string[] = [];

	take<T>(source: Record<string, unknown>, key: string, fallback: T, check: () => Checked<T>): T {
		if (!(key in source) || source[key] === undefined) return fallback;
		const checked = check();
		if (checked.issue) this.issues.push(checked.issue);
		return checked.value;
	}

	report(issue: string): void {
		this.issues.push(issue);
	}
}

export function parseSection<T>(
	source: Record<string, unknown>,
	key: string,
	fallback: T,
	collector: IssueCollector,
	parse: (input: Record<string, unknown>, fallback: T, collector: IssueCollector) => T
): T {
	if (!(key in source)) return fallback;
	const input = source[key];
	if (isRecord(input)) return parse(input, fallback, collector);
	collector.report(`${key}.invalid`);
	return fallback;
}
