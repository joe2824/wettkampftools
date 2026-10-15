// Schwimmzeiten in Hundertstelsekunden, wie JAuswertung sie speichert (5817 = 58,17 s).

const HUNDREDTHS_PER_SECOND = 100;
const SECONDS_PER_MINUTE = 60;
const HUNDREDTHS_PER_MINUTE = HUNDREDTHS_PER_SECOND * SECONDS_PER_MINUTE;
const TIME_PATTERN = /^(?:(\d+):(\d{2})|(\d+))(?:[.,](\d{1,2}))?$/;
const UNIT_SUFFIX = /\s*s$/i;

const pad2 = (n: number): string => String(n).padStart(2, "0");

/** „58,17 s“ unter einer Minute, sonst „1:23,45“. */
export function formatRecTime(hundredths: number): string {
	const minutes = Math.floor(hundredths / HUNDREDTHS_PER_MINUTE);
	const seconds = Math.floor((hundredths % HUNDREDTHS_PER_MINUTE) / HUNDREDTHS_PER_SECOND);
	const fraction = pad2(hundredths % HUNDREDTHS_PER_SECOND);
	return minutes === 0 ? `${seconds},${fraction} s` : `${minutes}:${pad2(seconds)},${fraction}`;
}

/** Liest „58,17“, „58.17 s“ oder „1:23,45“; null bei Unlesbarem oder 0. */
export function parseRecTime(text: string): number | null {
	const match = TIME_PATTERN.exec(text.trim().replace(UNIT_SUFFIX, ""));
	if (!match) return null;
	const [, minuteText, secondText, plainSeconds, fractionText = ""] = match;
	const minutes = minuteText ? Number(minuteText) : 0;
	const seconds = Number(secondText ?? plainSeconds);
	if (minuteText && seconds >= SECONDS_PER_MINUTE) return null;
	const fraction = Number(fractionText.padEnd(2, "0"));
	const total = minutes * HUNDREDTHS_PER_MINUTE + seconds * HUNDREDTHS_PER_SECOND + fraction;
	return total > 0 ? total : null;
}

/** Immer in Sekunden: „5,00 s“, „83,45 s“. */
export function formatSeconds(hundredths: number): string {
	const seconds = Math.floor(hundredths / HUNDREDTHS_PER_SECOND);
	return `${seconds},${pad2(hundredths % HUNDREDTHS_PER_SECOND)} s`;
}

const MINUS_SIGN = "−";

/** Unterschied neu − alt: „+5,00 s“, „−6,96 s“, „±0“. */
export function formatRecDifference(hundredths: number): string {
	if (hundredths === 0) return "±0";
	const sign = hundredths > 0 ? "+" : MINUS_SIGN;
	return sign + formatSeconds(Math.abs(hundredths));
}
