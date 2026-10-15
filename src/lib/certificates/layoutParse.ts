import {
	FONT_WEIGHTS,
	IMAGE_OBJECT_KEYS,
	LAYOUT_KEYS,
	LAYOUT_SCHEMA_VERSION,
	LAYOUT_VARIANTS,
	MAP_OBJECT_KEYS,
	MAX_FONT_PT,
	MAX_TEMPLATE_LENGTH,
	MIN_EXTENT_MM,
	MIN_FONT_PT,
	PAGE_HEIGHT_MM,
	PAGE_WIDTH_MM,
	SIGNATURE_SLOTS,
	TEXT_ALIGNS,
	TEXT_OBJECT_KEYS,
	VISIBILITIES,
	type ImageObject,
	type Layout,
	type LayoutObject,
	type LayoutSet,
	type LayoutVariant,
	type MapObject,
	type TextObject
} from "./layout";
import { defaultLayouts } from "./layoutDefaults";

// Import nur über Positivliste: Bilder (Unterschriften, Hintergrund) gehören nie zum Layout.
const MAX_ID_LENGTH = 64;
const MAX_LABEL_LENGTH = 100;
const DATA_URI_PATTERN = /data:[a-z]+\/[a-z0-9.+-]+[;,]/i;

const VARIANT_NAMES: Record<LayoutVariant, string> = { team: "Mannschaft", individual: "Einzel" };

export interface LayoutParseResult {
	layouts: LayoutSet;
	issues: string[];
}

type Fields = Record<string, unknown>;

const isRecord = (value: unknown): value is Fields =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

const extraKeys = (record: Fields, allowed: readonly string[]): string[] =>
	Object.keys(record).filter((key) => !allowed.includes(key));

function readNumber(value: unknown): number | undefined {
	return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readString(value: unknown, maxLength: number, allowEmpty: boolean): string | undefined {
	if (typeof value !== "string" || value.length > maxLength) return undefined;
	if (!allowEmpty && value.length === 0) return undefined;
	return DATA_URI_PATTERN.test(value) ? undefined : value;
}

function readEnum<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
	return allowed.find((candidate) => candidate === value);
}

function hasAll<T extends object>(fields: { [K in keyof T]: T[K] | undefined }): fields is T {
	return Object.values(fields).every((value) => value !== undefined);
}

function parseTextObject(raw: Fields): TextObject | undefined {
	const fields = {
		id: readString(raw.id, MAX_ID_LENGTH, false),
		kind: "text" as const,
		label: readString(raw.label, MAX_LABEL_LENGTH, true),
		xMm: readNumber(raw.xMm),
		yMm: readNumber(raw.yMm),
		widthMm: readNumber(raw.widthMm),
		align: readEnum(raw.align, TEXT_ALIGNS),
		font: readEnum(raw.font, FONT_WEIGHTS),
		boldFont: readEnum(raw.boldFont, FONT_WEIGHTS),
		sizePt: readNumber(raw.sizePt),
		minSizePt: readNumber(raw.minSizePt),
		template: readString(raw.template, MAX_TEMPLATE_LENGTH, true),
		visibleWhen: readEnum(raw.visibleWhen, VISIBILITIES)
	};
	if (!hasAll<TextObject>(fields)) return undefined;
	const xMm = clamp(fields.xMm, 0, PAGE_WIDTH_MM - MIN_EXTENT_MM);
	const sizePt = clamp(fields.sizePt, MIN_FONT_PT, MAX_FONT_PT);
	return {
		...fields,
		xMm,
		yMm: clamp(fields.yMm, 0, PAGE_HEIGHT_MM),
		widthMm: clamp(fields.widthMm, MIN_EXTENT_MM, PAGE_WIDTH_MM - xMm),
		sizePt,
		minSizePt: clamp(fields.minSizePt, MIN_FONT_PT, sizePt)
	};
}

interface BoxFields {
	xMm: number;
	yMm: number;
	widthMm: number;
	heightMm: number;
}

/** Rechteck vollständig auf der Seite */
function clampBox<T extends BoxFields>(fields: T): T {
	const xMm = clamp(fields.xMm, 0, PAGE_WIDTH_MM - MIN_EXTENT_MM);
	const yMm = clamp(fields.yMm, 0, PAGE_HEIGHT_MM - MIN_EXTENT_MM);
	return {
		...fields,
		xMm,
		yMm,
		widthMm: clamp(fields.widthMm, MIN_EXTENT_MM, PAGE_WIDTH_MM - xMm),
		heightMm: clamp(fields.heightMm, MIN_EXTENT_MM, PAGE_HEIGHT_MM - yMm)
	};
}

const readBox = (raw: Fields) => ({
	xMm: readNumber(raw.xMm),
	yMm: readNumber(raw.yMm),
	widthMm: readNumber(raw.widthMm),
	heightMm: readNumber(raw.heightMm)
});

function parseImageObject(raw: Fields): ImageObject | undefined {
	const fields = {
		id: readString(raw.id, MAX_ID_LENGTH, false),
		kind: "image" as const,
		label: readString(raw.label, MAX_LABEL_LENGTH, true),
		slot: readEnum(raw.slot, SIGNATURE_SLOTS),
		...readBox(raw)
	};
	return hasAll<ImageObject>(fields) ? clampBox(fields) : undefined;
}

const readBoolean = (value: unknown): boolean | undefined => (typeof value === "boolean" ? value : undefined);

function parseMapObject(raw: Fields): MapObject | undefined {
	const fields = {
		id: readString(raw.id, MAX_ID_LENGTH, false),
		kind: "map" as const,
		label: readString(raw.label, MAX_LABEL_LENGTH, true),
		...readBox(raw),
		highlightOwn: readBoolean(raw.highlightOwn)
	};
	if (!hasAll<Omit<MapObject, "visible">>(fields)) return undefined;
	if (raw.visible === undefined) return clampBox(fields);
	const visible = readBoolean(raw.visible);
	return visible === undefined ? undefined : clampBox({ ...fields, visible });
}

const OBJECT_KEYS = { text: TEXT_OBJECT_KEYS, image: IMAGE_OBJECT_KEYS, map: MAP_OBJECT_KEYS } as const;
const PARSERS = { text: parseTextObject, image: parseImageObject, map: parseMapObject } as const;
type ObjectKind = keyof typeof OBJECT_KEYS;

const isObjectKind = (kind: unknown): kind is ObjectKind =>
	typeof kind === "string" && Object.hasOwn(OBJECT_KEYS, kind);

/** Gruppe ist freiwillig; eine ungültige Angabe verwirft das Element. */
function readGroup(raw: Fields): { groupId?: string } | undefined {
	if (raw.groupId === undefined) return {};
	const groupId = readString(raw.groupId, MAX_ID_LENGTH, false);
	return groupId === undefined ? undefined : { groupId };
}

function parseObject(raw: unknown): LayoutObject | undefined {
	if (!isRecord(raw) || !isObjectKind(raw.kind)) return undefined;
	if (extraKeys(raw, OBJECT_KEYS[raw.kind]).length > 0) return undefined;
	const group = readGroup(raw);
	const object = group && PARSERS[raw.kind](raw);
	return object && { ...object, ...group };
}

function parseObjects(rawObjects: unknown[], variantName: string, issues: string[]): LayoutObject[] {
	const objects: LayoutObject[] = [];
	const ids = new Set<string>();
	const slots = new Set<string>();
	rawObjects.forEach((raw, index) => {
		const object = parseObject(raw);
		const position = `Element ${index + 1} im Layout „${variantName}"`;
		if (!object) {
			issues.push(`${position} ist ungültig und wurde verworfen.`);
		} else if (ids.has(object.id) || (object.kind === "image" && slots.has(object.slot))) {
			issues.push(`${position} ist doppelt vorhanden und wurde verworfen.`);
		} else {
			ids.add(object.id);
			if (object.kind === "image") slots.add(object.slot);
			objects.push(object);
		}
	});
	return objects;
}

function parseLayout(raw: unknown, variant: LayoutVariant, fallback: Layout, issues: string[]): Layout {
	const variantName = VARIANT_NAMES[variant];
	const valid =
		isRecord(raw) &&
		raw.schemaVersion === LAYOUT_SCHEMA_VERSION &&
		raw.variant === variant &&
		Array.isArray(raw.objects);
	if (!valid) {
		issues.push(`Das Layout „${variantName}" fehlt oder ist ungültig. Es wird der Standard verwendet.`);
		return fallback;
	}
	if (extraKeys(raw, LAYOUT_KEYS).length > 0) {
		issues.push(`Unbekannte Angaben im Layout „${variantName}" wurden ignoriert.`);
	}
	return {
		schemaVersion: LAYOUT_SCHEMA_VERSION,
		variant,
		objects: parseObjects(raw.objects as unknown[], variantName, issues)
	};
}

export function parseLayoutSet(input: unknown): LayoutParseResult {
	const defaults = defaultLayouts();
	if (!isRecord(input)) {
		return { layouts: defaults, issues: ["Die Layout-Datei ist ungültig. Es wird der Standard verwendet."] };
	}
	const issues: string[] = [];
	if (extraKeys(input, LAYOUT_VARIANTS).length > 0) {
		issues.push("Unbekannte Angaben in der Layout-Datei wurden ignoriert.");
	}
	return {
		layouts: {
			team: parseLayout(input.team, "team", defaults.team, issues),
			individual: parseLayout(input.individual, "individual", defaults.individual, issues)
		},
		issues
	};
}

function pick(source: object, keys: readonly string[]): Fields {
	const record = source as Fields;
	return Object.fromEntries(keys.map((key) => [key, record[key]]));
}

const withoutUndefined = (fields: Fields): Fields =>
	Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined));

function serializeLayout(layout: Layout): Fields {
	return {
		schemaVersion: LAYOUT_SCHEMA_VERSION,
		variant: layout.variant,
		objects: layout.objects.map((object) => withoutUndefined(pick(object, OBJECT_KEYS[object.kind])))
	};
}

export function serializeLayoutSet(set: LayoutSet): Record<LayoutVariant, Fields> {
	return { team: serializeLayout(set.team), individual: serializeLayout(set.individual) };
}
