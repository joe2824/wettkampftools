// Einstellungen der alten Version übernehmen.
import type { LegacySettings } from "$lib/platform/legacySettings";
import { defaultSettings, parseSettings, resolveWaveStart, type Settings } from "./settings";

const LEGACY_FIELDS = [
	"ageGroups",
	"seniorTeamAgeGroups",
	"seniorIndividualAgeGroups",
	"simplifySeniorAgeGroups",
	"excludeUnplacedTeams"
] as const;

/** Übernimmt die alte Version feldweise; ungültige Felder fallen auf Standard. */
export function mergeLegacySettings(
	base: Settings,
	legacy: LegacySettings
): { settings: Settings; applied: string[]; fellBack: string[] } {
	const defaults = defaultSettings();
	const settings: Settings = { ...structuredClone(base), legacyMigrated: true };
	const applied: string[] = [];
	const fellBack: string[] = [];
	const source = legacy as unknown as Record<string, unknown>;
	for (const field of LEGACY_FIELDS) {
		if (source[field] === undefined) continue;
		const { settings: parsed, issues } = parseSettings({ [field]: source[field] });
		const ok = !issues.some((issue) => issue.startsWith(`${field}.`));
		(settings as unknown as Record<string, unknown>)[field] = ok ? parsed[field] : defaults[field];
		(ok ? applied : fellBack).push(field);
	}
	const candidate = typeof source.waveStartAgeGroup === "string" ? source.waveStartAgeGroup : null;
	const waveStart = resolveWaveStart(candidate ?? settings.waveStartAgeGroup, settings.ageGroups);
	settings.waveStartAgeGroup = waveStart.value;
	if (waveStart.issue || (source.waveStartAgeGroup !== undefined && candidate === null)) {
		fellBack.push("waveStartAgeGroup");
	} else if (candidate !== null) {
		applied.push("waveStartAgeGroup");
	}
	return { settings, applied, fellBack };
}
