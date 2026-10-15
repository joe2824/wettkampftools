// Entfernungen als PDF-Seite im Querformat: Karte links, Übersicht und Tabelle rechts.
import type { TextMetrics } from "$lib/certificates/fonts";
import { mapDrawOps } from "$lib/certificates/mapRender";
import type { DrawOp } from "$lib/certificates/render";
import { formatKm } from "$lib/format/distance";
import type { PageSizeMm } from "$lib/pdf/document";
import { layoutTable, type TableColumn } from "$lib/pdf/table";
import { paragraphOps } from "$lib/pdf/text";
import type { DistanceRow } from "./matching";
import { distanceOverview } from "./overview";

export const MAP_PAGE_SIZE: PageSizeMm = { widthMm: 297, heightMm: 210 };

const MARGIN_MM = 15;
const TITLE = "Anreise nach Bad Nauheim";
const TITLE_SIZE_PT = 18;
const BODY_SIZE_PT = 10;
const LEGEND_SIZE_PT = 8;
const MAP_BOX = { x: MARGIN_MM, y: 28, width: 125, height: 165 };
const LEGEND_TOP_MM = 196;
const COLUMN_LEFT_MM = 155;
const COLUMN_WIDTH_MM = MAP_PAGE_SIZE.widthMm - MARGIN_MM - COLUMN_LEFT_MM;
const BLOCK_GAP_MM = 4;
const LEGEND = "Stern: Bad Nauheim · Punkte: teilnehmende Gliederungen";
const COLUMNS: TableColumn[] = [
	{ header: "Platz", widthMm: 14, align: "right" },
	{ header: "Gliederung", widthMm: COLUMN_WIDTH_MM - 44, align: "left" },
	{ header: "Entfernung (km)", widthMm: 30, align: "right" }
];

function overviewLines(rows: readonly DistanceRow[]): string[] {
	const overview = distanceOverview(rows);
	const lines = [`Gliederungen: ${overview.count}`];
	if (overview.farthest) {
		lines.push(`Weiteste Anreise: ${overview.farthest.name} (${formatKm(overview.farthest.km)} km)`);
	}
	if (overview.averageKm !== null) lines.push(`Durchschnitt: ${formatKm(overview.averageKm)} km`);
	if (overview.states.length > 0) {
		lines.push(`Bundesländer (${overview.states.length}): ${overview.states.join(", ")}`);
	}
	return lines;
}

function text(content: string, topMm: number, xMm: number, sizePt: number, metrics: TextMetrics, bold = false) {
	return paragraphOps({
		text: content,
		xMm,
		topMm,
		widthMm: COLUMN_WIDTH_MM,
		weight: bold ? "bold" : "regular",
		sizePt,
		metrics
	});
}

/** Erste Seite mit Karte; lange Tabellen laufen auf Folgeseiten weiter. */
export function distanceMapPages(rows: readonly DistanceRow[], metrics: TextMetrics): DrawOp[][] {
	const title = text(TITLE, MARGIN_MM, MARGIN_MM, TITLE_SIZE_PT, metrics, true);
	const markers = rows.map((row) => ({ name: row.name, position: row.position }));
	const legend = text(LEGEND, LEGEND_TOP_MM, MARGIN_MM, LEGEND_SIZE_PT, metrics);
	const firstPage: DrawOp[] = [...title.ops, ...mapDrawOps(MAP_BOX, markers, null), ...legend.ops];
	let cursorMm = MAP_BOX.y;
	for (const line of overviewLines(rows)) {
		const paragraph = text(line, cursorMm, COLUMN_LEFT_MM, BODY_SIZE_PT, metrics);
		firstPage.push(...paragraph.ops);
		cursorMm = paragraph.endMm;
	}
	const table = layoutTable({
		columns: COLUMNS,
		rows: rows.map((row, index) => [String(index + 1), row.name, formatKm(row.km)]),
		xMm: COLUMN_LEFT_MM,
		topMm: MARGIN_MM,
		firstPageTopMm: cursorMm + BLOCK_GAP_MM,
		bottomMm: MAP_PAGE_SIZE.heightMm - MARGIN_MM,
		sizePt: BODY_SIZE_PT,
		headerWeight: "bold",
		bodyWeight: "regular",
		metrics
	});
	const [tableFirst, ...tableRest] = table.pages;
	return [[...firstPage, ...tableFirst], ...tableRest];
}
