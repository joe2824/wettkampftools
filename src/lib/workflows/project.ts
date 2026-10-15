// Projekt speichern und öffnen: der ganze Wettkampfstand als eine Datei für einen anderen Rechner.
import { SIGNATURE_SLOTS } from "$lib/certificates/layout";
import { layoutStore, type LayoutStore } from "$lib/certificates/layoutStore.svelte";
import { logError, logInfo } from "$lib/log";
import { datedFileName, saveFile } from "$lib/platform/files";
import { appDataStore } from "$lib/platform/fs";
import { collectProjectData, writeProjectData } from "$lib/project/projectData";
import {
	buildProjectFile,
	PROJECT_EXTENSION,
	readProjectFile,
	type Project,
	type Signatures
} from "$lib/project/projectFile";
import { eventHeadline } from "$lib/settings/eventInfo";
import { keepDeviceFields, type EventInfo, type Settings } from "$lib/settings/settings";
import { settingsStore, type SettingsStore } from "$lib/settings/settingsStore.svelte";
import { APP_VERSION } from "$lib/version";
import { competitionStore, type CompetitionStore } from "./competitionStore.svelte";
import { writeBackup } from "./projectBackup";

export const PROJECT_FILTER = { name: "Wettkampf-Projekt", extensions: [PROJECT_EXTENSION] };
const UNNAMED_PROJECT = "Wettkampf";
/** Zeichen, die in Dateinamen unter Windows nicht erlaubt sind. */
const UNSAFE_FILE_CHARS = /[\\/:*?"<>|]/g;
const APPLY_FAILED = "Das Projekt konnte nicht vollständig übernommen werden.";
const BACKUP_FAILED = "Der bisherige Stand konnte nicht gesichert werden. Das Projekt wurde deshalb nicht geöffnet.";
const backupSaved = (path: string): string => `Der vorherige Stand wurde im App-Datenordner gesichert als „${path}“`;
const restoredMessage = (path: string): string => `${APPLY_FAILED} ${backupSaved(path)} und wiederhergestellt.`;
const notRestoredMessage = (path: string): string =>
	`${APPLY_FAILED} ${backupSaved(path)}; diese Datei lässt sich über „Projekt öffnen“ wieder laden.`;

export interface ProjectDeps {
	settings: SettingsStore;
	layouts: LayoutStore;
	competition: CompetitionStore;
	now?: () => Date;
}

const defaultDeps = (): ProjectDeps => ({
	settings: settingsStore,
	layouts: layoutStore,
	competition: competitionStore
});

export type OpenProjectOutcome = { ok: true; headline: string; warnings: string[] } | { ok: false; message: string };

/** Vorschlag für den Speichern-Dialog, z. B. „20261114_39. Wellenwettkampf.wwkprojekt“. */
export function projectFileName(event: EventInfo, date?: Date): string {
	const named = event.number.trim() !== "" || event.title.trim() !== "";
	const name = named ? eventHeadline(event).replace(UNSAFE_FILE_CHARS, "-") : UNNAMED_PROJECT;
	return datedFileName(`${name}.${PROJECT_EXTENSION}`, date);
}

/** Reine Daten ohne reaktive Hülle; Einstellungen sind ohnehin JSON. */
const plainSettings = (settings: Settings): Settings => JSON.parse(JSON.stringify(settings)) as Settings;

const currentTime = (deps: ProjectDeps): Date => (deps.now ?? (() => new Date()))();

/** Der aktuelle Stand als Projektdatei; ausstehende Änderungen werden vorher gesichert. */
async function currentProjectFile(deps: ProjectDeps, includeSignatures: boolean, now: Date): Promise<Uint8Array> {
	await deps.competition.saveNow();
	const { state, results } = deps.competition.stored();
	const { signature1, signature2 } = deps.layouts.images;
	const snapshot = {
		settings: plainSettings(deps.settings.settings),
		layouts: deps.layouts.layouts,
		signatures: { signature1, signature2 },
		competition: state,
		results,
		data: await collectProjectData(appDataStore())
	};
	return buildProjectFile(snapshot, { includeSignatures, now, appVersion: APP_VERSION });
}

/** Speichern-Dialog für die Projektdatei; null bei Abbruch. */
export async function saveProject(
	options: { includeSignatures: boolean },
	deps: ProjectDeps = defaultDeps()
): Promise<string | null> {
	const now = currentTime(deps);
	const bytes = await currentProjectFile(deps, options.includeSignatures, now);
	const defaultName = projectFileName(deps.settings.settings.event, now);
	const path = await saveFile({ defaultName, filters: [PROJECT_FILTER], bytes });
	if (path !== null) logInfo("project.saved", { signatures: options.includeSignatures, bytes: bytes.length });
	return path;
}

async function applySignatures(layouts: LayoutStore, signatures: Signatures): Promise<void> {
	for (const slot of SIGNATURE_SLOTS) {
		const bytes = signatures[slot];
		if (bytes === null) await layouts.removeImage(slot);
		else await layouts.setImage(slot, bytes);
	}
}

/** Ohne Unterschriften im Projekt bleiben die eigenen erhalten. */
async function applyProject(project: Project, deps: ProjectDeps): Promise<void> {
	deps.settings.settings = keepDeviceFields(project.settings, deps.settings.settings);
	await deps.settings.save();
	deps.layouts.replaceLayouts(project.layouts);
	await deps.layouts.save();
	if (project.signatures !== null) await applySignatures(deps.layouts, project.signatures);
	await writeProjectData(appDataStore(), project.data);
	const { competition, results } = project;
	await deps.competition.replace({ state: competition, results }, deps.settings.settings);
}

/** Versucht, den gesicherten Stand wieder einzusetzen; true bei Erfolg. */
async function restoreBackup(backup: Uint8Array, deps: ProjectDeps): Promise<boolean> {
	const read = readProjectFile(backup);
	if (!read.ok) return false;
	try {
		await applyProject(read.project, deps);
		return true;
	} catch {
		return false;
	}
}

/** Erst den bisherigen Stand sichern, dann übernehmen; scheitert das, wird die Sicherung wieder eingesetzt. */
async function replaceWithBackup(project: Project, deps: ProjectDeps): Promise<OpenProjectOutcome | null> {
	const now = currentTime(deps);
	let backup: Uint8Array;
	let backupAt: string;
	try {
		backup = await currentProjectFile(deps, true, now);
		backupAt = await writeBackup(appDataStore(), backup, now);
	} catch {
		logError("project.backupFailed");
		return { ok: false, message: BACKUP_FAILED };
	}
	try {
		await applyProject(project, deps);
		return null;
	} catch {
		logError("project.applyFailed");
	}
	const restored = await restoreBackup(backup, deps);
	logInfo("project.restored", { restored });
	return { ok: false, message: restored ? restoredMessage(backupAt) : notRestoredMessage(backupAt) };
}

/** Prüft die Datei vollständig und ersetzt erst dann den aktuellen Stand. */
export async function openProject(bytes: Uint8Array, deps: ProjectDeps = defaultDeps()): Promise<OpenProjectOutcome> {
	const read = readProjectFile(bytes);
	if (!read.ok) {
		logError("project.invalid");
		return read;
	}
	const failed = await replaceWithBackup(read.project, deps);
	if (failed !== null) return failed;
	logInfo("project.opened", { warnings: read.project.warnings.length });
	return { ok: true, headline: eventHeadline(read.project.settings.event), warnings: read.project.warnings };
}
