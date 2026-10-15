// JAuswertung-Strafenkatalog (.def): ZIP mit data.xml im XStream-Format.
import { strToU8, unzipSync, zipSync, type Unzipped } from "fflate";
import { decodeText } from "$lib/io/csv";
import { DATA_ENTRY, directChild, directChildren } from "$lib/io/rulebook";

export const PENALTY_KINDS = ["NICHTS", "STRAFPUNKTE", "NICHT_ANGETRETEN", "DISQUALIFIKATION", "AUSSCHLUSS"] as const;
export type PenaltyKind = (typeof PENALTY_KINDS)[number];

export interface Penalty {
	name: string;
	/** Kürzel („shortname“), z. B. „V1“ oder „RW1#2“; leer bei benutzerdefinierten Einträgen. */
	code: string;
	/** Strafart; unbekannte Werte bleiben erhalten und fallen bei der Prüfung auf. */
	kind: string;
	/** Strafpunkte („hoehe“). */
	points: number;
	announcement: string;
}

export interface PenaltyParagraph {
	name: string;
	number: string;
	penalties: Penalty[];
}

export interface PenaltyChapter {
	name: string;
	number: string;
	paragraphs: PenaltyParagraph[];
}

export interface PenaltyCatalog {
	chapters: PenaltyChapter[];
}

const ROOT_ELEMENT = "Strafen";
const LIST_TAG = "strafen";
const XML_HEADER = '<?xml version="1.0" encoding="UTF-8"?>';
const INTEGER = /^-?\d+$/;
const INDENT = "  ";
const REFERENCE_MESSAGE = "Der Katalog enthält Verweise (reference) und kann so nicht eigenständig gelesen werden.";

/** Feldreihenfolge wie bei XStream; andere Felder würden beim Schreiben verloren gehen. */
const PENALTY_FIELDS = ["name", "shortname", "art", "hoehe", "durchsage"];
const PARAGRAPH_FIELDS = ["strafen", "name", "par"];
const CHAPTER_FIELDS = ["paragraphen", "name", "kapitel"];

const KIND_LABELS: Record<string, string> = {
	NICHTS: "Keine Strafe",
	NICHT_ANGETRETEN: "Nicht angetreten",
	DISQUALIFIKATION: "Disqualifikation",
	AUSSCHLUSS: "Ausschluss"
};

/** Datei ist kein lesbarer Strafenkatalog. */
export class PenaltyCatalogError extends Error {
	constructor(message = "Die Datei ist kein JAuswertung-Strafenkatalog.") {
		super(message);
		this.name = "PenaltyCatalogError";
	}
}

export function allPenalties(catalog: PenaltyCatalog): Penalty[] {
	return catalog.chapters.flatMap((chapter) => chapter.paragraphs.flatMap((paragraph) => paragraph.penalties));
}

export function describePenalty({ kind, points }: Pick<Penalty, "kind" | "points">): string {
	if (kind === "STRAFPUNKTE") return `${points} Strafpunkte`;
	return KIND_LABELS[kind] ?? kind;
}

function fieldText(parent: Element, tag: string): string {
	return directChild(parent, tag)?.textContent ?? "";
}

/** Nur die bekannten Felder, keine Verweise: sonst ginge beim Schreiben etwas verloren. */
function checkFields(element: Element, fields: readonly string[]): void {
	if (element.hasAttribute("reference")) throw new PenaltyCatalogError(REFERENCE_MESSAGE);
	if (Array.from(element.children).some((child) => !fields.includes(child.nodeName))) throw new PenaltyCatalogError();
}

function readPenalty(element: Element): Penalty {
	checkFields(element, PENALTY_FIELDS);
	const points = fieldText(element, "hoehe").trim();
	if (!INTEGER.test(points)) throw new PenaltyCatalogError();
	return {
		name: fieldText(element, "name"),
		code: fieldText(element, "shortname"),
		kind: fieldText(element, "art").trim(),
		points: Number(points),
		announcement: fieldText(element, "durchsage")
	};
}

function listItems(parent: Element, listTag: string, itemTag: string): Element[] {
	const list = directChild(parent, listTag);
	if (!list) throw new PenaltyCatalogError();
	if (list.children.length !== directChildren(list, itemTag).length) throw new PenaltyCatalogError();
	return directChildren(list, itemTag);
}

function readParagraph(element: Element): PenaltyParagraph {
	checkFields(element, PARAGRAPH_FIELDS);
	const penalties = listItems(element, "strafen", "Strafe").map(readPenalty);
	return { name: fieldText(element, "name"), number: fieldText(element, "par"), penalties };
}

function readChapter(element: Element): PenaltyChapter {
	checkFields(element, CHAPTER_FIELDS);
	const paragraphs = listItems(element, "paragraphen", "StrafenParagraph").map(readParagraph);
	return { name: fieldText(element, "name"), number: fieldText(element, "kapitel"), paragraphs };
}

/** Katalog aus einem Element der Klasse Strafen (Wurzel der .def oder `<strafen>` in der .wk). */
export function readCatalogElement(element: Element): PenaltyCatalog {
	checkFields(element, [LIST_TAG]);
	return { chapters: listItems(element, LIST_TAG, "StrafenKapitel").map(readChapter) };
}

function unzipCatalog(bytes: Uint8Array): Unzipped {
	try {
		const entries = unzipSync(bytes);
		if (entries[DATA_ENTRY]) return entries;
	} catch {
		// unten einheitlich gemeldet
	}
	throw new PenaltyCatalogError();
}

/** Einige offizielle Dateien sind trotz UTF-8-Kopfzeile in Windows-1252 kodiert. */
export function readPenaltyCatalog(bytes: Uint8Array): PenaltyCatalog {
	const xml = decodeText(unzipCatalog(bytes)[DATA_ENTRY]).text;
	const doc = new DOMParser().parseFromString(xml, "application/xml");
	const root = doc.documentElement;
	if (!root || root.nodeName !== ROOT_ELEMENT || doc.getElementsByTagName("parsererror").length > 0) {
		throw new PenaltyCatalogError();
	}
	return readCatalogElement(root);
}

export function escapeXmlText(text: string): string {
	return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

type XmlNode = string | [tag: string, children: XmlNode[]];

function renderNode(node: XmlNode, depth: number): string {
	if (typeof node === "string") return node;
	const [tag, children] = node;
	const pad = INDENT.repeat(depth);
	if (children.length === 1 && typeof children[0] === "string") return `${pad}<${tag}>${children[0]}</${tag}>`;
	const inner = children.map((child) => `\n${renderNode(child, depth + 1)}`).join("");
	return `${pad}<${tag}>${inner}\n${pad}</${tag}>`;
}

const field = (tag: string, value: string | number): XmlNode => [tag, [escapeXmlText(String(value))]];

const penaltyNode = (p: Penalty): XmlNode => [
	"Strafe",
	[
		field("name", p.name),
		field("shortname", p.code),
		field("art", p.kind),
		field("hoehe", p.points),
		field("durchsage", p.announcement)
	]
];

const paragraphNode = (p: PenaltyParagraph): XmlNode => [
	"StrafenParagraph",
	[["strafen", p.penalties.map(penaltyNode)], field("name", p.name), field("par", p.number)]
];

const chapterNode = (c: PenaltyChapter): XmlNode => [
	"StrafenKapitel",
	[["paragraphen", c.paragraphs.map(paragraphNode)], field("name", c.name), field("kapitel", c.number)]
];

/** Kapitelliste (`<strafen>…</strafen>`) wie von XStream, eingerückt ab `depth`. */
export function catalogListXml(catalog: PenaltyCatalog, depth: number): string {
	return renderNode([LIST_TAG, catalog.chapters.map(chapterNode)], depth);
}

/** data.xml einer eigenständigen .def: ohne Verweise, Wurzel mit version="0". */
export function penaltyCatalogDataXml(catalog: PenaltyCatalog): string {
	return `${XML_HEADER}\n\n<${ROOT_ELEMENT} version="0">\n${catalogListXml(catalog, 1)}\n</${ROOT_ELEMENT}>\n`;
}

/** Neue .def; data.xml kommt zuerst, weil JAuswertung nur den ersten Eintrag liest. */
export function writePenaltyCatalog(originalBytes: Uint8Array, catalog: PenaltyCatalog): Uint8Array {
	const others = Object.entries(unzipCatalog(originalBytes)).filter(([name]) => name !== DATA_ENTRY);
	return zipSync({ [DATA_ENTRY]: strToU8(penaltyCatalogDataXml(catalog)), ...Object.fromEntries(others) });
}
