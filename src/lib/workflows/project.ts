// Projekt speichern und öffnen: der ganze Wettkampfstand als eine Datei für einen anderen Rechner.
import { SIGNATURE_SLOTS } from "$lib/certificates/layout";
import { layoutStore, type LayoutStore } from "$lib/certificates/layoutStore.svelte";
import { logError, logInfo } from "$lib/log";
import { datedFileName, saveFile } from "$lib/platform/files";
import {
	buildProjectFile,
	PROJECT_EXTENSION,
	readProjectFile,
	type Project,
	type Signatures
} from "$lib/project/projectFile";
import { eventHeadline } from "$lib/settings/eventInfo";
import type { EventInfo, Settings } from "$lib/settings/settings";
import { settingsStore, type SettingsStore } from "$lib/settings/settingsStore.svelte";
import { APP_VERSION } from "$lib/version";
import { competitionStore, type CompetitionStore } from "./competitionStore.svelte";

export const PROJECT_FILTER = { name: "Wettkampf-Projekt", extensions: [PROJECT_EXTENSION] };
const UNNAMED_PROJECT = "Wettkampf";
/** Zeichen, die in Dateinamen unter Windows nicht erlaubt sind. */
const UNSAFE_FILE_CHARS = /[\\/:*?"<>|]/g;
const APPLY_FAILED = "Das Projekt konnte nicht vollständig übernommen werden. Bitte erneut versuchen.";

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

/** Speichern-Dialog für die Projektdatei; null bei Abbruch. */
export async function saveProject(
	options: { includeSignatures: boolean },
	deps: ProjectDeps = defaultDeps()
): Promise<string | null> {
	const now = (deps.now ?? (() => new Date()))();
	await deps.competition.saveNow();
	const { state, results } = deps.competition.stored();
	const { signature1, signature2 } = deps.layouts.images;
	const settings = plainSettings(deps.settings.settings);
	const bytes = buildProjectFile(
		{ settings, layouts: deps.layouts.layouts, signatures: { signature1, signature2 }, competition: state, results },
		{ includeSignatures: options.includeSignatures, now, appVersion: APP_VERSION }
	);
	const path = await saveFile({ defaultName: projectFileName(settings.event, now), filters: [PROJECT_FILTER], bytes });
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
	deps.settings.settings = { ...project.settings, legacyMigrated: deps.settings.settings.legacyMigrated };
	await deps.settings.save();
	deps.layouts.layouts = project.layouts;
	await deps.layouts.save();
	if (project.signatures !== null) await applySignatures(deps.layouts, project.signatures);
	const { competition, results } = project;
	await deps.competition.replace({ state: competition, results }, deps.settings.settings);
}

/** Prüft die Datei vollständig und ersetzt erst dann den aktuellen Stand. */
export async function openProject(bytes: Uint8Array, deps: ProjectDeps = defaultDeps()): Promise<OpenProjectOutcome> {
	const read = readProjectFile(bytes);
	if (!read.ok) {
		logError("project.invalid");
		return read;
	}
	try {
		await applyProject(read.project, deps);
	} catch {
		logError("project.applyFailed");
		return { ok: false, message: APPLY_FAILED };
	}
	logInfo("project.opened", { warnings: read.project.warnings.length });
	return { ok: true, headline: eventHeadline(read.project.settings.event), warnings: read.project.warnings };
}
