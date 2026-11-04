// Schriftgröße der Oberfläche in Prozent; alle Größen hängen an der Wurzel-Schriftgröße (rem).

export const FONT_SCALES = [80, 90, 100, 110, 125, 150] as const;
export const DEFAULT_FONT_SCALE = 100;

export type FontScaleAction = "larger" | "smaller" | "reset";

const KEYS: Record<string, FontScaleAction> = {
	"+": "larger",
	"=": "larger",
	"-": "smaller",
	"0": "reset"
};

/** Nächste Stufe; ungültige Werte rasten auf die nächstgelegene Stufe ein. */
export function stepFontScale(current: number, action: FontScaleAction): number {
	if (action === "reset") return DEFAULT_FONT_SCALE;
	const index = nearestIndex(current);
	const next = action === "larger" ? index + 1 : index - 1;
	return FONT_SCALES[Math.min(Math.max(next, 0), FONT_SCALES.length - 1)];
}

function nearestIndex(value: number): number {
	let best = 0;
	FONT_SCALES.forEach((scale, index) => {
		if (Math.abs(scale - value) < Math.abs(FONT_SCALES[best] - value)) best = index;
	});
	return best;
}

/** Gespeicherter Wert, falls er eine bekannte Stufe ist. */
export function parseFontScale(stored: string | null | undefined): number {
	const value = Number(stored);
	return (FONT_SCALES as readonly number[]).includes(value) ? value : DEFAULT_FONT_SCALE;
}

/** Strg/⌘ mit +, − oder 0, auch auf dem Ziffernblock; Shift ist erlaubt, weil „+“ je nach Tastatur Shift braucht. */
export function fontScaleShortcut(event: KeyboardEvent, apple: boolean): FontScaleAction | null {
	const command = apple ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;
	if (!command || event.altKey) return null;
	return KEYS[event.key] ?? null;
}
