// Windows-1252-Sonderzeichen im Bereich 0x80–0x9F
const CP1252_SPECIALS: Record<string, number> = {
	"€": 0x80,
	"‚": 0x82,
	ƒ: 0x83,
	"„": 0x84,
	"…": 0x85,
	"†": 0x86,
	"‡": 0x87,
	ˆ: 0x88,
	"‰": 0x89,
	Š: 0x8a,
	"‹": 0x8b,
	Œ: 0x8c,
	Ž: 0x8e,
	"‘": 0x91,
	"’": 0x92,
	"“": 0x93,
	"”": 0x94,
	"•": 0x95,
	"–": 0x96,
	"—": 0x97,
	"˜": 0x98,
	"™": 0x99,
	š: 0x9a,
	"›": 0x9b,
	œ: 0x9c,
	ž: 0x9e,
	Ÿ: 0x9f
};
const LATIN1_MAX = 0xff;
const C1_START = 0x80;
const C1_END = 0x9f;

/** Kodiert Text als Windows-1252 (nur für Tests). */
export function encodeWindows1252(text: string): Uint8Array {
	const bytes: number[] = [];
	for (const char of text) {
		const special = CP1252_SPECIALS[char];
		const code = char.codePointAt(0) ?? 0;
		if (special !== undefined) {
			bytes.push(special);
		} else if (code <= LATIN1_MAX && (code < C1_START || code > C1_END)) {
			bytes.push(code);
		} else {
			throw new Error(`Zeichen nicht in Windows-1252 darstellbar: U+${code.toString(16)}`);
		}
	}
	return Uint8Array.from(bytes);
}
