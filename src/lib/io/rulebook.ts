import { strFromU8, unzipSync } from "fflate";
import type { RulebookAgeGroup, RulebookSummary } from "../settings/settings";

/** Eintrag im .rwm-Archiv mit dem XStream-XML. */
export const DATA_ENTRY = "data.xml";
const ROOT_ELEMENT = "Altersklassen";
const DEFAULT_NAME = "Regelwerk";
const INVALID_MESSAGE = "Die Datei ist kein JAuswertung-Regelwerk.";

/** Datei ist kein lesbares JAuswertung-Regelwerk. */
export class RulebookError extends Error {
	constructor() {
		super(INVALID_MESSAGE);
		this.name = "RulebookError";
	}
}

/** XML-Text aus dem .rwm-Archiv. */
function readDataXml(bytes: Uint8Array): string {
	let entries: Record<string, Uint8Array>;
	try {
		entries = unzipSync(bytes, { filter: (file) => file.name === DATA_ENTRY });
	} catch {
		throw new RulebookError();
	}
	const data = entries[DATA_ENTRY];
	if (!data) throw new RulebookError();
	return strFromU8(data);
}

/** Wurzelelement „Altersklassen“; wirft RulebookError. */
export function parseRulebookRoot(xml: string): Element {
	const doc = new DOMParser().parseFromString(xml, "application/xml");
	const root = doc.documentElement;
	if (!root || root.nodeName !== ROOT_ELEMENT || doc.getElementsByTagName("parsererror").length > 0) {
		throw new RulebookError();
	}
	return root;
}

export function directChild(parent: Element, tag: string): Element | undefined {
	return Array.from(parent.children).find((child) => child.nodeName === tag);
}

export function directChildren(parent: Element, tag: string): Element[] {
	return Array.from(parent.children).filter((child) => child.nodeName === tag);
}

export function childText(parent: Element, tag: string): string {
	return directChild(parent, tag)?.textContent?.trim() ?? "";
}

function childInteger(parent: Element, tag: string): number {
	const text = childText(parent, tag);
	if (!/^\d+$/.test(text)) throw new RulebookError();
	return Number(text);
}

function readAgeGroup(element: Element): RulebookAgeGroup {
	const name = childText(element, "name");
	if (!name) throw new RulebookError();
	return {
		name,
		minMembers: childInteger(element, "minMembers"),
		maxMembers: childInteger(element, "maxMembers")
	};
}

/** Liest Name, Altersklassen und Mitgliedergrenzen aus einer .rwm-Datei. */
export function parseRulebook(bytes: Uint8Array): RulebookSummary {
	const root = parseRulebookRoot(readDataXml(bytes));
	const list = directChild(root, "aks");
	const ageGroups = list ? directChildren(list, "Altersklasse").map(readAgeGroup) : [];
	if (ageGroups.length === 0) throw new RulebookError();
	return { name: childText(root, "beschreibung") || DEFAULT_NAME, ageGroups };
}
