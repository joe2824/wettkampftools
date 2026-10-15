// Fließtext mit Zeilenumbruch als Zeichenbefehle.
import type { TextMetrics } from "$lib/certificates/fonts";
import { ptToMm, type FontWeight } from "$lib/certificates/layout";
import type { TextOp } from "$lib/certificates/render";

const DEFAULT_LINE_FACTOR = 1.35;

export interface ParagraphOptions {
	text: string;
	xMm: number;
	topMm: number;
	widthMm: number;
	weight: FontWeight;
	sizePt: number;
	metrics: TextMetrics;
	/** Zeilenabstand als Vielfaches der Schriftgröße */
	lineFactor?: number;
}

export interface ParagraphLayout {
	ops: TextOp[];
	/** Unterkante des Absatzes */
	endMm: number;
}

/** Zu lange Wörter zeichenweise teilen; mindestens ein Zeichen je Zeile. */
function splitWord(word: string, fits: (text: string) => boolean): string[] {
	const parts: string[] = [];
	let current = "";
	for (const char of Array.from(word)) {
		if (current !== "" && !fits(current + char)) {
			parts.push(current);
			current = "";
		}
		current += char;
	}
	if (current !== "") parts.push(current);
	return parts;
}

export function wrapText(
	text: string,
	maxWidthMm: number,
	weight: FontWeight,
	sizePt: number,
	metrics: TextMetrics
): string[] {
	const fits = (candidate: string) => metrics.widthMm(candidate, weight, sizePt) <= maxWidthMm;
	const lines: string[] = [];
	let current = "";
	for (const word of text.split(/\s+/).filter((part) => part !== "")) {
		const candidate = current === "" ? word : `${current} ${word}`;
		if (fits(candidate)) {
			current = candidate;
			continue;
		}
		if (current !== "") lines.push(current);
		const parts = fits(word) ? [word] : splitWord(word, fits);
		lines.push(...parts.slice(0, -1));
		current = parts[parts.length - 1];
	}
	if (current !== "") lines.push(current);
	return lines;
}

export function lineHeightMm(sizePt: number, lineFactor = DEFAULT_LINE_FACTOR): number {
	return ptToMm(sizePt) * lineFactor;
}

export function paragraphOps(options: ParagraphOptions): ParagraphLayout {
	const { xMm, topMm, weight, sizePt, metrics } = options;
	const lineHeight = lineHeightMm(sizePt, options.lineFactor);
	const ascent = metrics.ascentMm(weight, sizePt);
	const lines = wrapText(options.text, options.widthMm, weight, sizePt, metrics);
	const ops = lines.map((text, index): TextOp => ({
		kind: "text",
		text,
		font: weight,
		sizePt,
		xMm,
		baselineMm: topMm + index * lineHeight + ascent
	}));
	return { ops, endMm: topMm + lines.length * lineHeight };
}
