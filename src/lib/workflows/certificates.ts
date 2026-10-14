// Urkunden: PDF erzeugen, speichern und öffnen; Seriendruck-Tabelle als Notlösung.
import { buildCertificatesPdf } from "$lib/certificates/certificatePdf";
import { SIGNATURE_SLOTS, type LayoutSet, type SignatureSlot } from "$lib/certificates/layout";
import { buildCertificatePages, type CertificateEntry } from "$lib/certificates/model";
import { logError, logInfo } from "$lib/log";
import { loadAppFonts } from "$lib/platform/assets";
import { datedFileName, saveFile } from "$lib/platform/files";
import { openOutputFile } from "$lib/platform/output";
import { writeWorkbook } from "$lib/platform/workbook";
import type { Settings } from "$lib/settings/settings";
import { buildAgeGroupOrder } from "$lib/wwk/ageGroups";
import type { CompetitionKind } from "$lib/wwk/results";
import { buildSerialLetterSheet } from "$lib/wwk/serialLetterExport";
import { userMessage } from "./errors";

export const CERTIFICATES_FILE_NAME = "Urkunden.pdf";
export const SERIAL_LETTER_FILE_NAME = "Seriendruck.xlsx";
const PDF_FILTER = { name: "PDF-Datei", extensions: ["pdf"] };
const EXCEL_FILTER = { name: "Excel-Datei", extensions: ["xlsx"] };
const PDF_FAILED = "Das PDF konnte nicht erzeugt werden.";
const SERIAL_LETTER_FAILED = "Die Seriendruck-Tabelle konnte nicht gespeichert werden.";

export interface CertificateJob {
	/** Ausgewählte Einträge in Urkunden-Reihenfolge. */
	entries: readonly CertificateEntry[];
	competition: CompetitionKind;
	settings: Settings;
	layouts: LayoutSet;
	images: Partial<Record<SignatureSlot, Uint8Array | null>>;
}

export type PdfOutcome =
	| { status: "cancelled" }
	| { status: "saved"; path: string; pageCount: number; opened: boolean }
	| { status: "failed"; message: string };

export type SaveOutcome = { status: "cancelled" } | { status: "saved"; path: string } | { status: "failed"; message: string };

function signatureImages(images: CertificateJob["images"]): Partial<Record<SignatureSlot, Uint8Array>> {
	return Object.fromEntries(SIGNATURE_SLOTS.flatMap((slot) => (images[slot] ? [[slot, images[slot]]] : [])));
}

async function renderCertificates(job: CertificateJob): Promise<{ bytes: Uint8Array; pageCount: number }> {
	const { withMemberNames, copiesPerTeam, copiesPerIndividual, printOffsetMm } = job.settings.certificates;
	const options = { competition: job.competition, withMemberNames, copiesPerTeam, copiesPerIndividual };
	const { pages } = buildCertificatePages(job.entries, options, job.settings.event);
	const bytes = await buildCertificatesPdf({
		pages,
		layout: job.layouts[job.competition],
		withMemberNames,
		offsetMm: printOffsetMm,
		fonts: await loadAppFonts(),
		images: signatureImages(job.images)
	});
	return { bytes, pageCount: pages.length };
}

async function tryOpen(path: string): Promise<boolean> {
	try {
		await openOutputFile(path);
		return true;
	} catch {
		logError("certificates.openFailed");
		return false;
	}
}

/** Erzeugt das PDF, fragt nach dem Speicherort und öffnet es danach. */
export async function createCertificatesPdf(job: CertificateJob, now: Date = new Date()): Promise<PdfOutcome> {
	try {
		const { bytes, pageCount } = await renderCertificates(job);
		const path = await saveFile({ defaultName: datedFileName(CERTIFICATES_FILE_NAME, now), filters: [PDF_FILTER], bytes });
		if (path === null) return { status: "cancelled" };
		logInfo("certificates.saved", { entries: job.entries.length, pages: pageCount });
		return { status: "saved", path, pageCount, opened: await tryOpen(path) };
	} catch (error) {
		logError("certificates.failed");
		return { status: "failed", message: userMessage(error, PDF_FAILED) };
	}
}

/** Tabelle für die bisherige Word-Vorlage, sortiert wie die Urkunden. */
export async function saveSerialLetter(
	job: Pick<CertificateJob, "entries" | "competition" | "settings">,
	now: Date = new Date()
): Promise<SaveOutcome> {
	try {
		const rows = job.entries.map((entry) => entry.row);
		const sheet = buildSerialLetterSheet(rows, buildAgeGroupOrder(job.settings), job.competition);
		const bytes = await writeWorkbook([sheet]);
		const path = await saveFile({ defaultName: datedFileName(SERIAL_LETTER_FILE_NAME, now), filters: [EXCEL_FILTER], bytes });
		if (path === null) return { status: "cancelled" };
		logInfo("serialLetter.saved", { rows: rows.length });
		return { status: "saved", path };
	} catch (error) {
		logError("serialLetter.failed");
		return { status: "failed", message: userMessage(error, SERIAL_LETTER_FAILED) };
	}
}
