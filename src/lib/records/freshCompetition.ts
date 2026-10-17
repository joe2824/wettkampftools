// Frische JAuswertung-Wettkampfdatei (.wk) fürs neue Jahr aus der Datei des Vorjahres: Regelwerk,
// Strafenkatalog und Eigenschaften neu, Bahn-Einstellungen und Logo bleiben, Mannschaften, Läufe,
// Ergebnisse, Strafen, Einsprüche und Kampfrichter sind leer. Umgebaut wird im DOM; XStream liest
// Leerraum nicht, und die Listen je Altersklasse werden passend zum neuen Regelwerk neu aufgebaut.
import { strToU8, unzipSync, zipSync, type Unzipped } from "fflate";
import { DATA_ENTRY, directChild, directChildren } from "$lib/io/rulebook";
import { catalogListXml, readCatalogElement, type PenaltyCatalog } from "./penaltyCatalog";
import { resolveReference } from "./xstreamReferences";

export interface CompetitionProperties {
	/** Anzeigename in JAuswertung, z. B. „39. Wellenwettkampf“. */
	name: string;
	/** Datum als TT.MM.JJJJ oder leer. */
	date: string;
	year: number;
	/** Ausrichter und Veranstalter; leer lässt die bisherigen Werte stehen. */
	host: string;
}

export interface FreshCompetitionInput {
	/** Wettkampfdatei des Vorjahres, Zustand egal. */
	previous: Uint8Array;
	/** Neues Vereins-Regelwerk (.rwm) mit den neuen Rec-Werten. */
	rulebook: Uint8Array;
	catalog: PenaltyCatalog;
	properties: CompetitionProperties;
	now: Date;
}

export type FreshCompetitionOutcome =
	{ ok: true; bytes: Uint8Array; ageGroups: number; hasLogo: boolean } | { ok: false; message: string };

const TEAM_ROOT = "MannschaftWettkampf";
const SINGLE_ROOT = "EinzelWettkampf";
const RULEBOOK_ROOT = "Altersklassen";
const RULEBOOK_TAG = "aks";
const CATALOG_TAG = "strafen";
const LOGO_ENTRY = "logo.png";
const XML_HEADER = '<?xml version="1.0" encoding="UTF-8"?>';
const GENDERS = 2;
const DEFAULT_PAUSE_RESTART = 480;
const CATALOG_INDENT_DEPTH = 2;

const NOT_COMPETITION = "Die Datei ist keine JAuswertung-Wettkampfdatei.";
const SINGLE = "Das ist ein Einzelwettkampf. Die Wettkampfdatei fürs neue Jahr braucht einen Mannschaftswettkampf.";
const ENCODING = "Die Wettkampfdatei ist nicht im erwarteten Format (UTF-8) gespeichert.";
const NOT_RULEBOOK = "Das Vereins-Regelwerk konnte nicht gelesen werden.";
const UNRESOLVED =
	"Die Wettkampfdatei enthält Verknüpfungen, die die App nicht auflösen kann. Es wurde keine neue Datei erzeugt.";
const CHECK_FAILED = "Die Kontrolle der neuen Wettkampfdatei ist fehlgeschlagen. Es wurde nichts gespeichert.";
const unknownPerGroupList = (tag: string): string =>
	`Die Wettkampfdatei enthält eine Liste je Altersklasse, die die App nicht kennt („${tag}“), und das neue Regelwerk ` +
	"hat eine andere Zahl von Altersklassen. Bitte den Wettkampf in JAuswertung neu anlegen und das Regelwerk dort wählen.";

/** Listen je Altersklasse, die die App beim Wechsel der Altersklassen neu aufbaut. */
const KNOWN_PER_GROUP = new Set(["disciplinesAgeGroupComplete", "hlwAkComplete", "empty"]);
const KNOWN_PER_GROUP_PROPERTIES = new Set(["HlwPauseAgegroups", "HlwPauseRestarts"]);
/** Blöcke, deren Kinderzahl zufällig der Zahl der Altersklassen gleichen darf. */
const NOT_PER_GROUP = new Set([RULEBOOK_TAG, "laufliste", CATALOG_TAG, "schwimmer", "properties", "lastcomplete"]);

/** Abbruch mit Begründung für den Anwender. */
class Rejection extends Error {}

interface Opened {
	entries: Unzipped;
	doc: XMLDocument;
	root: Element;
}

function parseXml(xml: string, failure: string): XMLDocument {
	const doc = new DOMParser().parseFromString(xml, "application/xml");
	if (doc.getElementsByTagName("parsererror").length > 0) throw new Rejection(failure);
	return doc;
}

function decode(bytes: Uint8Array, failure: string): string {
	try {
		return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
	} catch {
		throw new Rejection(failure);
	}
}

function unzip(bytes: Uint8Array, failure: string): Unzipped {
	try {
		const entries = unzipSync(bytes);
		if (!entries[DATA_ENTRY]) throw new Rejection(failure);
		return entries;
	} catch (error) {
		throw error instanceof Rejection ? error : new Rejection(failure);
	}
}

function openCompetition(bytes: Uint8Array): Opened {
	const entries = unzip(bytes, NOT_COMPETITION);
	const doc = parseXml(decode(entries[DATA_ENTRY], ENCODING), NOT_COMPETITION);
	const root = doc.documentElement;
	if (root.nodeName === SINGLE_ROOT) throw new Rejection(SINGLE);
	if (root.nodeName !== TEAM_ROOT) throw new Rejection(NOT_COMPETITION);
	return { entries, doc, root };
}

function openRulebook(bytes: Uint8Array): Element {
	const entries = unzip(bytes, NOT_RULEBOOK);
	const root = parseXml(decode(entries[DATA_ENTRY], NOT_RULEBOOK), NOT_RULEBOOK).documentElement;
	if (root.nodeName !== RULEBOOK_ROOT || !directChild(root, RULEBOOK_TAG)) throw new Rejection(NOT_RULEBOOK);
	return root;
}

function requireChild(parent: Element, tag: string): Element {
	const child = directChild(parent, tag);
	if (!child) throw new Rejection(NOT_COMPETITION);
	return child;
}

function clear(element: Element | undefined): void {
	while (element?.firstChild) element.removeChild(element.firstChild);
}

/** Alle Kinder durch Importe aus einem anderen Dokument ersetzen. */
function replaceChildren(target: Element, sources: readonly Element[]): void {
	clear(target);
	for (const source of sources) target.appendChild(target.ownerDocument.importNode(source, true));
}

/**
 * Das eingebettete Regelwerk bekommt den Inhalt des .rwm-Wurzelelements. Felder, die nur die
 * Wettkampfdatei kennt (etwa `translations` neuerer Versionen), bleiben aus der alten Datei stehen.
 */
function replaceRulebook(root: Element, rulebook: Element): void {
	const aks = requireChild(root, RULEBOOK_TAG);
	const kept = Array.from(aks.children).filter((old) => !directChild(rulebook, old.nodeName));
	replaceChildren(aks, Array.from(rulebook.children));
	for (const element of kept) aks.appendChild(element);
}

function replaceCatalog(root: Element, catalog: PenaltyCatalog): void {
	const block = requireChild(root, CATALOG_TAG);
	const list = parseXml(catalogListXml(catalog, CATALOG_INDENT_DEPTH), CHECK_FAILED).documentElement;
	replaceChildren(block, [list]);
}

/** Läufe, Lauf-Verteilung und Modus zurück auf den Stand einer neuen Datei; die Verweise bleiben. */
function clearHeats(root: Element): void {
	const heats = requireChild(root, "laufliste");
	for (const child of Array.from(heats.children)) {
		if (child.nodeName === "laufliste" || child.nodeName === "verteilung2") clear(child);
		if (child.nodeName === "mode") child.textContent = "0";
	}
}

function clearTeamsAndRecords(root: Element): void {
	for (const tag of ["schwimmer", "einsprueche", "zielrichterentscheide"]) clear(directChild(root, tag));
	clear(directChild(directChild(root, "timelimits") ?? root, "limits"));
	clear(directChild(directChild(root, "startnummern") ?? root, "recycler"));
	const judges = directChild(root, "kampfrichter");
	for (const unit of judges ? Array.from(judges.getElementsByTagName("Kampfrichtereinheit")) : []) {
		clear(directChild(unit, "positionen"));
		clear(directChild(unit, "kampfrichter"));
	}
}

/** Disziplinen je Altersklasse: das Maximum der beiden Listen. */
function disciplineCounts(rulebook: Element): number[] {
	const list = requireChild(rulebook, RULEBOOK_TAG);
	return directChildren(list, "Altersklasse").map((group) => {
		const lists = directChild(group, "disziplinen");
		const arrays = lists ? directChildren(lists, "Disziplin-array") : [];
		return Math.max(0, ...arrays.map((array) => directChildren(array, "Disziplin").length));
	});
}

// createElementNS statt createElement: in HTML-nahen DOMs bekämen neue Elemente sonst Großschreibung und XHTML-Namensraum.
function fill(doc: XMLDocument, parent: Element, tag: string, values: readonly string[]): void {
	clear(parent);
	for (const value of values) {
		const element = doc.createElementNS(null, tag);
		element.textContent = value;
		parent.appendChild(element);
	}
}

function booleanArray(doc: XMLDocument, value: boolean): Element {
	const array = doc.createElementNS(null, "boolean-array");
	fill(
		doc,
		array,
		"boolean",
		Array.from({ length: GENDERS }, () => String(value))
	);
	return array;
}

/** Fortschrittslisten je Altersklasse, Disziplin und Geschlecht wie in einer frisch angelegten Datei. */
function rebuildProgress(doc: XMLDocument, root: Element, counts: readonly number[]): void {
	const complete = directChild(root, "disciplinesComplete");
	if (complete)
		fill(
			doc,
			complete,
			"boolean",
			Array.from({ length: Math.max(0, ...counts) }, () => "true")
		);
	const perGroup = directChild(root, "disciplinesAgeGroupComplete");
	if (perGroup) {
		clear(perGroup);
		for (const count of counts) {
			const matrix = doc.createElementNS(null, "boolean-array-array");
			for (let i = 0; i < count; i++) matrix.appendChild(booleanArray(doc, true));
			perGroup.appendChild(matrix);
		}
	}
	for (const [tag, value] of [
		["hlwAkComplete", true],
		["empty", true]
	] as const) {
		const list = directChild(root, tag);
		if (!list) continue;
		clear(list);
		for (const _ of counts) list.appendChild(booleanArray(doc, value));
	}
	const last = directChild(root, "lastcomplete");
	if (last) fill(doc, last, "int", ["-1", "-1", "-1"]);
	for (const tag of ["updatesDisabled", "changedSinceDisable", "changing"]) {
		const flag = directChild(root, tag);
		if (flag) flag.textContent = "false";
	}
	const filterIndex = directChild(root, "filterindex");
	if (filterIndex) filterIndex.textContent = "0";
}

/** `<entry><string>Schlüssel</string><Wert…/></entry>` der Eigenschaften. */
function propertyValue(root: Element, key: string): Element | undefined {
	const properties = directChild(root, "properties");
	for (const entry of properties ? directChildren(properties, "entry") : []) {
		const [name, value] = Array.from(entry.children);
		if (name?.nodeName === "string" && name.textContent === key && value) return value;
	}
	return undefined;
}

const pad = (value: number, length = 2): string => String(value).padStart(length, "0");

/** „2025-11-15 17:48:05.340 UTC“, wie JAuswertung es schreibt. */
export function formatXstreamDate(date: Date): string {
	const d = date;
	return (
		`${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
		`${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}.${pad(d.getUTCMilliseconds(), 3)} UTC`
	);
}

function setProperty(root: Element, key: string, text: string): void {
	const value = propertyValue(root, key);
	if (value) value.textContent = text;
}

function updateProperties(
	doc: XMLDocument,
	root: Element,
	input: FreshCompetitionInput,
	counts: readonly number[]
): void {
	const { name, date, year, host } = input.properties;
	setProperty(root, "Name", name);
	setProperty(root, "Date", date);
	setProperty(root, "YearOfCompetition", String(year));
	setProperty(root, "LastChange", formatXstreamDate(input.now));
	// Kennungen des Ergebnis-Uploads gehören zum alten Wettkampf; die EDV-Nummer des Vereins bleibt.
	setProperty(root, "UploadId", "");
	setProperty(root, "UploadIndex", "0");
	setProperty(root, "ISCResultUploadCompetitionId", "");
	if (host.trim() !== "") {
		setProperty(root, "Ausrichter", host);
		setProperty(root, "Organizer", host);
	}
	const pauses = propertyValue(root, "HlwPauseAgegroups");
	if (pauses)
		fill(
			doc,
			pauses,
			"boolean",
			counts.map(() => "false")
		);
	const restarts = propertyValue(root, "HlwPauseRestarts");
	if (restarts) {
		const first = directChild(restarts, "int")?.textContent ?? String(DEFAULT_PAUSE_RESTART);
		fill(
			doc,
			restarts,
			"int",
			counts.map(() => first)
		);
	}
}

function serialize(doc: XMLDocument): string {
	const xml = new XMLSerializer().serializeToString(doc);
	return xml.startsWith("<?xml") ? xml : `${XML_HEADER}\n\n${xml}`;
}

/** Jeder XStream-Verweis muss auf ein Element zeigen, sonst öffnet JAuswertung die Datei nicht. */
function checkReferences(root: Element): void {
	for (const element of [root, ...Array.from(root.getElementsByTagName("*"))]) {
		const path = element.getAttribute("reference");
		if (path !== null && resolveReference(element, path) === null) throw new Rejection(UNRESOLVED);
	}
}

const ageGroupCount = (root: Element): number =>
	directChildren(requireChild(requireChild(root, RULEBOOK_TAG), RULEBOOK_TAG), "Altersklasse").length;

/**
 * Eine neuere JAuswertung-Version könnte weitere Listen je Altersklasse führen. Bleibt die Zahl der
 * Altersklassen gleich, passen sie weiter; sonst lieber abbrechen als eine unlesbare Datei schreiben.
 */
function guardUnknownPerGroupLists(root: Element, previousCount: number, nextCount: number): void {
	if (previousCount === nextCount || previousCount === 0) return;
	for (const child of Array.from(root.children)) {
		if (NOT_PER_GROUP.has(child.nodeName) || KNOWN_PER_GROUP.has(child.nodeName)) continue;
		if (child.children.length === previousCount) throw new Rejection(unknownPerGroupList(child.nodeName));
	}
	const properties = directChild(root, "properties");
	for (const entry of properties ? directChildren(properties, "entry") : []) {
		const [name, value] = Array.from(entry.children);
		const key = name?.textContent ?? "";
		if (value && !KNOWN_PER_GROUP_PROPERTIES.has(key) && value.children.length === previousCount) {
			throw new Rejection(unknownPerGroupList(key));
		}
	}
}

/** Kontroll-Einlesen: keine Mannschaft, Regelwerk und Katalog wie gewünscht, alle Verweise auflösbar. */
function verify(bytes: Uint8Array, expected: { ageGroups: number; catalog: PenaltyCatalog; name: string }): void {
	const { root } = openCompetition(bytes);
	const ok =
		root.getElementsByTagName("Mannschaft").length === 0 &&
		ageGroupCount(root) === expected.ageGroups &&
		JSON.stringify(readCatalogElement(requireChild(root, CATALOG_TAG))) === JSON.stringify(expected.catalog) &&
		(propertyValue(root, "Name")?.textContent ?? expected.name) === expected.name;
	if (!ok) throw new Rejection(CHECK_FAILED);
	checkReferences(root);
}

export function buildFreshCompetition(input: FreshCompetitionInput): FreshCompetitionOutcome {
	try {
		const { entries, doc, root } = openCompetition(input.previous);
		const rulebook = openRulebook(input.rulebook);
		checkReferences(root);
		const counts = disciplineCounts(rulebook);
		guardUnknownPerGroupLists(root, ageGroupCount(root), counts.length);
		replaceRulebook(root, rulebook);
		replaceCatalog(root, input.catalog);
		clearHeats(root);
		clearTeamsAndRecords(root);
		rebuildProgress(doc, root, counts);
		updateProperties(doc, root, input, counts);
		const others = Object.fromEntries(Object.entries(entries).filter(([name]) => name !== DATA_ENTRY));
		// data.xml zuerst: JAuswertung liest nur den ersten Eintrag.
		const bytes = zipSync({ [DATA_ENTRY]: strToU8(serialize(doc)), ...others });
		verify(bytes, { ageGroups: counts.length, catalog: input.catalog, name: input.properties.name });
		return { ok: true, bytes, ageGroups: counts.length, hasLogo: LOGO_ENTRY in others };
	} catch (error) {
		return { ok: false, message: error instanceof Rejection ? error.message : CHECK_FAILED };
	}
}
