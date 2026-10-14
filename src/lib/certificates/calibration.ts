// Kalibrierungsseite: Kreuze und Lineale zum Nachmessen des Druckversatzes.
import type { TextMetrics } from "./fonts";
import { PAGE_HEIGHT_MM, PAGE_WIDTH_MM, type FontWeight } from "./layout";
import { shiftOp, type DrawOp, type LineOp, type OffsetMm, type TextOp } from "./render";

const CROSS_INSET_MM = 20;
const CROSS_ARM_MM = 5;
const LINE_THICKNESS_MM = 0.2;
const TICK_THICKNESS_MM = 0.1;

const RULER_EDGE_MM = 10;
const RULER_START_MM = CROSS_INSET_MM;
const TICK_SHORT_MM = 1;
const TICK_MEDIUM_MM = 2;
const TICK_LONG_MM = 4;
const MEDIUM_EVERY_MM = 5;
const LABEL_EVERY_MM = 10;
const LABEL_SIZE_PT = 6;
const LABEL_GAP_MM = 1;

const TITLE = "Kalibrierungsseite";
const TITLE_SIZE_PT = 20;
const TITLE_BASELINE_MM = 120;
const INSTRUCTION_SIZE_PT = 11;
const INSTRUCTION_STEP_MM = 7;
const INSTRUCTIONS = [
	"In tatsächlicher Größe drucken.",
	"Abstand der Kreuzmitten zum Blattrand messen: Soll 20 mm.",
	"Abweichungen als Versatz in den Einstellungen eintragen."
];

function line(x1Mm: number, y1Mm: number, x2Mm: number, y2Mm: number, thicknessMm = LINE_THICKNESS_MM): LineOp {
	return { kind: "line", x1Mm, y1Mm, x2Mm, y2Mm, thicknessMm };
}

function text(value: string, font: FontWeight, sizePt: number, xMm: number, baselineMm: number): TextOp {
	return { kind: "text", text: value, font, sizePt, xMm, baselineMm };
}

function crosshairs(): LineOp[] {
	const xs = [CROSS_INSET_MM, PAGE_WIDTH_MM - CROSS_INSET_MM];
	const ys = [CROSS_INSET_MM, PAGE_HEIGHT_MM - CROSS_INSET_MM];
	return ys.flatMap((y) =>
		xs.flatMap((x) => [line(x - CROSS_ARM_MM, y, x + CROSS_ARM_MM, y), line(x, y - CROSS_ARM_MM, x, y + CROSS_ARM_MM)])
	);
}

function tickLength(positionMm: number): number {
	if (positionMm % LABEL_EVERY_MM === 0) return TICK_LONG_MM;
	if (positionMm % MEDIUM_EVERY_MM === 0) return TICK_MEDIUM_MM;
	return TICK_SHORT_MM;
}

type RulerEdge = "top" | "left";

function rulerTick(edge: RulerEdge, positionMm: number): LineOp {
	const tip = RULER_EDGE_MM + tickLength(positionMm);
	return edge === "top"
		? line(positionMm, RULER_EDGE_MM, positionMm, tip, TICK_THICKNESS_MM)
		: line(RULER_EDGE_MM, positionMm, tip, positionMm, TICK_THICKNESS_MM);
}

// Beschriftung außerhalb des Lineals, damit sie die Kreuze nicht überdeckt.
function rulerLabel(edge: RulerEdge, positionMm: number, metrics: TextMetrics): TextOp {
	const label = String(positionMm);
	const width = metrics.widthMm(label, "regular", LABEL_SIZE_PT);
	const outside = RULER_EDGE_MM - LABEL_GAP_MM;
	if (edge === "top") return text(label, "regular", LABEL_SIZE_PT, positionMm - width / 2, outside);
	const halfAscent = metrics.ascentMm("regular", LABEL_SIZE_PT) / 2;
	return text(label, "regular", LABEL_SIZE_PT, outside - width, positionMm + halfAscent);
}

function ruler(edge: RulerEdge, metrics: TextMetrics): DrawOp[] {
	const pageLength = edge === "top" ? PAGE_WIDTH_MM : PAGE_HEIGHT_MM;
	const end = pageLength - CROSS_INSET_MM;
	return Array.from({ length: end - RULER_START_MM + 1 }, (_, index) => RULER_START_MM + index).flatMap((position) =>
		position % LABEL_EVERY_MM === 0
			? [rulerTick(edge, position), rulerLabel(edge, position, metrics)]
			: [rulerTick(edge, position)]
	);
}

const formatMm = (mm: number): string => `${mm.toFixed(1).replace(".", ",")} mm`;

function centeredTexts(offsetMm: OffsetMm, metrics: TextMetrics): TextOp[] {
	const centered = (value: string, font: FontWeight, sizePt: number, baselineMm: number) =>
		text(value, font, sizePt, (PAGE_WIDTH_MM - metrics.widthMm(value, font, sizePt)) / 2, baselineMm);
	const offsetLine = `Eingestellter Versatz: waagerecht ${formatMm(offsetMm.x)}, senkrecht ${formatMm(offsetMm.y)}`;
	return [
		centered(TITLE, "black", TITLE_SIZE_PT, TITLE_BASELINE_MM),
		...[...INSTRUCTIONS, offsetLine].map((value, index) =>
			centered(value, "regular", INSTRUCTION_SIZE_PT, TITLE_BASELINE_MM + (index + 2) * INSTRUCTION_STEP_MM)
		)
	];
}

export function calibrationPage(offsetMm: OffsetMm, metrics: TextMetrics): DrawOp[] {
	const ops = [
		...crosshairs(),
		...ruler("top", metrics),
		...ruler("left", metrics),
		...centeredTexts(offsetMm, metrics)
	];
	return ops.map((op) => shiftOp(op, offsetMm));
}
