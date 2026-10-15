const COMPETITION_DECIMALS = 2;

/** Wettkampfpunkte wie im bisherigen Seriendruck: „1234,50“, leer ohne Wert. */
export function formatCompetitionPoints(value: number | null): string {
	if (value === null) return "";
	return value.toFixed(COMPETITION_DECIMALS).replace(".", ",");
}

export function formatTrophyPoints(points: number): string {
	return String(Math.round(points));
}
