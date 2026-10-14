// Urkunden-Layout: alle Maße in Millimetern auf A4 (Hochformat).

export const PAGE_WIDTH_MM = 210;
export const PAGE_HEIGHT_MM = 297;
export const MM_PER_PT = 25.4 / 72;
export const LAYOUT_SCHEMA_VERSION = 1;

export const FONT_WEIGHTS = ["light", "regular", "bold", "black"] as const;
export type FontWeight = (typeof FONT_WEIGHTS)[number];

export const TEXT_ALIGNS = ["left", "center", "right"] as const;
export type TextAlign = (typeof TEXT_ALIGNS)[number];

export const VISIBILITIES = ["always", "withMemberNames"] as const;
export type Visibility = (typeof VISIBILITIES)[number];

export const SIGNATURE_SLOTS = ["signature1", "signature2"] as const;
export type SignatureSlot = (typeof SIGNATURE_SLOTS)[number];

export const LAYOUT_VARIANTS = ["team", "individual"] as const;
export type LayoutVariant = (typeof LAYOUT_VARIANTS)[number];

export interface TextObject {
	id: string;
	kind: "text";
	label: string;
	/** Linke Kante des Textrahmens */
	xMm: number;
	/** Grundlinie */
	yMm: number;
	widthMm: number;
	align: TextAlign;
	/** Schnitt für normalen Text */
	font: FontWeight;
	/** Schnitt für **fette** Abschnitte */
	boldFont: FontWeight;
	sizePt: number;
	/** Kleinste Größe beim Verkleinern zu langer Texte */
	minSizePt: number;
	template: string;
	visibleWhen: Visibility;
}

export interface ImageObject {
	id: string;
	kind: "image";
	label: string;
	slot: SignatureSlot;
	xMm: number;
	/** Obere Kante */
	yMm: number;
	widthMm: number;
	heightMm: number;
}

export type LayoutObject = TextObject | ImageObject;

export interface Layout {
	schemaVersion: typeof LAYOUT_SCHEMA_VERSION;
	variant: LayoutVariant;
	objects: LayoutObject[];
}

export type LayoutSet = Record<LayoutVariant, Layout>;

export const TEXT_OBJECT_KEYS = [
	"id",
	"kind",
	"label",
	"xMm",
	"yMm",
	"widthMm",
	"align",
	"font",
	"boldFont",
	"sizePt",
	"minSizePt",
	"template",
	"visibleWhen"
] as const satisfies readonly (keyof TextObject)[];

export const IMAGE_OBJECT_KEYS = [
	"id",
	"kind",
	"label",
	"slot",
	"xMm",
	"yMm",
	"widthMm",
	"heightMm"
] as const satisfies readonly (keyof ImageObject)[];

export const LAYOUT_KEYS = ["schemaVersion", "variant", "objects"] as const satisfies readonly (keyof Layout)[];

export function ptToMm(pt: number): number {
	return pt * MM_PER_PT;
}
