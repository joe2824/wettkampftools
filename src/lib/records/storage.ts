// Dauerhafte Ablage für das Rec-Werte-Werkzeug im App-Datenordner; „Neuer Wettkampf“ lässt sie stehen.
import { appDataStore } from "$lib/platform/fs";
import type { Workbook } from "$lib/platform/workbook";
import { extractBestTimes, parseBestTimes, type BestTimes } from "./bestTimes";
import { DEFAULT_REC_MAPPING, parseRecMapping, type RecMapping } from "./mapping";
import { DEFAULT_WAVE_SURCHARGE_S } from "./proposal";

const DIR = "records";
export const MAPPING_PATH = `${DIR}/mapping.json`;
export const CLUB_RULEBOOK_PATH = `${DIR}/club.rwm`;
export const CLUB_INFO_PATH = `${DIR}/club.json`;
export const OPTIONS_PATH = `${DIR}/options.json`;
const BEST_TIMES_FILE = /^best-times-(\d{4})\.json$/;
const BEST_TIMES_PATH = new RegExp(`^${DIR}/${BEST_TIMES_FILE.source.slice(1)}`);
const bestTimesPath = (year: number): string => `${DIR}/best-times-${year}.json`;

/** Jahr einer Bestzeiten-Datei aus ihrem Pfad im Datenordner, sonst null. */
export function bestTimesYearOf(path: string): number | null {
	const year = BEST_TIMES_PATH.exec(path)?.[1];
	return year === undefined ? null : Number(year);
}

export interface StoredRulebook {
	name: string;
	bytes: Uint8Array;
}

async function readJson(path: string): Promise<unknown> {
	const text = await appDataStore().readText(path);
	if (text === null) return null;
	try {
		return JSON.parse(text);
	} catch {
		return null;
	}
}

const writeJson = (path: string, value: unknown): Promise<void> =>
	appDataStore().writeText(path, JSON.stringify(value, null, 2));

export function saveBestTimes(bestTimes: BestTimes): Promise<void> {
	return writeJson(bestTimesPath(bestTimes.year), bestTimes);
}

/** Bestzeiten einer Ergebnisdatei ablegen; gibt die Zahl der Einträge zurück, ohne Zeiten wird nichts gespeichert. */
export async function rememberBestTimes(workbook: Workbook, year: number): Promise<number> {
	const bestTimes = extractBestTimes(workbook, year);
	if (bestTimes.entries.length > 0) await saveBestTimes(bestTimes);
	return bestTimes.entries.length;
}

export async function loadBestTimes(year: number): Promise<BestTimes | null> {
	return parseBestTimes(await readJson(bestTimesPath(year)));
}

/** Pfade aller Bestzeiten-Dateien im Datenordner. */
export async function listBestTimePaths(store = appDataStore()): Promise<string[]> {
	const names = await store.list(DIR);
	return names.filter((name) => BEST_TIMES_FILE.test(name)).map((name) => `${DIR}/${name}`);
}

/** Jahre mit gespeicherten Bestzeiten, neueste zuerst. */
export async function listBestTimeYears(): Promise<number[]> {
	const years = (await listBestTimePaths()).map(bestTimesYearOf);
	return years.filter((year): year is number => year !== null).sort((a, b) => b - a);
}

export async function loadRecMapping(): Promise<RecMapping> {
	return parseRecMapping(await readJson(MAPPING_PATH)) ?? structuredClone(DEFAULT_REC_MAPPING);
}

export function saveRecMapping(mapping: RecMapping): Promise<void> {
	return writeJson(MAPPING_PATH, mapping);
}

export async function saveClubRulebook({ name, bytes }: StoredRulebook): Promise<void> {
	await appDataStore().writeBytes(CLUB_RULEBOOK_PATH, bytes);
	await writeJson(CLUB_INFO_PATH, { name });
}

export async function loadClubRulebook(): Promise<StoredRulebook | null> {
	const bytes = await appDataStore().readBytes(CLUB_RULEBOOK_PATH);
	if (bytes === null) return null;
	const info = (await readJson(CLUB_INFO_PATH)) as { name?: unknown } | null;
	return { name: typeof info?.name === "string" ? info.name : "Vereins-Regelwerk.rwm", bytes };
}

/** Zuschlag auf die Wellen-Bestzeit; ausgeschaltet gilt die echte Bestzeit. */
export interface WaveSurcharge {
	enabled: boolean;
	seconds: number;
}

const DEFAULT_SURCHARGE: WaveSurcharge = { enabled: true, seconds: DEFAULT_WAVE_SURCHARGE_S };

/** Gespeicherter Zuschlag; null bei ungültigem Inhalt. */
export function parseWaveSurcharge(value: unknown): WaveSurcharge | null {
	if (typeof value !== "object" || value === null) return null;
	const { enabled, seconds } = value as Record<string, unknown>;
	const valid = typeof enabled === "boolean" && typeof seconds === "number" && Number.isFinite(seconds) && seconds >= 0;
	return valid ? { enabled, seconds } : null;
}

export async function loadWaveSurcharge(): Promise<WaveSurcharge> {
	return parseWaveSurcharge(await readJson(OPTIONS_PATH)) ?? { ...DEFAULT_SURCHARGE };
}

export function saveWaveSurcharge(surcharge: WaveSurcharge): Promise<void> {
	return writeJson(OPTIONS_PATH, surcharge);
}
