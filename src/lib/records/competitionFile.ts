// Bestehende JAuswertung-Wettkampfdatei (.wk) fürs neue Jahr: Strafenkatalog und Rec-Werte ersetzen.
// Geändert wird nur der Text dieser beiden Blöcke; alles andere bleibt zeichengenau erhalten.
import { strToU8, unzipSync, zipSync, type Unzipped } from "fflate";
import { DATA_ENTRY, directChild, directChildren } from "$lib/io/rulebook";
import { catalogListXml, readCatalogElement, type PenaltyCatalog } from "./penaltyCatalog";
import {
	readRulebookElementRecords,
	recKey,
	updateRulebookText,
	type RecUpdate,
	type RulebookRecord
} from "./rulebookRecords";
import { findElementSpan, type TextSpan } from "./xmlSpan";
import { checkBlockReferences } from "./xstreamReferences";

export interface CompetitionUpdate {
	catalog: PenaltyCatalog;
	/** Aufbau des Vereins-Regelwerks; die Wettkampfdatei muss dazu passen. */
	clubRecords: readonly RulebookRecord[];
	updates: readonly RecUpdate[];
	description: string;
}

export type CompetitionOutcome =
	{ ok: true; bytes: Uint8Array; teams: number; ageGroups: number } | { ok: false; message: string };

const TEAM_ROOT = "MannschaftWettkampf";
const SINGLE_ROOT = "EinzelWettkampf";
const CATALOG_TAG = "strafen";
const RULEBOOK_TAG = "aks";
const CATALOG_INDENT_DEPTH = 2;

const NOT_COMPETITION = "Die Datei ist keine JAuswertung-Wettkampfdatei.";
const SINGLE =
	"Das ist ein Einzelwettkampf. Der Strafenkatalog des Vereins gilt für Mannschaftswettkämpfe; " +
	"für Einzelwettkämpfe wäre ein eigener Katalog nötig.";
const ENCODING = "Die Wettkampfdatei ist nicht im erwarteten Format (UTF-8) gespeichert und wird nicht verändert.";
const ASSIGNED =
	"Es sind bereits Strafen vergeben. Bitte in JAuswertung zuerst alle Mannschaften und Ergebnisse des Vorjahres " +
	"entfernen und speichern – oder einen neuen Wettkampf mit dem neuen Regelwerk anlegen.";
const LINKED =
	"Der Strafenkatalog ist in dieser Datei mit anderen Daten verknüpft und kann nicht sicher ersetzt werden. " +
	"Meist liegt das an Strafen aus dem Vorjahr: bitte in JAuswertung alle Mannschaften entfernen und speichern.";
const UNRESOLVED =
	"Die Wettkampfdatei enthält Verknüpfungen, die die App nicht auflösen kann. Sie wird deshalb nicht verändert.";
const CHECK_FAILED = "Die Kontrolle der neuen Wettkampfdatei ist fehlgeschlagen. Es wurde nichts gespeichert.";
const mismatch = (ageGroup: string): string =>
	`Die Altersklassen oder Disziplinen der Wettkampfdatei passen nicht zum Vereins-Regelwerk (${ageGroup}). ` +
	"Bitte das passende Vereins-Regelwerk laden.";

/** Abbruch mit Begründung für den Anwender. */
class Rejection extends Error {}

interface OpenedCompetition {
	entries: Unzipped;
	xml: string;
	root: Element;
}

function openCompetition(bytes: Uint8Array): OpenedCompetition {
	let entries: Unzipped;
	try {
		entries = unzipSync(bytes);
	} catch {
		throw new Rejection(NOT_COMPETITION);
	}
	if (!entries[DATA_ENTRY]) throw new Rejection(NOT_COMPETITION);
	let xml: string;
	try {
		xml = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(entries[DATA_ENTRY]);
	} catch {
		throw new Rejection(ENCODING);
	}
	const doc = new DOMParser().parseFromString(xml, "application/xml");
	if (doc.getElementsByTagName("parsererror").length > 0) throw new Rejection(NOT_COMPETITION);
	const root = doc.documentElement;
	if (root.nodeName === SINGLE_ROOT) throw new Rejection(SINGLE);
	if (root.nodeName !== TEAM_ROOT) throw new Rejection(NOT_COMPETITION);
	return { entries, xml, root };
}

function requireChild(root: Element, tag: string): Element {
	const child = directChild(root, tag);
	if (!child) throw new Rejection(NOT_COMPETITION);
	return child;
}

/** Vergebene Strafen: jede Strafe außerhalb des Katalogs und nicht leere allgemeine Strafen. */
function hasAssignedPenalties(root: Element, catalog: Element): boolean {
	const outside = Array.from(root.getElementsByTagName("Strafe")).some((p) => !catalog.contains(p));
	const general = Array.from(root.getElementsByTagName("allgemeineStrafen")).some((g) => g.children.length > 0);
	return outside || general;
}

function checkCatalogReplaceable(root: Element): void {
	const catalog = requireChild(root, CATALOG_TAG);
	if (hasAssignedPenalties(root, catalog)) throw new Rejection(ASSIGNED);
	const references = checkBlockReferences(root, catalog);
	if (references === "unresolved") throw new Rejection(UNRESOLVED);
	if (references !== "ok") throw new Rejection(LINKED);
}

function readRecords(aks: Element): RulebookRecord[] {
	try {
		return readRulebookElementRecords(aks);
	} catch {
		throw new Rejection(NOT_COMPETITION);
	}
}

/** Gleiche Altersklassen, Listen und Disziplinen in gleicher Reihenfolge wie im Vereins-Regelwerk. */
function checkStructure(records: readonly RulebookRecord[], club: readonly RulebookRecord[]): void {
	const shape = (r: RulebookRecord) => `${recKey(r)}|${r.discipline}`;
	const index = records.findIndex((r, i) => club[i] === undefined || shape(r) !== shape(club[i]));
	if (index >= 0) throw new Rejection(mismatch(records[index].ageGroup));
	if (club.length !== records.length) throw new Rejection(mismatch(club[records.length].ageGroup));
}

interface Replacement {
	span: TextSpan;
	text: string;
}

function spanOf(xml: string, tag: string): TextSpan {
	let span: TextSpan | null;
	try {
		span = findElementSpan(xml, [TEAM_ROOT, tag]);
	} catch {
		span = null;
	}
	if (span === null) throw new Rejection(NOT_COMPETITION);
	return span;
}

function catalogReplacement(xml: string, catalog: PenaltyCatalog): Replacement {
	const text = `<${CATALOG_TAG}>\n${catalogListXml(catalog, CATALOG_INDENT_DEPTH)}\n  </${CATALOG_TAG}>`;
	return { span: spanOf(xml, CATALOG_TAG), text };
}

function rulebookReplacement(opened: OpenedCompetition, update: CompetitionUpdate): Replacement {
	const aks = requireChild(opened.root, RULEBOOK_TAG);
	checkStructure(readRecords(aks), update.clubRecords);
	const span = spanOf(opened.xml, RULEBOOK_TAG);
	const original = opened.xml.slice(span.start, span.end);
	const text = updateRulebookText(original, aks, update.updates, update.description, `</${RULEBOOK_TAG}>`);
	return { span, text };
}

/** Von hinten nach vorn, damit die Positionen davor gültig bleiben. */
function applyReplacements(xml: string, replacements: Replacement[]): string {
	return [...replacements]
		.sort((a, b) => b.span.start - a.span.start)
		.reduce((text, { span, text: inner }) => text.slice(0, span.start) + inner + text.slice(span.end), xml);
}

const teamCount = (root: Element): number =>
	Array.from(root.getElementsByTagName("Mannschaft")).filter((t) => !t.hasAttribute("reference")).length;

const ageGroupCount = (root: Element): number => {
	const list = directChild(requireChild(root, RULEBOOK_TAG), RULEBOOK_TAG);
	return list ? directChildren(list, "Altersklasse").length : 0;
};

function expectedRecords(club: readonly RulebookRecord[], updates: readonly RecUpdate[]): string {
	const values = new Map(updates.map((u) => [recKey(u), u.rec]));
	return JSON.stringify(club.map((r) => ({ ...r, rec: values.get(recKey(r)) ?? r.rec })));
}

/** Kontroll-Einlesen: wohlgeformt, Katalog und Rec-Werte wie gewünscht, Mannschaften und AKs unverändert. */
function verifyWritten(
	bytes: Uint8Array,
	before: Element,
	expected: { catalog: PenaltyCatalog; records?: string }
): void {
	const after = openCompetition(bytes).root;
	const catalog = JSON.stringify(readCatalogElement(requireChild(after, CATALOG_TAG)));
	const records = JSON.stringify(readRecords(requireChild(after, RULEBOOK_TAG)));
	const ok =
		catalog === JSON.stringify(expected.catalog) &&
		(expected.records === undefined || records === expected.records) &&
		teamCount(after) === teamCount(before) &&
		ageGroupCount(after) === ageGroupCount(before);
	if (!ok) throw new Rejection(CHECK_FAILED);
}

function rewrite(bytes: Uint8Array, catalog: PenaltyCatalog, update: CompetitionUpdate | null): CompetitionOutcome {
	try {
		const opened = openCompetition(bytes);
		checkCatalogReplaceable(opened.root);
		const replacements = [catalogReplacement(opened.xml, catalog)];
		if (update) replacements.push(rulebookReplacement(opened, update));
		const xml = applyReplacements(opened.xml, replacements);
		const written = zipSync({ ...opened.entries, [DATA_ENTRY]: strToU8(xml) });
		const records = update ? expectedRecords(update.clubRecords, update.updates) : undefined;
		verifyWritten(written, opened.root, { catalog, records });
		return { ok: true, bytes: written, teams: teamCount(opened.root), ageGroups: ageGroupCount(opened.root) };
	} catch (error) {
		return { ok: false, message: error instanceof Rejection ? error.message : CHECK_FAILED };
	}
}

/** Ersetzt nur den Strafenkatalog. */
export function replaceCompetitionPenalties(bytes: Uint8Array, catalog: PenaltyCatalog): CompetitionOutcome {
	return rewrite(bytes, catalog, null);
}

/** Ersetzt Strafenkatalog sowie Rec-Werte und Beschreibung des eingebetteten Regelwerks. */
export function updateCompetitionFile(bytes: Uint8Array, update: CompetitionUpdate): CompetitionOutcome {
	return rewrite(bytes, update.catalog, update);
}
