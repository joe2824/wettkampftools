// Urkunden- und Kalibrierungs-PDF aus Layout, Seitenwerten und Schriften.
import { renderPdf, type PdfAssets } from "$lib/pdf/document";
import { calibrationPage } from "./calibration";
import { createMetrics, type FontBytes, type TextMetrics } from "./fonts";
import { SIGNATURE_SLOTS, type Layout, type SignatureSlot } from "./layout";
import type { CertificatePage } from "./model";
import { layoutPage, type DrawOp, type OffsetMm } from "./render";

export interface CertificatePdfInput {
	pages: readonly CertificatePage[];
	layout: Layout;
	withMemberNames: boolean;
	offsetMm: OffsetMm;
	fonts: FontBytes;
	images: Partial<Record<SignatureSlot, Uint8Array>>;
}

const CERTIFICATES_TITLE = "Urkunden";
const CALIBRATION_TITLE = "Kalibrierungsseite";
const NO_PAGES_ERROR = "Es sind keine Urkunden ausgewählt.";

/** Zeichenbefehle je Urkunde; Unterschriften nur, wenn ein Bild hinterlegt ist. */
export function certificatePageOps(input: Omit<CertificatePdfInput, "fonts">, metrics: TextMetrics): DrawOp[][] {
	const availableSlots = new Set(SIGNATURE_SLOTS.filter((slot) => input.images[slot] !== undefined));
	const options = { withMemberNames: input.withMemberNames, offsetMm: input.offsetMm, availableSlots };
	return input.pages.map((page) => layoutPage(input.layout, page.values, options, metrics));
}

export function buildCertificatesPdf(input: CertificatePdfInput): Promise<Uint8Array> {
	if (input.pages.length === 0) return Promise.reject(new Error(NO_PAGES_ERROR));
	const pages = certificatePageOps(input, createMetrics(input.fonts));
	const assets: PdfAssets = { fonts: input.fonts, images: input.images };
	return renderPdf(pages, assets, { title: CERTIFICATES_TITLE });
}

export function buildCalibrationPdf(offsetMm: OffsetMm, fonts: FontBytes): Promise<Uint8Array> {
	const page = calibrationPage(offsetMm, createMetrics(fonts));
	return renderPdf([page], { fonts, images: {} }, { title: CALIBRATION_TITLE });
}
