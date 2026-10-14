// Einfache Tabelle als Zeichenbefehle, mit Seitenumbruch und wiederholter Kopfzeile.
import type { TextMetrics } from "$lib/certificates/fonts";
import { ptToMm, type FontWeight } from "$lib/certificates/layout";
import type { DrawOp, LineOp, TextOp } from "$lib/certificates/render";

export interface TableColumn {
	header: string;
	widthMm: number;
	align: "left" | "right";
}

export interface TableOptions {
	columns: TableColumn[];
	rows: string[][];
	xMm: number;
	/** Oberkante der Tabelle auf Folgeseiten */
	topMm: number;
	/** Unterkante des Inhaltsbereichs */
	bottomMm: number;
	/** Oberkante auf der ersten Seite, falls dort schon anderer Inhalt steht */
	firstPageTopMm?: number;
	sizePt: number;
	headerWeight: FontWeight;
	bodyWeight: FontWeight;
	metrics: TextMetrics;
	/** Zeilenhöhe als Vielfaches der Schriftgröße */
	rowGapFactor?: number;
}

export interface TableLayout {
	pages: DrawOp[][];
	/** Unterkante der Tabelle auf der letzten Seite */
	endMm: number;
}

export const DEFAULT_ROW_GAP_FACTOR = 1.4;
export const CELL_PADDING_MM = 1;
export const ELLIPSIS = "…";
const RULE_THICKNESS_MM = 0.2;
const RULE_GAP_MM = 1;

/** Kürzt den Text so weit, dass er samt Auslassungszeichen in die Breite passt. */
function fitText(text: string, maxWidthMm: number, weight: FontWeight, options: TableOptions): string {
	const width = (candidate: string) => options.metrics.widthMm(candidate, weight, options.sizePt);
	if (width(text) <= maxWidthMm) return text;
	const chars = Array.from(text);
	const shortened = (count: number) => chars.slice(0, count).join("").trimEnd() + ELLIPSIS;
	let low = 0;
	let high = chars.length;
	while (low < high) {
		const middle = Math.ceil((low + high) / 2);
		if (width(shortened(middle)) <= maxWidthMm) low = middle;
		else high = middle - 1;
	}
	return low === 0 && width(ELLIPSIS) > maxWidthMm ? "" : shortened(low);
}

function rowOps(cells: string[], topMm: number, weight: FontWeight, options: TableOptions): TextOp[] {
	const baselineMm = topMm + options.metrics.ascentMm(weight, options.sizePt);
	let columnX = options.xMm;
	return options.columns.flatMap((column, index) => {
		const left = columnX;
		columnX += column.widthMm;
		const text = fitText(cells[index] ?? "", column.widthMm - 2 * CELL_PADDING_MM, weight, options);
		if (text === "") return [];
		const textWidth = options.metrics.widthMm(text, weight, options.sizePt);
		const xMm =
			column.align === "left" ? left + CELL_PADDING_MM : left + column.widthMm - CELL_PADDING_MM - textWidth;
		return [{ kind: "text", text, font: weight, sizePt: options.sizePt, xMm, baselineMm }];
	});
}

function headerRule(yMm: number, options: TableOptions): LineOp {
	const widthMm = options.columns.reduce((sum, column) => sum + column.widthMm, 0);
	return {
		kind: "line",
		x1Mm: options.xMm,
		y1Mm: yMm,
		x2Mm: options.xMm + widthMm,
		y2Mm: yMm,
		thicknessMm: RULE_THICKNESS_MM
	};
}

export function layoutTable(options: TableOptions): TableLayout {
	const rowHeightMm = ptToMm(options.sizePt) * (options.rowGapFactor ?? DEFAULT_ROW_GAP_FACTOR);
	const headerHeightMm = rowHeightMm + RULE_GAP_MM;
	const headers = options.columns.map((column) => column.header);
	const pages: DrawOp[][] = [];
	let page: DrawOp[] = [];
	let cursorMm = options.firstPageTopMm ?? options.topMm;

	const startPage = (topMm: number) => {
		page = [...rowOps(headers, topMm, options.headerWeight, options), headerRule(topMm + rowHeightMm, options)];
		pages.push(page);
		cursorMm = topMm + headerHeightMm;
	};
	const rowFits = (topMm: number) => topMm + rowHeightMm <= options.bottomMm;

	// Passt auf der ersten Seite keine Zeile mehr, bleibt sie leer.
	if (options.rows.length > 0 && !rowFits(cursorMm + headerHeightMm)) {
		pages.push([]);
		cursorMm = options.topMm;
	}
	startPage(cursorMm);
	for (const row of options.rows) {
		if (!rowFits(cursorMm)) startPage(options.topMm);
		page.push(...rowOps(row, cursorMm, options.bodyWeight, options));
		cursorMm += rowHeightMm;
	}
	return { pages, endMm: cursorMm };
}
