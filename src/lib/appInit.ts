// Start der Anwendung: Protokoll, Aufräumen, gespeicherte Einstellungen und Layout laden.
import { installErrorLogging, logError, pruneOldLogs } from "$lib/log";
import { settingsStore, type MigrationReport, type SettingsStore } from "$lib/settings/settingsStore.svelte";
import { layoutStore, type LayoutStore } from "$lib/certificates/layoutStore.svelte";

export interface InitDeps {
	settings?: SettingsStore;
	layouts?: LayoutStore;
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

/** Liefert den Übernahmebericht, wenn beim ersten Start die alte Version übernommen wurde. */
export async function initApp(deps: InitDeps = {}): Promise<MigrationReport | null> {
	const settings = deps.settings ?? settingsStore;
	const layouts = deps.layouts ?? layoutStore;
	installErrorLogging(deps.errorTarget);
	await step("pruneLogs", () => pruneOldLogs(deps.today));
	const report = await step("settings", () => settings.load());
	await step("layout", () => layouts.load());
	await step("images", () => layouts.loadImages());
	return report;
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
