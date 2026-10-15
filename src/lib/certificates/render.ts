// Seitenaufbau als Zeichenbefehle; y wird von der Oberkante der Seite in mm gemessen.
import type { TextMetrics } from "./fonts";
import type { FontWeight, ImageObject, Layout, SignatureSlot, TextObject } from "./layout";
import { fillTemplate, placeholderKeysIn, type PlaceholderValues } from "./layoutTemplate";

export interface TextOp {
	kind: "text";
	text: string;
	font: FontWeight;
	sizePt: number;
	xMm: number;
	baselineMm: number;
}

export interface ImageOp {
	kind: "image";
	slot: SignatureSlot;
	xMm: number;
	topMm: number;
	widthMm: number;
	heightMm: number;
}

export interface LineOp {
	kind: "line";
	x1Mm: number;
	y1Mm: number;
	x2Mm: number;
	y2Mm: number;
	thicknessMm: number;
}

export type DrawOp = TextOp | ImageOp | LineOp;

export interface OffsetMm {
	x: number;
	y: number;
}

export interface RenderOptions {
	withMemberNames: boolean;
	offsetMm: OffsetMm;
	availableSlots: ReadonlySet<SignatureSlot>;
}

const SHRINK_STEP_PT = 0.5;

interface Segment {
	text: string;
	font: FontWeight;
}

export function shiftOp(op: DrawOp, offset: OffsetMm): DrawOp {
	switch (op.kind) {
		case "text":
			return {
				...op,
				xMm: op.xMm + offset.x,
				baselineMm: op.baselineMm + offset.y
			};
		case "image":
			return { ...op, xMm: op.xMm + offset.x, topMm: op.topMm + offset.y };
		case "line":
			return {
				...op,
				x1Mm: op.x1Mm + offset.x,
				y1Mm: op.y1Mm + offset.y,
				x2Mm: op.x2Mm + offset.x,
				y2Mm: op.y2Mm + offset.y
			};
	}
}

// Vorlage mit Platzhaltern, die alle leer sind, z. B. "({gliederung})" ohne Gliederung.
function onlyEmptyPlaceholders(template: string, values: PlaceholderValues): boolean {
	const keys = placeholderKeysIn(template);
	return keys.length > 0 && keys.every((key) => values[key]?.trim() === "");
}

function segmentsOf(object: TextObject, values: PlaceholderValues): Segment[] {
	if (onlyEmptyPlaceholders(object.template, values)) return [];
	const segments = fillTemplate(object.template, values).map((run) => ({
		text: run.text,
		font: run.bold ? object.boldFont : object.font
	}));
	const first = segments.findIndex((segment) => segment.text.trim() !== "");
	if (first < 0) return [];
	const last = segments.findLastIndex((segment) => segment.text.trim() !== "");
	const visible = segments.slice(first, last + 1);
	// Nur äußere Leerzeichen entfernen, damit die Ausrichtung stimmt.
	visible[0].text = visible[0].text.trimStart();
	visible[visible.length - 1].text = visible[visible.length - 1].text.trimEnd();
	return visible;
}

function totalWidth(segments: Segment[], sizePt: number, metrics: TextMetrics): number {
	return segments.reduce((sum, segment) => sum + metrics.widthMm(segment.text, segment.font, sizePt), 0);
}

function fittingSize(object: TextObject, segments: Segment[], metrics: TextMetrics): number {
	let size = object.sizePt;
	while (size > object.minSizePt && totalWidth(segments, size, metrics) > object.widthMm) {
		size = Math.max(object.minSizePt, size - SHRINK_STEP_PT);
	}
	return size;
}

function alignedStart(object: TextObject, width: number): number {
	switch (object.align) {
		case "left":
			return object.xMm;
		case "center":
			return object.xMm + (object.widthMm - width) / 2;
		case "right":
			return object.xMm + object.widthMm - width;
	}
}

function textOps(object: TextObject, values: PlaceholderValues, metrics: TextMetrics): TextOp[] {
	const segments = segmentsOf(object, values);
	if (segments.length === 0) return [];
	const sizePt = fittingSize(object, segments, metrics);
	let xMm = alignedStart(object, totalWidth(segments, sizePt, metrics));
	return segments.map((segment) => {
		const op: TextOp = {
			kind: "text",
			text: segment.text,
			font: segment.font,
			sizePt,
			xMm,
			baselineMm: object.yMm
		};
		xMm += metrics.widthMm(segment.text, segment.font, sizePt);
		return op;
	});
}

function imageOps(object: ImageObject, options: RenderOptions): ImageOp[] {
	if (!options.availableSlots.has(object.slot)) return [];
	const { slot, xMm, yMm, widthMm, heightMm } = object;
	return [{ kind: "image", slot, xMm, topMm: yMm, widthMm, heightMm }];
}

export function layoutPage(
	layout: Layout,
	values: PlaceholderValues,
	options: RenderOptions,
	metrics: TextMetrics
): DrawOp[] {
	const ops = layout.objects.flatMap((object): DrawOp[] => {
		if (object.kind === "image") return imageOps(object, options);
		if (object.visibleWhen === "withMemberNames" && !options.withMemberNames) return [];
		return textOps(object, values, metrics);
	});
	return ops.map((op) => shiftOp(op, options.offsetMm));
}
