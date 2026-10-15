// Abläufe des Layout-Editors: Vorschau mit Beispieldaten, Export/Import, Hintergrund, Kalibrierung.
import { loadAppFonts } from "$lib/certificates/appFonts";
import { buildCalibrationPdf } from "$lib/certificates/certificatePdf";
import type { TextMetrics } from "$lib/certificates/fonts";
import type { Layout, LayoutSet, LayoutVariant, SignatureSlot } from "$lib/certificates/layout";
import type { PlaceholderValues } from "$lib/certificates/layoutTemplate";
import { IMAGE_FORMAT_ERROR, type ImageSlot } from "$lib/certificates/layoutStore.svelte";
import type { CertificateMapData } from "$lib/certificates/mapRender";
import { placeholderValues, type CertificateEntry } from "$lib/certificates/model";
import { layoutPage, type DrawOp, type OffsetMm } from "$lib/certificates/render";
import { logError, logInfo } from "$lib/log";
import { datedFileName, saveFile } from "$lib/platform/files";
import type { EventInfo } from "$lib/settings/settings";
import { userMessage } from "./errors";
import { openAfterSave, PDF_FILTER } from "./savedFile";

const LAYOUT_EXPORT_NAME = "Urkunden-Layout.json";
const CALIBRATION_FILE_NAME = "Kalibrierungsseite.pdf";
const JSON_FILTER = { name: "Layout-Datei", extensions: ["json"] };
const EXPORT_FAILED = "Die Layout-Datei konnte nicht gespeichert werden.";
const CALIBRATION_FAILED = "Die Kalibrierungsseite konnte nicht erzeugt werden.";
const BACKGROUND_SAVE_ERROR = "Der Hintergrund-Scan konnte nicht gespeichert werden. Bitte erneut versuchen.";
const NO_OFFSET: OffsetMm = { x: 0, y: 0 };

const SAMPLE_MEMBER = "Anna Meier";
const SAMPLE_PLACE = 3;
const SAMPLE_COMPETITION_POINTS = 1234.56;
const SAMPLE_EVENT: EventInfo = {
	number: "12",
	title: "Wellenwettkampf",
	host: "DLRG Musterstadt",
	date: "2026-11-14",
	venue: "Musterstadt",
	signers: [
		{ name: "Max Mustermann", role: "Vorsitzende/r" },
		{ name: "Anna Meier", role: "Wettkampforganisation" }
	]
};

export type FileOutcome =
	{ status: "cancelled" } | { status: "saved"; path: string } | { status: "failed"; message: string };
export type OpenedFileOutcome =
	{ status: "cancelled" } | { status: "saved"; path: string; opened: boolean } | { status: "failed"; message: string };

export interface PreviewOptions {
	withMemberNames: boolean;
	availableSlots: ReadonlySet<SignatureSlot>;
	map?: CertificateMapData;
}

const orSample = (value: string, sample: string): string => (value.trim() === "" ? sample : value);

function sampleEvent(event: EventInfo): EventInfo {
	return {
		number: orSample(event.number, SAMPLE_EVENT.number),
		title: orSample(event.title, SAMPLE_EVENT.title),
		host: orSample(event.host, SAMPLE_EVENT.host),
		date: orSample(event.date, SAMPLE_EVENT.date),
		venue: orSample(event.venue, SAMPLE_EVENT.venue),
		signers: [0, 1].map((index) => ({
			name: orSample(event.signers[index].name, SAMPLE_EVENT.signers[index].name),
			role: orSample(event.signers[index].role, SAMPLE_EVENT.signers[index].role)
		})) as EventInfo["signers"]
	};
}

/** Beispieldaten für die Vorschau; leere Veranstaltungsangaben werden mit Beispielen gefüllt. */
export function sampleValues(variant: LayoutVariant, event: EventInfo): PlaceholderValues {
	const team = variant === "team";
	const entry: CertificateEntry = {
		id: "sample",
		row: {
			sourceRow: 1,
			place: SAMPLE_PLACE,
			name: team ? "Musterstadt 2" : SAMPLE_MEMBER,
			organisation: "Musterstadt",
			ageGroupRaw: "AK 13/14",
			gender: "weiblich",
			competitionPoints: SAMPLE_COMPETITION_POINTS,
			members: team ? [SAMPLE_MEMBER] : []
		},
		ageGroup: "AK 13/14",
		kind: "rescue",
		gender: "weiblich",
		place: SAMPLE_PLACE
	};
	return placeholderValues(entry, sampleEvent(event), team ? SAMPLE_MEMBER : "");
}

/** Dieselben Zeichenbefehle wie im PDF, ohne Druckversatz. */
export function previewOps(
	layout: Layout,
	values: PlaceholderValues,
	options: PreviewOptions,
	metrics: TextMetrics
): DrawOp[] {
	return layoutPage(layout, values, { ...options, offsetMm: NO_OFFSET }, metrics);
}

export async function exportLayout(
	store: { exportLayoutJson(): Uint8Array },
	now: Date = new Date()
): Promise<FileOutcome> {
	try {
		const bytes = store.exportLayoutJson();
		const path = await saveFile({ defaultName: datedFileName(LAYOUT_EXPORT_NAME, now), filters: [JSON_FILTER], bytes });
		if (path === null) return { status: "cancelled" };
		logInfo("layout.exported");
		return { status: "saved", path };
	} catch (error) {
		logError("layout.exportFailed");
		return { status: "failed", message: userMessage(error, EXPORT_FAILED) };
	}
}

/** Liefert die Hinweise; bei leerer Liste wurde alles übernommen. */
export function importLayout(store: { importLayoutJson(bytes: Uint8Array): string[] }, bytes: Uint8Array): string[] {
	const issues = store.importLayoutJson(bytes);
	logInfo("layout.imported", { issues: issues.length });
	return issues;
}

/** Kalibrierungsseite mit dem gespeicherten Versatz erzeugen, speichern und öffnen. */
export async function printCalibration(offsetMm: OffsetMm, now: Date = new Date()): Promise<OpenedFileOutcome> {
	try {
		const bytes = await buildCalibrationPdf(offsetMm, await loadAppFonts());
		const path = await saveFile({
			defaultName: datedFileName(CALIBRATION_FILE_NAME, now),
			filters: [PDF_FILTER],
			bytes
		});
		if (path === null) return { status: "cancelled" };
		logInfo("calibration.saved");
		return { status: "saved", path, opened: await openAfterSave(path, "calibration.openFailed") };
	} catch (error) {
		logError("calibration.failed");
		return { status: "failed", message: userMessage(error, CALIBRATION_FAILED) };
	}
}

/** Liefert eine Fehlermeldung oder null bei Erfolg. */
export async function storeBackground(
	images: { setImage(slot: ImageSlot, bytes: Uint8Array): Promise<void> },
	bytes: Uint8Array
): Promise<string | null> {
	try {
		await images.setImage("background", bytes);
		return null;
	} catch (error) {
		return error instanceof Error && error.message === IMAGE_FORMAT_ERROR ? IMAGE_FORMAT_ERROR : BACKGROUND_SAVE_ERROR;
	}
}

/** Vergleichswert, um Layout-Änderungen zu erkennen. */
export function layoutSnapshot(layouts: LayoutSet): string {
	return JSON.stringify(layouts);
}
