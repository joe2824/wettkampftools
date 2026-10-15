// Entfernungskarte speichern: als PDF (Querformat, mit Übersicht und Tabelle) oder als PNG-Bild.
import { loadAppFonts } from "$lib/certificates/appFonts";
import { createMetrics } from "$lib/certificates/fonts";
import type { DistanceRow } from "$lib/distance/matching";
import { distanceMapPages, MAP_PAGE_SIZE } from "$lib/distance/mapPdf";
import { distanceMapSvg, MAP_IMAGE_SIZE } from "$lib/distance/mapSvg";
import { logError, logInfo } from "$lib/log";
import { renderPdf } from "$lib/pdf/document";
import { datedFileName, saveFile } from "$lib/platform/files";
import { svgToPng } from "$lib/platform/raster";
import { userMessage } from "./errors";
import { PDF_FILTER } from "./savedFile";

const FILE_NAME = "Anreise-Karte";
const PDF_TITLE = "Anreise nach Bad Nauheim";
const PNG_FILTER = { name: "PNG-Bild", extensions: ["png"] };
const SAVE_FAILED = "Die Karte konnte nicht gespeichert werden.";

export type MapSaveOutcome =
	{ status: "cancelled" } | { status: "saved"; path: string } | { status: "failed"; message: string };

export type Rasterize = (svg: string, widthPx: number, heightPx: number) => Promise<Uint8Array>;

async function store(bytes: Uint8Array, extension: "pdf" | "png", now: Date): Promise<MapSaveOutcome> {
	const filters = [extension === "pdf" ? PDF_FILTER : PNG_FILTER];
	const path = await saveFile({ defaultName: datedFileName(`${FILE_NAME}.${extension}`, now), filters, bytes });
	if (path === null) return { status: "cancelled" };
	logInfo(extension === "pdf" ? "distances.mapPdfSaved" : "distances.mapPngSaved");
	return { status: "saved", path };
}

export async function saveMapPdf(rows: readonly DistanceRow[], now: Date = new Date()): Promise<MapSaveOutcome> {
	try {
		const fonts = await loadAppFonts();
		const pages = distanceMapPages(rows, createMetrics(fonts));
		const bytes = await renderPdf(pages, { fonts, images: {} }, { title: PDF_TITLE, pageSize: MAP_PAGE_SIZE });
		return await store(bytes, "pdf", now);
	} catch (error) {
		logError("distances.mapFailed");
		return { status: "failed", message: userMessage(error, SAVE_FAILED) };
	}
}

/** Umrechnungsfehler kommen vom Browser und sind nicht deutsch: dann der allgemeine Hinweis. */
export async function saveMapPng(
	rows: readonly DistanceRow[],
	rasterize: Rasterize = svgToPng,
	now: Date = new Date()
): Promise<MapSaveOutcome> {
	let bytes: Uint8Array;
	try {
		bytes = await rasterize(distanceMapSvg(rows), MAP_IMAGE_SIZE.width, MAP_IMAGE_SIZE.height);
	} catch {
		logError("distances.mapRasterFailed");
		return { status: "failed", message: SAVE_FAILED };
	}
	try {
		return await store(bytes, "png", now);
	} catch (error) {
		logError("distances.mapFailed");
		return { status: "failed", message: userMessage(error, SAVE_FAILED) };
	}
}
