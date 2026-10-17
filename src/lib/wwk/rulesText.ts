// Rechenregel der WWK-Pokalwertung mit Beispiel, Absätze für die Anzeige.
import type { ScoringOptions } from "./scoring";

const POINTS_PARAGRAPH =
	"Punktesystem: Gewertet wird nach Altersklassen sowie männlich und weiblich getrennt. " +
	"Die Punktzahl für den ersten Platz ergibt sich aus der Anzahl der Mannschaften plus eines Punktes (2. Platz minus 2 Punkte, 3. Platz minus 3 Punkte usw.). " +
	"Beispiel: 5 Mannschaften: 1. Platz = 6 Punkte, 2. Platz = 4, 3. Platz = 3, 4. Platz = 2, 5. Platz = 1 Punkt.";

const PLACE_PARAGRAPH = "Maßgeblich ist der Platz aus JAuswertung, auch bei Platzgleichheit.";

const COUNT_WITH_PLACE = "Gezählt werden die Mannschaften mit Platz in der jeweiligen Altersklasse und Geschlecht.";

const COUNT_ALL =
	"Gezählt werden alle Mannschaften der jeweiligen Altersklasse und Geschlecht; Mannschaften ohne Platz erhalten 0 Punkte.";

const TIE_PARAGRAPH =
	"Bei Punktgleichheit in der Gesamtwertung teilen sich Ortsgruppen den Platz; über den Pokal entscheidet bei Gleichstand die Wettkampfleitung.";

export function trophyRulesText(options: ScoringOptions): string[] {
	return [POINTS_PARAGRAPH, PLACE_PARAGRAPH, options.excludeUnplaced ? COUNT_WITH_PLACE : COUNT_ALL, TIE_PARAGRAPH];
}

export const TROPHY_RULES_TEXT: readonly string[] = trophyRulesText({ excludeUnplaced: true });
