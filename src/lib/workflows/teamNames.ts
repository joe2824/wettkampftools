// Eigene Mannschaftsnamen auf geladene Meldungen anwenden, ohne die Wellenauswahl zu verlieren.
import type { SessionRegistration } from "$lib/session.svelte";
import { assignTeamNames, collectRenames } from "$lib/wwk/registrations";
import type { TeamNameOverrides } from "$lib/wwk/teamNames";

/** Neue Namen für die geladenen Meldungen; null, wenn sich nichts ändert. */
export function refreshTeamNames(
	registration: SessionRegistration,
	overrides: TeamNameOverrides,
): SessionRegistration | null {
	const teams = assignTeamNames(registration.teams, overrides);
	if (teams.every((team, index) => team.name === registration.teams[index].name)) return null;
	return { ...registration, teams, renames: collectRenames(teams) };
}
