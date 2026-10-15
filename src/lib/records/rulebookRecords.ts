// Rec-Werte eines JAuswertung-Regelwerks (.rwm) lesen und gezielt ersetzen.
// Je Altersklasse zwei Disziplinlisten: die erste gilt für weiblich, die zweite für männlich
// (im offiziellen DLRG-Regelwerk sind die Rec-Werte der ersten Liste die langsameren).
import { strFromU8, strToU8, unzipSync, zipSync, type Unzipped } from "fflate";
import { childText, DATA_ENTRY, directChild, directChildren, parseRulebookRoot, RulebookError } from "$lib/io/rulebook";

export type RecordGender = "female" | "male";

/** Reihenfolge der Disziplinlisten im Regelwerk. */
export const GENDER_ORDER: readonly RecordGender[] = ["female", "male"];

export interface RecTarget {
	ageGroup: string;
	gender: RecordGender;
	/** Position der Disziplin in der Altersklasse, ab 0. */
	disciplineIndex: number;
}

export interface RulebookRecord extends RecTarget {
	discipline: string;
	/** Hundertstelsekunden. */
	rec: number;
}

export interface RecUpdate extends RecTarget {
	rec: number;
}

interface RecElement {
	record: RulebookRecord;
	element: Element;
}

const INTEGER = /^\d+$/;
const REC_TAG = /<rec>\s*\d+\s*<\/rec>/g;
const DESCRIPTION_TAG = /<beschreibung>[^<]*<\/beschreibung>|<beschreibung\/>/g;
const ROOT_CLOSE = "</Altersklassen>";

export const recKey = ({ ageGroup, gender, disciplineIndex }: RecTarget): string =>
	JSON.stringify([ageGroup, gender, disciplineIndex]);

function readRec(discipline: Element): number {
	const text = childText(discipline, "rec");
	if (!INTEGER.test(text)) throw new RulebookError();
	return Number(text);
}

function ageGroupRecs(group: Element): RecElement[] {
	const ageGroup = childText(group, "name");
	const lists = directChild(group, "disziplinen");
	if (!ageGroup || !lists) throw new RulebookError();
	return directChildren(lists, "Disziplin-array")
		.slice(0, GENDER_ORDER.length)
		.flatMap((list, genderIndex) =>
			directChildren(list, "Disziplin").map((discipline, disciplineIndex) => {
				const element = directChild(discipline, "rec");
				if (!element) throw new RulebookError();
				const gender = GENDER_ORDER[genderIndex];
				const name = childText(discipline, "name");
				const record = { ageGroup, gender, disciplineIndex, discipline: name, rec: readRec(discipline) };
				return { record, element };
			})
		);
}

function collectRecs(root: Element): RecElement[] {
	const list = directChild(root, "aks");
	const groups = list ? directChildren(list, "Altersklasse") : [];
	if (groups.length === 0) throw new RulebookError();
	return groups.flatMap(ageGroupRecs);
}

function unzipRulebook(bytes: Uint8Array): Unzipped {
	try {
		const entries = unzipSync(bytes);
		if (entries[DATA_ENTRY]) return entries;
	} catch {
		// unten einheitlich gemeldet
	}
	throw new RulebookError();
}

/** Rec-Werte eines Regelwerk-Elements: Wurzel der .rwm oder `<aks>` in einer Wettkampfdatei. */
export function readRulebookElementRecords(element: Element): RulebookRecord[] {
	return collectRecs(element).map(({ record }) => record);
}

/** Alle Rec-Werte in der Reihenfolge des Regelwerks. */
export function parseRulebookRecords(bytes: Uint8Array): RulebookRecord[] {
	const xml = strFromU8(unzipRulebook(bytes)[DATA_ENTRY]);
	return readRulebookElementRecords(parseRulebookRoot(xml));
}

/** Altersklassen, in denen jede Strafe zur Disqualifikation führt (soll im Verein nirgends so sein). */
export function disqualifyingAgeGroups(bytes: Uint8Array): string[] {
	const root = parseRulebookRoot(strFromU8(unzipRulebook(bytes)[DATA_ENTRY]));
	const list = directChild(root, "aks");
	const groups = list ? directChildren(list, "Altersklasse") : [];
	return groups
		.filter((group) => childText(group, "strafeIstDisqualifikation") === "true")
		.map((group) => childText(group, "name"));
}

function escapeXml(text: string): string {
	return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Neue Werte in Dokumentreihenfolge; prüft, dass jedes <rec> zu einer Disziplin gehört. */
function newRecValues(root: Element, updates: readonly RecUpdate[]): number[] {
	const recs = collectRecs(root);
	const all = Array.from(root.getElementsByTagName("rec"));
	if (all.length !== recs.length || recs.some(({ element }, i) => all[i] !== element)) throw new RulebookError();
	const indexByKey = new Map(recs.map(({ record }, i) => [recKey(record), i]));
	const values = recs.map(({ record }) => record.rec);
	for (const update of updates) {
		const index = indexByKey.get(recKey(update));
		if (index === undefined) throw new RangeError(`Unbekannte Disziplin: ${update.ageGroup}`);
		if (!Number.isInteger(update.rec) || update.rec <= 0) throw new RangeError("Ungültiger Rec-Wert.");
		values[index] = update.rec;
	}
	return values;
}

function replaceRecs(xml: string, values: number[]): string {
	let index = 0;
	const result = xml.replace(REC_TAG, () => `<rec>${values[index++]}</rec>`);
	if (index !== values.length) throw new RulebookError();
	return result;
}

function replaceDescription(xml: string, description: string, closeTag: string): string {
	const tag = `<beschreibung>${escapeXml(description)}</beschreibung>`;
	const count = xml.match(DESCRIPTION_TAG)?.length ?? 0;
	if (count > 1) throw new RulebookError();
	if (count === 1) return xml.replace(DESCRIPTION_TAG, () => tag);
	const close = xml.lastIndexOf(closeTag);
	if (close < 0) throw new RulebookError();
	return `${xml.slice(0, close)}  ${tag}\n${xml.slice(close)}`;
}

/**
 * Ersetzt Rec-Werte und Beschreibung im Text eines Regelwerk-Elements. `element` ist
 * dasselbe Element geparst und sichert ab, dass jedes <rec> zu einer Disziplin gehört.
 */
export function updateRulebookText(
	text: string,
	element: Element,
	updates: readonly RecUpdate[],
	description: string,
	closeTag: string
): string {
	const values = newRecValues(element, updates);
	return replaceDescription(replaceRecs(text, values), description, closeTag);
}

/**
 * Neues .rwm mit geänderten Rec-Werten und Beschreibung. Ersetzt wird im Text,
 * damit Aufbau und Formatierung für JAuswertung unverändert bleiben.
 */
export function writeRulebookRecords(
	bytes: Uint8Array,
	updates: readonly RecUpdate[],
	description: string
): Uint8Array {
	const entries = unzipRulebook(bytes);
	const xml = strFromU8(entries[DATA_ENTRY]);
	const updated = updateRulebookText(xml, parseRulebookRoot(xml), updates, description, ROOT_CLOSE);
	return zipSync({ ...entries, [DATA_ENTRY]: strToU8(updated) });
}
