import {
	LAYOUT_SCHEMA_VERSION,
	ptToMm,
	type FontWeight,
	type ImageObject,
	type Layout,
	type LayoutSet,
	type LayoutVariant,
	type SignatureSlot,
	type TextObject,
	type Visibility
} from "./layout";

// Herleitung aus der Word-Vorlage (document.xml/styles.xml):
// - Seitenränder: oben 5670 Twips = 100 mm, links/rechts 1418 Twips = 25 mm → Satzspiegel 160 mm.
// - Zeilenabstand w:line=288 → Faktor 1,2; Grundlinien-Abstand = Schriftgröße × 1,2.
// - Erste Grundlinie = oberer Rand + Oberlänge von Nunito (1,011 em).
// - Unterschriften: Tabelle mit Spalten 3045/2507/3518 Twips, Bilder als EMU-Maße (1 mm = 36000 EMU),
//   waagerecht relativ zur Spalte. Senkrecht genähert: Bilder knapp unter „Platz", Namen darunter.
const TWIPS_PER_MM = 1440 / 25.4;
const EMU_PER_MM = 36000;
const TOP_MARGIN_MM = 5670 / TWIPS_PER_MM;
const CONTENT_LEFT_MM = 25;
const CONTENT_WIDTH_MM = 160;
const LINE_SPACING = 1.2;
const NUNITO_ASCENT_EM = 1.011;
const MIN_SIZE_FACTOR = 0.7;
const MM_DECIMALS = 100;

const NAME_SIZE_PT = 22;
const MEMBER_SIZE_PT = 16;
const BODY_SIZE_PT = 18;
const PLACE_SIZE_PT = 20;
const SIGNER_SIZE_PT = 10;

const SIGNER1_CELL_TWIPS = 3045;
const SIGNER_GAP_CELL_TWIPS = 2507;
const SIGNER2_CELL_TWIPS = 3518;
const SIGNATURE1_EMU = { offsetX: 457835, width: 1076325, height: 706120 };
const SIGNATURE2_EMU = { offsetX: 3491816, width: 2162175, height: 647700 };
// Abstand Grundlinie „Platz" → Oberkante der Bilder (Unterlänge + Ankerversatz ≈ 7 mm)
const SIGNATURE_TOP_OFFSET_MM = 10;

interface LineSpec {
	id: string;
	label: string;
	template: string;
	sizePt: number;
	font?: FontWeight;
	visibleWhen?: Visibility;
}

const BLANK_LINE: LineSpec = { id: "", label: "", template: "", sizePt: BODY_SIZE_PT };

const roundMm = (mm: number): number => Math.round(mm * MM_DECIMALS) / MM_DECIMALS;
const lineStepMm = (sizePt: number): number => ptToMm(sizePt * LINE_SPACING);

function textObject(spec: LineSpec, xMm: number, yMm: number, widthMm: number): TextObject {
	return {
		id: spec.id,
		kind: "text",
		label: spec.label,
		xMm: roundMm(xMm),
		yMm: roundMm(yMm),
		widthMm: roundMm(widthMm),
		align: "center",
		font: spec.font ?? "regular",
		boldFont: "black",
		sizePt: spec.sizePt,
		minSizePt: spec.sizePt * MIN_SIZE_FACTOR,
		template: spec.template,
		visibleWhen: spec.visibleWhen ?? "always"
	};
}

function headLines(variant: LayoutVariant): LineSpec[] {
	if (variant === "team") {
		return [
			{ id: "name", label: "Mannschaft", template: "{name}", sizePt: NAME_SIZE_PT, font: "black" },
			{
				id: "member",
				label: "Mitglied",
				template: "{mitglied}",
				sizePt: MEMBER_SIZE_PT,
				font: "bold",
				visibleWhen: "withMemberNames"
			}
		];
	}
	return [
		{ id: "name", label: "Name", template: "{name}", sizePt: NAME_SIZE_PT, font: "black" },
		{ id: "group", label: "Gliederung", template: "({gliederung})", sizePt: BODY_SIZE_PT }
	];
}

const BODY_LINES: LineSpec[] = [
	{ id: "intro", label: "Einleitung", template: "erreichte beim", sizePt: BODY_SIZE_PT },
	{ id: "event", label: "Veranstaltung", template: "**{nr}. {titel}**", sizePt: BODY_SIZE_PT },
	{ id: "host", label: "Ausrichter", template: "der {ausrichter}", sizePt: BODY_SIZE_PT },
	{ id: "date", label: "Datum", template: "am {datum}", sizePt: BODY_SIZE_PT },
	{ id: "venue", label: "Ort", template: "im {ort}", sizePt: BODY_SIZE_PT },
	{ id: "rating", label: "Wertung", template: "in der **{wertung}**", sizePt: BODY_SIZE_PT },
	{ id: "ageGroup", label: "Altersklasse", template: "**{altersklasse} {geschlecht}**", sizePt: BODY_SIZE_PT },
	{ id: "points", label: "Punkte", template: "mit **{wettkampfpunkte}** Punkten", sizePt: BODY_SIZE_PT },
	{ id: "placeIntro", label: "Überleitung", template: "den", sizePt: BODY_SIZE_PT },
	BLANK_LINE,
	{ id: "place", label: "Platzierung", template: "**{platz}. Platz**", sizePt: PLACE_SIZE_PT }
];

function bodyObjects(variant: LayoutVariant): TextObject[] {
	const lines = [...headLines(variant), ...BODY_LINES];
	const objects: TextObject[] = [];
	let baseline = TOP_MARGIN_MM + ptToMm(NAME_SIZE_PT * NUNITO_ASCENT_EM);
	lines.forEach((line, index) => {
		if (index > 0) baseline += lineStepMm(line.sizePt);
		if (line !== BLANK_LINE) objects.push(textObject(line, CONTENT_LEFT_MM, baseline, CONTENT_WIDTH_MM));
	});
	return objects;
}

function signatureImage(slot: SignatureSlot, label: string, emu: typeof SIGNATURE1_EMU, top: number): ImageObject {
	return {
		id: slot,
		kind: "image",
		label,
		slot,
		xMm: roundMm(CONTENT_LEFT_MM + emu.offsetX / EMU_PER_MM),
		yMm: roundMm(top),
		widthMm: roundMm(emu.width / EMU_PER_MM),
		heightMm: roundMm(emu.height / EMU_PER_MM)
	};
}

function signerTexts(number: 1 | 2, xMm: number, widthMm: number, baseline: number): TextObject[] {
	const step = lineStepMm(SIGNER_SIZE_PT);
	const signer = (id: string, label: string, template: string, y: number) =>
		textObject({ id, label, template, sizePt: SIGNER_SIZE_PT, font: "light" }, xMm, y, widthMm);
	return [
		signer(`signer${number}Name`, `Unterzeichner ${number}`, `{unterzeichner${number}}`, baseline),
		signer(`signer${number}Role`, `Funktion ${number}`, `({funktion${number}})`, baseline + step)
	];
}

function signatureObjects(placeBaseline: number): (TextObject | ImageObject)[] {
	const top = placeBaseline + SIGNATURE_TOP_OFFSET_MM;
	const images = [
		signatureImage("signature1", "Unterschrift 1", SIGNATURE1_EMU, top),
		signatureImage("signature2", "Unterschrift 2", SIGNATURE2_EMU, top)
	];
	const tallest = Math.max(...images.map((image) => image.heightMm));
	const nameBaseline = top + tallest + lineStepMm(SIGNER_SIZE_PT);
	const signer2Left = CONTENT_LEFT_MM + (SIGNER1_CELL_TWIPS + SIGNER_GAP_CELL_TWIPS) / TWIPS_PER_MM;
	return [
		...images,
		...signerTexts(1, CONTENT_LEFT_MM, SIGNER1_CELL_TWIPS / TWIPS_PER_MM, nameBaseline),
		...signerTexts(2, signer2Left, SIGNER2_CELL_TWIPS / TWIPS_PER_MM, nameBaseline)
	];
}

function defaultLayout(variant: LayoutVariant): Layout {
	const body = bodyObjects(variant);
	const placeBaseline = body[body.length - 1].yMm;
	return {
		schemaVersion: LAYOUT_SCHEMA_VERSION,
		variant,
		objects: [...body, ...signatureObjects(placeBaseline)]
	};
}

export function defaultLayouts(): LayoutSet {
	return { team: defaultLayout("team"), individual: defaultLayout("individual") };
}
