// Automatische Wahl unter gleichnamigen Gliederungen über Zusätze im Mannschaftsnamen.

export interface HintOption {
	id: string;
	/** Beschreibung mit Postleitzahl, Ort und Art. */
	text: string;
}

const LOCALE = "de";
// Kürzere Wörter (Nummern, „am“, „an“) sind zu unspezifisch.
const MIN_WORD_LENGTH = 3;
const WORD_SEPARATOR = /[^\p{L}\p{N}]+/u;

function words(text: string): string[] {
	return text
		.toLocaleLowerCase(LOCALE)
		.split(WORD_SEPARATOR)
		.filter((word) => word.length >= MIN_WORD_LENGTH);
}

/** Kennung der einzigen Option, auf die ein Zusatz passt; sonst null. */
export function pickByHint(name: string, options: readonly HintOption[], hints: readonly string[]): string | null {
	const nameWords = new Set(words(name));
	const hintWords = [...new Set(hints.flatMap(words))].filter((word) => !nameWords.has(word));
	if (hintWords.length === 0) return null;
	const fits = options.filter((option) => {
		const optionWords = words(option.text);
		return hintWords.some((hint) => optionWords.some((word) => word.startsWith(hint)));
	});
	return fits.length === 1 ? fits[0].id : null;
}
