// Einstellungen der alten Version aus der Windows-Registry lesen (nur lesend).
import { invoke } from "@tauri-apps/api/core";

/** Einstellungen der alten Version, wie sie aus der Registry gelesen werden. */
export interface LegacySettings {
	ageGroups?: string[];
	seniorTeamAgeGroups?: string[];
	seniorIndividualAgeGroups?: string[];
	waveStartAgeGroup?: string;
	simplifySeniorAgeGroups?: boolean;
	excludeUnplacedTeams?: boolean;
	warnings: string[];
}

/** Liefert die alten Einstellungen; null, wenn es keine gibt oder nicht Windows. */
export function readLegacySettings(): Promise<LegacySettings | null> {
	return invoke<LegacySettings | null>("read_legacy_settings");
}
