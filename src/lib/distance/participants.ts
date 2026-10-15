// Teilnehmende Gliederungen als Kartenpunkte, mit den gemerkten Zuordnungen gleichnamiger Gliederungen.
import type { MapMarker } from "$lib/maps/shapes";
import type { Organisation } from "./dlrgPoi";
import { distancesToBadNauheim, type ChoiceMap } from "./matching";

export function participantPoints(
	orgNames: readonly string[],
	organisations: readonly Organisation[],
	choices: ChoiceMap
): MapMarker[] {
	const names = [...new Set(orgNames.map((name) => name.trim()).filter((name) => name !== ""))];
	const { matched } = distancesToBadNauheim(names, organisations, { choices });
	return matched.map((row) => ({ name: row.name, position: row.position }));
}
