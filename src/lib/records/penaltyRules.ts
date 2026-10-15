// Vereinsregeln für den Strafenkatalog des Wellenwettkampfs und Prüfung eines Katalogs.
import { unzipSync } from "fflate";
import { decodeText } from "$lib/io/csv";
import { DATA_ENTRY } from "$lib/io/rulebook";
import {
	allPenalties,
	describePenalty,
	PENALTY_KINDS,
	PenaltyCatalogError,
	readPenaltyCatalog,
	type Penalty,
	type PenaltyCatalog,
	type PenaltyParagraph
} from "./penaltyCatalog";

export interface ClubPenaltyRules {
	falseStartCode: string;
	falseStartPoints: number;
	waveCode: string;
	waveName: string;
	wavePoints: number;
	/** Anzahl der Varianten „(n. Schwimmer)“ wie bei den offiziellen Mannschafts-Einträgen. */
	waveMemberVariants: number;
	/** Neuer Paragraph für die Wellen-Einträge, im Kapitel des Paragraphen „Disziplin“. */
	waveParagraphName: string;
}

export const DEFAULT_CLUB_PENALTY_RULES: ClubPenaltyRules = {
	falseStartCode: "V1",
	falseStartPoints: 100,
	waveCode: "RW1",
	waveName: "Retten in der Welle: Opfer nicht mit Rautek- oder Schultertragegriff herausgetragen",
	wavePoints: 200,
	waveMemberVariants: 4,
	waveParagraphName: "Wellenwettkampf"
};

type PenaltyValue = Pick<Penalty, "kind" | "points">;

export interface PenaltyChange {
	code: string;
	name: string;
	/** null bei neuen Einträgen. */
	before: PenaltyValue | null;
	after: PenaltyValue;
}

const POINTS_KIND = "STRAFPUNKTE";
const DISQUALIFICATION_CODES = ["S1", "n.b."];
const NOT_STARTED_CODES = ["DNS", "D.N.S.", "n.a."];
const DISCIPLINE_PARAGRAPH = "Disziplin";
const ROOT_VERSION = "0";

const memberName = (name: string, member: number): string => `${name} (${member}. Schwimmer)`;
const memberCode = (code: string, member: number): string => `${code}#${member}`;

/** Erwartete Einträge für „Retten in der Welle“: Grundeintrag und je Schwimmer eine Variante. */
function wavePenalties(rules: ClubPenaltyRules): Penalty[] {
	const base: Penalty = {
		name: rules.waveName,
		code: rules.waveCode,
		kind: POINTS_KIND,
		points: rules.wavePoints,
		announcement: ""
	};
	const members = Array.from({ length: rules.waveMemberVariants }, (_, i) => ({
		...base,
		name: memberName(rules.waveName, i + 1),
		code: memberCode(rules.waveCode, i + 1)
	}));
	return [base, ...members];
}

const cloneCatalog = (catalog: PenaltyCatalog): PenaltyCatalog => structuredClone(catalog);

const sameValue = (a: PenaltyValue, b: PenaltyValue): boolean => a.kind === b.kind && a.points === b.points;

/** Setzt Art und Höhe des ersten Eintrags mit dem Kürzel; gibt die Änderung zurück. */
function setValue(catalog: PenaltyCatalog, code: string, after: PenaltyValue): PenaltyChange | null {
	const penalty = allPenalties(catalog).find((p) => p.code === code);
	if (!penalty || sameValue(penalty, after)) return null;
	const before = { kind: penalty.kind, points: penalty.points };
	Object.assign(penalty, after);
	return { code, name: penalty.name, before, after };
}

function nextNumber(paragraphs: readonly PenaltyParagraph[]): string {
	const numbers = paragraphs.map((p) => Number(p.number)).filter(Number.isInteger);
	return String(Math.max(0, ...numbers) + 1);
}

/** Paragraph für neue Wellen-Einträge: beim vorhandenen Grundeintrag, sonst neu neben „Disziplin“. */
function waveParagraph(catalog: PenaltyCatalog, rules: ClubPenaltyRules): PenaltyParagraph {
	const paragraphs = catalog.chapters.flatMap((c) => c.paragraphs);
	const existing = paragraphs.find((p) => p.penalties.some((x) => x.code === rules.waveCode));
	if (existing) return existing;
	const chapter =
		catalog.chapters.find((c) => c.paragraphs.some((p) => p.name === DISCIPLINE_PARAGRAPH)) ?? catalog.chapters[0];
	if (!chapter) throw new PenaltyCatalogError("Der Strafenkatalog ist leer.");
	const paragraph = { name: rules.waveParagraphName, number: nextNumber(chapter.paragraphs), penalties: [] };
	chapter.paragraphs.push(paragraph);
	return paragraph;
}

/** Wendet die Vereinsregeln auf eine Kopie an; wiederholtes Anwenden ändert nichts mehr. */
export function applyClubPenaltyRules(
	original: PenaltyCatalog,
	rules: ClubPenaltyRules = DEFAULT_CLUB_PENALTY_RULES
): { catalog: PenaltyCatalog; changes: PenaltyChange[] } {
	const catalog = cloneCatalog(original);
	const changes: PenaltyChange[] = [];
	const falseStart = setValue(catalog, rules.falseStartCode, { kind: POINTS_KIND, points: rules.falseStartPoints });
	if (falseStart) changes.push(falseStart);
	const known = new Set(allPenalties(catalog).map((p) => p.code));
	for (const wanted of wavePenalties(rules)) {
		if (known.has(wanted.code)) {
			const change = setValue(catalog, wanted.code, wanted);
			if (change) changes.push(change);
			continue;
		}
		waveParagraph(catalog, rules).penalties.push(wanted);
		changes.push({
			code: wanted.code,
			name: wanted.name,
			before: null,
			after: { kind: wanted.kind, points: wanted.points }
		});
	}
	return { catalog, changes };
}

function generalIssues(penalties: readonly Penalty[]): string[] {
	const issues: string[] = [];
	const seen = new Set<string>();
	const reported = new Set<string>();
	for (const p of penalties) {
		const label = p.code || p.name || "(ohne Kürzel)";
		if (!(PENALTY_KINDS as readonly string[]).includes(p.kind))
			issues.push(`Unbekannte Strafart „${p.kind}“ bei „${label}“.`);
		if (p.points < 0) issues.push(`Negative Strafpunkte bei „${label}“.`);
		if (p.code === "") continue;
		if (seen.has(p.code) && !reported.has(p.code)) {
			issues.push(`Das Kürzel „${p.code}“ kommt mehrfach vor; JAuswertung nimmt nur den ersten Eintrag.`);
			reported.add(p.code);
		}
		seen.add(p.code);
	}
	return issues;
}

function specialCodeIssues(first: ReadonlyMap<string, Penalty>): string[] {
	const issues: string[] = [];
	for (const code of DISQUALIFICATION_CODES) {
		const kind = first.get(code)?.kind;
		if (kind !== undefined && kind !== "DISQUALIFIKATION") issues.push(`„${code}“ muss eine Disqualifikation sein.`);
	}
	for (const code of NOT_STARTED_CODES) {
		const kind = first.get(code)?.kind;
		if (kind !== undefined && kind !== "NICHT_ANGETRETEN") issues.push(`„${code}“ muss „Nicht angetreten“ sein.`);
	}
	return issues;
}

function expectValue(first: ReadonlyMap<string, Penalty>, code: string, wanted: PenaltyValue): string | null {
	const penalty = first.get(code);
	if (!penalty) return `„${code}“ fehlt.`;
	if (sameValue(penalty, wanted)) return null;
	return `„${code}“ soll ${describePenalty(wanted)} geben, ist aber: ${describePenalty(penalty)}.`;
}

function clubRuleIssues(first: ReadonlyMap<string, Penalty>, rules: ClubPenaltyRules): string[] {
	const expected = [
		{ code: rules.falseStartCode, kind: POINTS_KIND, points: rules.falseStartPoints },
		...wavePenalties(rules)
	];
	return expected.map((p) => expectValue(first, p.code, p)).filter((issue): issue is string => issue !== null);
}

/** Inhaltliche Prüfung: Strafarten, eindeutige Kürzel, Sonderkürzel und Vereinsregeln. */
export function verifyPenaltyModel(
	catalog: PenaltyCatalog,
	rules: ClubPenaltyRules = DEFAULT_CLUB_PENALTY_RULES
): string[] {
	const penalties = allPenalties(catalog);
	const first = new Map<string, Penalty>();
	for (const p of penalties) if (p.code !== "" && !first.has(p.code)) first.set(p.code, p);
	return [...generalIssues(penalties), ...specialCodeIssues(first), ...clubRuleIssues(first, rules)];
}

/** Aufbau der Datei: data.xml zuerst, Wurzel mit version="0", keine Verweise. */
function fileIssues(bytes: Uint8Array): string[] {
	const entries = unzipSync(bytes);
	const issues: string[] = [];
	if (Object.keys(entries)[0] !== DATA_ENTRY) issues.push("data.xml muss der erste Eintrag sein.");
	const doc = new DOMParser().parseFromString(decodeText(entries[DATA_ENTRY]).text, "application/xml");
	if (doc.documentElement.getAttribute("version") !== ROOT_VERSION) {
		issues.push('Das Wurzelelement muss <Strafen version="0"> sein.');
	}
	return issues;
}

/** Prüft eine .def-Datei; leere Liste = in Ordnung. */
export function verifyPenaltyCatalog(
	bytes: Uint8Array,
	rules: ClubPenaltyRules = DEFAULT_CLUB_PENALTY_RULES
): string[] {
	let catalog: PenaltyCatalog;
	try {
		catalog = readPenaltyCatalog(bytes);
	} catch (error) {
		return [error instanceof PenaltyCatalogError ? error.message : new PenaltyCatalogError().message];
	}
	return [...fileIssues(bytes), ...verifyPenaltyModel(catalog, rules)];
}
