// Start der Anwendung: Protokoll, Aufräumen, gespeicherte Einstellungen, Layout und Wettkampfstand laden.
import { installErrorLogging, logError, pruneOldLogs } from "$lib/log";
import { settingsStore, type MigrationReport, type SettingsStore } from "$lib/settings/settingsStore.svelte";
import { layoutStore, type LayoutStore } from "$lib/certificates/layoutStore.svelte";
import { competitionStore, type CompetitionStore } from "$lib/workflows/competitionStore.svelte";

export interface InitDeps {
	settings?: SettingsStore;
	layouts?: LayoutStore;
	competition?: CompetitionStore;
	errorTarget?: Parameters<typeof installErrorLogging>[0];
	today?: Date;
}

/** Ein Fehler in einem Schritt hält die übrigen nicht auf; protokolliert wird nur der Code. */
async function step<T>(code: string, run: () => Promise<T>): Promise<T | null> {
	try {
		return await run();
	} catch {
		logError(`init.${code}Failed`);
		return null;
	}
}

export type StoredArea = "settings" | "layout" | "competition";

/** Unlesbare Dateien eines Bereichs, die beim Start beiseitegelegt wurden. */
export interface SetAsideNotice {
	area: StoredArea;
	files: string[];
}

export interface InitReport {
	/** Bericht, wenn beim ersten Start die alte Version übernommen wurde. */
	migration: MigrationReport | null;
	setAside: SetAsideNotice[];
}

/** Liefert, was beim Start gemeldet werden soll. */
export async function initApp(deps: InitDeps = {}): Promise<InitReport> {
	const settings = deps.settings ?? settingsStore;
	const layouts = deps.layouts ?? layoutStore;
	const competition = deps.competition ?? competitionStore;
	installErrorLogging(deps.errorTarget);
	await step("pruneLogs", () => pruneOldLogs(deps.today));
	const report = await step("settings", () => settings.load());
	await step("layout", () => layouts.load());
	await step("images", () => layouts.loadImages());
	// Meldungen brauchen die geladenen Einstellungen.
	await step("competition", () => competition.restore(settings.settings));
	competition.startAutosave();
	const notices: SetAsideNotice[] = [
		{ area: "settings", files: settings.setAside },
		{ area: "layout", files: layouts.setAside },
		{ area: "competition", files: competition.setAside }
	];
	return { migration: report, setAside: notices.filter((notice) => notice.files.length > 0) };
}

const SET_ASIDE_SUBJECT: Record<StoredArea, string> = {
	settings: "Gespeicherte Einstellungen konnten",
	layout: "Gespeichertes Layout konnte",
	competition: "Gespeicherter Wettkampfstand konnte"
};
const SET_ASIDE_VERB: Record<StoredArea, string> = {
	settings: "wurden",
	layout: "wurde",
	competition: "wurde"
};
const SET_ASIDE_CONSEQUENCE: Record<StoredArea, string> = {
	settings: "es gelten Standardwerte.",
	layout: "es gelten Standardwerte.",
	competition: "es wird ohne gespeicherten Stand begonnen."
};

/** Hinweistext für unlesbare, beiseitegelegte Dateien. */
export function setAsideMessage({ area, files }: SetAsideNotice): { title: string; description: string } {
	const names = files.map((file) => `„${file}“`).join(", ");
	return {
		title: "Gespeicherte Daten nicht lesbar",
		description: `${SET_ASIDE_SUBJECT[area]} nicht gelesen werden und ${SET_ASIDE_VERB[area]} im App-Datenordner gesichert als ${names}; ${SET_ASIDE_CONSEQUENCE[area]}`
	};
}

const FALLBACK_HINT = "Einige Werte konnten nicht gelesen werden und stehen auf Standard.";

/** Hinweistext für die Übernahme der alten Einstellungen. */
export function migrationMessage(report: MigrationReport): { title: string; description: string } {
	const count = report.applied.length;
	const applied = count === 1 ? "1 Einstellung wurde übernommen." : `${count} Einstellungen wurden übernommen.`;
	const incomplete = report.fellBack.length > 0 || report.warnings.length > 0;
	return {
		title: "Einstellungen der alten Version übernommen",
		description: incomplete ? `${applied} ${FALLBACK_HINT}` : applied
	};
}
