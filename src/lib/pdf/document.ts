// Zeichenbefehle als PDF (A4 Hochformat); y der Befehle zählt in mm von der Oberkante.
import fontkit from "@cantoo/fontkit";
import { PDFDocument, PrintScaling, rgb, type PDFFont, type PDFImage, type PDFPage } from "@cantoo/pdf-lib";
import type { FontBytes } from "$lib/certificates/fonts";
import {
	MM_PER_PT,
	PAGE_HEIGHT_MM,
	PAGE_WIDTH_MM,
	type FontWeight,
	type SignatureSlot
} from "$lib/certificates/layout";
import type { DrawOp, ImageOp, LineOp, TextOp } from "$lib/certificates/render";

export interface PdfAssets {
	fonts: FontBytes;
	images: Partial<Record<SignatureSlot, Uint8Array>>;
}

export interface PdfMeta {
	title: string;
}

const PDF_CREATOR = "Wettkampftools";
const PDF_LANGUAGE = "de-DE";
const BLACK = rgb(0, 0, 0);
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];

export function mmToPt(mm: number): number {
	return mm / MM_PER_PT;
}

const PAGE_WIDTH_PT = mmToPt(PAGE_WIDTH_MM);
const PAGE_HEIGHT_PT = mmToPt(PAGE_HEIGHT_MM);

/** y von der Oberkante (mm) in PDF-Punkte von der Unterkante */
const pdfY = (yMm: number): number => PAGE_HEIGHT_PT - mmToPt(yMm);

interface Resources {
	fonts: Map<FontWeight, PDFFont>;
	images: Map<SignatureSlot, PDFImage>;
}

const startsWith = (bytes: Uint8Array, signature: number[]): boolean =>
	signature.every((byte, index) => bytes[index] === byte);

async function embedImage(pdf: PDFDocument, bytes: Uint8Array): Promise<PDFImage> {
	if (startsWith(bytes, PNG_SIGNATURE)) return pdf.embedPng(bytes);
	if (startsWith(bytes, JPEG_SIGNATURE)) return pdf.embedJpg(bytes);
	throw new Error("Das Unterschriftsbild ist kein PNG oder JPEG. Bitte ein anderes Bild wählen.");
}

async function embedResources(pdf: PDFDocument, ops: DrawOp[], assets: PdfAssets): Promise<Resources> {
	const weights = new Set<FontWeight>();
	const slots = new Set<SignatureSlot>();
	for (const op of ops) {
		if (op.kind === "text") weights.add(op.font);
		if (op.kind === "image" && assets.images[op.slot]) slots.add(op.slot);
	}
	const fonts = await Promise.all(
		[...weights].map(async (weight) => [weight, await pdf.embedFont(assets.fonts[weight], { subset: false })] as const)
	);
	const images = await Promise.all(
		[...slots].map(async (slot) => [slot, await embedImage(pdf, assets.images[slot]!)] as const)
	);
	return { fonts: new Map(fonts), images: new Map(images) };
}

function drawText(page: PDFPage, op: TextOp, resources: Resources): void {
	page.drawText(op.text, {
		x: mmToPt(op.xMm),
		y: pdfY(op.baselineMm),
		size: op.sizePt,
		font: resources.fonts.get(op.font),
		color: BLACK
	});
}

function drawImage(page: PDFPage, op: ImageOp, resources: Resources): void {
	const image = resources.images.get(op.slot);
	if (!image) return;
	page.drawImage(image, {
		x: mmToPt(op.xMm),
		y: pdfY(op.topMm + op.heightMm),
		width: mmToPt(op.widthMm),
		height: mmToPt(op.heightMm)
	});
}

function drawLine(page: PDFPage, op: LineOp): void {
	page.drawLine({
		start: { x: mmToPt(op.x1Mm), y: pdfY(op.y1Mm) },
		end: { x: mmToPt(op.x2Mm), y: pdfY(op.y2Mm) },
		thickness: mmToPt(op.thicknessMm),
		color: BLACK
	});
}

function drawOp(page: PDFPage, op: DrawOp, resources: Resources): void {
	switch (op.kind) {
		case "text":
			return drawText(page, op, resources);
		case "image":
			return drawImage(page, op, resources);
		case "line":
			return drawLine(page, op);
	}
}

function applyMeta(pdf: PDFDocument, meta: PdfMeta): void {
	pdf.setTitle(meta.title);
	pdf.setCreator(PDF_CREATOR);
	pdf.setLanguage(PDF_LANGUAGE);
	// Ohne Skalierung drucken, damit Vordrucke exakt getroffen werden.
	pdf.catalog.getOrCreateViewerPreferences().setPrintScaling(PrintScaling.None);
}

export async function renderPdf(pages: DrawOp[][], assets: PdfAssets, meta: PdfMeta): Promise<Uint8Array> {
	const pdf = await PDFDocument.create();
	pdf.registerFontkit(fontkit);
	applyMeta(pdf, meta);
	const resources = await embedResources(pdf, pages.flat(), assets);
	for (const ops of pages) {
		const page = pdf.addPage([PAGE_WIDTH_PT, PAGE_HEIGHT_PT]);
		for (const op of ops) drawOp(page, op, resources);
	}
	return pdf.save();
}
