// Weitere Dateien aus dem App-Datenordner, die ins Projekt gehören: Gliederungswahl der Entfernungen
// und alles für die Rec-Werte. Keine Personendaten; jede Datei wird beim Lesen geprüft.
import { strFromU8 } from "fflate";
import { CHOICES_FILE, parseChoiceMap } from "$lib/distance/matching";
import { parseRulebook } from "$lib/io/rulebook";
import type { AppDataStore } from "$lib/platform/fs";
import { parseBestTimes } from "$lib/records/bestTimes";
import { parseRecMapping } from "$lib/records/mapping";
import {
	bestTimesYearOf,
	CLUB_INFO_PATH,
	CLUB_RULEBOOK_PATH,
	listBestTimePaths,
	MAPPING_PATH,
	OPTIONS_PATH,
	parseWaveSurcharge
} from "$lib/records/storage";
import { isRecord } from "$lib/settings/validate";

/** Pfad im Datenordner → Inhalt. */
export type ProjectData = Record<string, Uint8Array>;

interface DataFile {
	label: string;
	isValid: (bytes: Uint8Array) => boolean;
}

const jsonCheck =
	(parse: (raw: unknown) => unknown) =>
	(bytes: Uint8Array): boolean => {
		try {
			return parse(JSON.parse(strFromU8(bytes))) !== null;
		} catch {
			return false;
		}
	};

function isRulebook(bytes: Uint8Array): boolean {
	try {
		parseRulebook(bytes);
		return true;
	} catch {
		return false;
	}
}

const CLUB_RULEBOOK = "Vereins-Regelwerk";
const FIXED_FILES: Record<string, DataFile> = {
	[CHOICES_FILE]: { label: "Gliederungswahl der Entfernungen", isValid: jsonCheck(parseChoiceMap) },
	[OPTIONS_PATH]: { label: "Zuschlag für die Welle", isValid: jsonCheck(parseWaveSurcharge) },
	[MAPPING_PATH]: { label: "Zuordnung der Rec-Werte", isValid: jsonCheck(parseRecMapping) },
	[CLUB_RULEBOOK_PATH]: { label: CLUB_RULEBOOK, isValid: isRulebook },
	[CLUB_INFO_PATH]: {
		label: CLUB_RULEBOOK,
		isValid: jsonCheck((raw) => (isRecord(raw) && typeof raw.name === "string" ? raw : null))
	}
};

function bestTimesFile(year: number): DataFile {
	return {
		label: `Bestzeiten ${year}`,
		isValid: jsonCheck((raw) => (parseBestTimes(raw)?.year === year ? raw : null))
	};
}

function dataFile(path: string): DataFile | null {
	if (Object.hasOwn(FIXED_FILES, path)) return FIXED_FILES[path];
	const year = bestTimesYearOf(path);
	return year === null ? null : bestTimesFile(year);
}

/** Gehört der Pfad zu den Projektdaten? */
export const isProjectDataPath = (path: string): boolean => dataFile(path) !== null;

/** Bekannter Pfad mit gültigem Inhalt. */
export function isValidProjectData(path: string, bytes: Uint8Array): boolean {
	return dataFile(path)?.isValid(bytes) ?? false;
}

/** Name für Meldungen. */
export function projectDataLabel(path: string): string {
	return dataFile(path)?.label ?? path;
}

/** Alle vorhandenen, gültigen Dateien; kaputte bleiben draußen, damit das Projekt lesbar bleibt. */
export async function collectProjectData(store: AppDataStore): Promise<ProjectData> {
	const paths = [...Object.keys(FIXED_FILES), ...(await listBestTimePaths(store))];
	const data: ProjectData = {};
	for (const path of paths) {
		const bytes = await store.readBytes(path);
		if (bytes !== null && isValidProjectData(path, bytes)) data[path] = bytes;
	}
	return data;
}

/** Schreibt die Dateien des Projekts; andere Dateien im Datenordner bleiben stehen. */
export async function writeProjectData(store: AppDataStore, data: ProjectData): Promise<void> {
	for (const [path, bytes] of Object.entries(data)) await store.writeBytes(path, bytes);
}
