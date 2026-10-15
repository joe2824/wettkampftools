// Zeichenbefehle als PDF (A4 Hochformat); y der Befehle zählt in mm von der Oberkante.
import fontkit from "@cantoo/fontkit";
import {
	closePath,
	grayscale,
	LineJoinStyle,
	lineTo,
	moveTo,
	PDFDocument,
	PDFOperator,
	PDFOperatorNames,
	popGraphicsState,
	PrintScaling,
	pushGraphicsState,
	rgb,
	setFillingGrayscaleColor,
	setLineJoin,
	setLineWidth,
	setStrokingGrayscaleColor,
	type PDFFont,
	type PDFImage,
	type PDFPage
} from "@cantoo/pdf-lib";
import type { FontBytes } from "$lib/certificates/fonts";
import {
	MM_PER_PT,
	PAGE_HEIGHT_MM,
	PAGE_WIDTH_MM,
	type FontWeight,
	type SignatureSlot
} from "$lib/certificates/layout";
import type { CircleOp, DrawOp, ImageOp, LineOp, PathOp, TextOp } from "$lib/certificates/render";

export interface PdfAssets {
	fonts: FontBytes;
	images: Partial<Record<SignatureSlot, Uint8Array>>;
}

export interface PageSizeMm {
	widthMm: number;
	heightMm: number;
}

export interface PdfMeta {
	title: string;
	/** Ohne Angabe A4 Hochformat */
	pageSize?: PageSizeMm;
}

const PDF_CREATOR = "Wettkampftools";
const PDF_LANGUAGE = "de-DE";
const BLACK = rgb(0, 0, 0);
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const PT_DECIMALS = 100;

export function mmToPt(mm: number): number {
	return mm / MM_PER_PT;
}

const A4_PORTRAIT: PageSizeMm = { widthMm: PAGE_WIDTH_MM, heightMm: PAGE_HEIGHT_MM };

interface Resources {
	fonts: Map<FontWeight, PDFFont>;
	images: Map<SignatureSlot, PDFImage>;
	/** y von der Oberkante (mm) in PDF-Punkte von der Unterkante */
	pdfY: (yMm: number) => number;
}

const startsWith = (bytes: Uint8Array, signature: number[]): boolean =>
	signature.every((byte, index) => bytes[index] === byte);

async function embedImage(pdf: PDFDocument, bytes: Uint8Array): Promise<PDFImage> {
	if (startsWith(bytes, PNG_SIGNATURE)) return pdf.embedPng(bytes);
	if (startsWith(bytes, JPEG_SIGNATURE)) return pdf.embedJpg(bytes);
	throw new Error("Das Unterschriftsbild ist kein PNG oder JPEG. Bitte ein anderes Bild wählen.");
}

async function embedResources(
	pdf: PDFDocument,
	ops: DrawOp[],
	assets: PdfAssets,
	pageHeightMm: number
): Promise<Resources> {
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
	const pdfY = (yMm: number): number => mmToPt(pageHeightMm - yMm);
	return { fonts: new Map(fonts), images: new Map(images), pdfY };
}

function drawText(page: PDFPage, op: TextOp, resources: Resources): void {
	page.drawText(op.text, {
		x: mmToPt(op.xMm),
		y: resources.pdfY(op.baselineMm),
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
		y: resources.pdfY(op.topMm + op.heightMm),
		width: mmToPt(op.widthMm),
		height: mmToPt(op.heightMm)
	});
}

function drawLine(page: PDFPage, op: LineOp, resources: Resources): void {
	page.drawLine({
		start: { x: mmToPt(op.x1Mm), y: resources.pdfY(op.y1Mm) },
		end: { x: mmToPt(op.x2Mm), y: resources.pdfY(op.y2Mm) },
		thickness: mmToPt(op.thicknessMm),
		color: BLACK
	});
}

const PAINT_OPERATORS = {
	fill: PDFOperatorNames.FillEvenOdd,
	stroke: PDFOperatorNames.StrokePath,
	both: PDFOperatorNames.FillEvenOddAndStroke
} as const;

/** Hundertstel Punkt genügen; volle Genauigkeit bläht Seiten mit Karte unnötig auf. */
const roundPt = (pt: number): number => Math.round(pt * PT_DECIMALS) / PT_DECIMALS;

/** Runde Ecken wie in der SVG-Vorschau */
const strokeStyle = (gray: number, widthMm: number) => [
	setStrokingGrayscaleColor(gray),
	setLineWidth(mmToPt(widthMm)),
	setLineJoin(LineJoinStyle.Round)
];

function drawPath(page: PDFPage, op: PathOp, resources: Resources): void {
	const filled = op.fillGray !== null;
	const stroked = op.strokeGray !== null && op.strokeMm > 0;
	if (!filled && !stroked) return;
	const paint = filled && stroked ? "both" : filled ? "fill" : "stroke";
	const outline = op.rings.flatMap((ring) => [
		...ring.map((point, index) =>
			(index === 0 ? moveTo : lineTo)(roundPt(mmToPt(point.x)), roundPt(resources.pdfY(point.y)))
		),
		closePath()
	]);
	page.pushOperators(
		pushGraphicsState(),
		...(filled ? [setFillingGrayscaleColor(op.fillGray!)] : []),
		...(stroked ? strokeStyle(op.strokeGray!, op.strokeMm) : []),
		...outline,
		PDFOperator.of(PAINT_OPERATORS[paint]),
		popGraphicsState()
	);
}

function drawCircle(page: PDFPage, op: CircleOp, resources: Resources): void {
	const stroked = op.strokeGray !== null && op.strokeMm > 0;
	page.drawCircle({
		x: mmToPt(op.cxMm),
		y: resources.pdfY(op.cyMm),
		size: mmToPt(op.rMm),
		color: grayscale(op.fillGray),
		...(stroked ? { borderColor: grayscale(op.strokeGray!), borderWidth: mmToPt(op.strokeMm) } : {})
	});
}

function drawOp(page: PDFPage, op: DrawOp, resources: Resources): void {
	switch (op.kind) {
		case "text":
			return drawText(page, op, resources);
		case "image":
			return drawImage(page, op, resources);
		case "line":
			return drawLine(page, op, resources);
		case "path":
			return drawPath(page, op, resources);
		case "circle":
			return drawCircle(page, op, resources);
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
	const size = meta.pageSize ?? A4_PORTRAIT;
	const resources = await embedResources(pdf, pages.flat(), assets, size.heightMm);
	for (const ops of pages) {
		const page = pdf.addPage([mmToPt(size.widthMm), mmToPt(size.heightMm)]);
		for (const op of ops) drawOp(page, op, resources);
	}
	return pdf.save();
}
