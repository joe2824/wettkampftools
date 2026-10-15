// Erfundener JAuswertung-Strafenkatalog (.def) und Wettkampfdatei (.wk) im XStream-Format für Tests.
import { strToU8, zipSync } from "fflate";
import { rulebookXml, type FixtureAgeGroup } from "./rulebookFixture";

export interface FixturePenalty {
	name: string;
	code: string;
	kind: string;
	points: number;
}

const penaltyXml = ({ name, code, kind, points }: FixturePenalty, indent: string): string => `
${indent}<Strafe>
${indent}  <name>${name}</name>
${indent}  <shortname>${code}</shortname>
${indent}  <art>${kind}</art>
${indent}  <hoehe>${points}</hoehe>
${indent}  <durchsage></durchsage>
${indent}</Strafe>`;

const pen = (code: string, name: string, kind: string, points = 0): FixturePenalty => ({ code, name, kind, points });

/** Aufbau wie im offiziellen Katalog, stark gekürzt; „&amp;gt;“ wie im Original doppelt maskiert. */
export const FIXTURE_CHAPTERS = [
	{
		name: "Allgemeine Verstöße",
		number: "1",
		paragraphs: [
			{
				name: "Disqualifikation",
				number: "1",
				penalties: [
					pen("R1", "Einsatz nicht regelgerechter Ausrüstung", "DISQUALIFIKATION"),
					pen("R1#1", "Einsatz nicht regelgerechter Ausrüstung (1. Schwimmer)", "DISQUALIFIKATION")
				]
			}
		]
	},
	{
		name: "Verstöße in den Teilstrecken",
		number: "2",
		paragraphs: [
			{
				name: "Start",
				number: "1",
				penalties: [pen("V1", "Fehlstart", "DISQUALIFIKATION")]
			},
			{
				name: "Wende/Wechsel",
				number: "2",
				penalties: [pen("W4", "Frühstart bei der Staffelablösung", "STRAFPUNKTE", 200)]
			},
			{
				name: "Disziplin",
				number: "3",
				penalties: [
					pen("S1", "Strecke wird nicht regelgerecht zurückgelegt", "DISQUALIFIKATION"),
					pen("S5", "Rückenlage verlassen (Schultern &amp;gt; 90°)", "STRAFPUNKTE", 50)
				]
			}
		]
	},
	{
		name: "Sonstiges",
		number: "3",
		paragraphs: [
			{
				name: "Benutzerdefiniert",
				number: "",
				penalties: [
					pen("", "", "STRAFPUNKTE", 100),
					pen("", "", "NICHT_ANGETRETEN"),
					pen("n.b.", "Nicht beendet", "DISQUALIFIKATION")
				]
			}
		]
	}
];

export type FixtureChapter = (typeof FIXTURE_CHAPTERS)[number];

/** Liste der Kapitel (Element `strafen` der Klasse Strafen), eingerückt ab `depth`. */
export function penaltyListXml(chapters: readonly FixtureChapter[] = FIXTURE_CHAPTERS, depth = 1): string {
	const i = (level: number) => "  ".repeat(depth + level);
	const paragraphs = (chapter: FixtureChapter) =>
		chapter.paragraphs
			.map(
				(p) => `
${i(3)}<StrafenParagraph>
${i(4)}<strafen>${p.penalties.map((x) => penaltyXml(x, i(5))).join("")}
${i(4)}</strafen>
${i(4)}<name>${p.name}</name>
${i(4)}<par>${p.number}</par>
${i(3)}</StrafenParagraph>`
			)
			.join("");
	const chapters_ = chapters
		.map(
			(c) => `
${i(1)}<StrafenKapitel>
${i(2)}<paragraphen>${paragraphs(c)}
${i(2)}</paragraphen>
${i(2)}<name>${c.name}</name>
${i(2)}<kapitel>${c.number}</kapitel>
${i(1)}</StrafenKapitel>`
		)
		.join("");
	return `${i(0)}<strafen>${chapters_}
${i(0)}</strafen>`;
}

export function penaltyCatalogXml(chapters: readonly FixtureChapter[] = FIXTURE_CHAPTERS): string {
	return `<?xml version="1.0" encoding="UTF-8"?>

<Strafen version="0">
${penaltyListXml(chapters)}
</Strafen>
`;
}

export function penaltyCatalogFile(xml: string = penaltyCatalogXml()): Uint8Array {
	return zipSync({ "data.xml": strToU8(xml) });
}

export interface FixtureCompetitionOptions {
	groups: FixtureAgeGroup[];
	/** Bereits vergebene Strafe am ersten Team. */
	assignedPenalty?: boolean;
	/** Katalogeintrag als XStream-Verweis auf die vergebene Strafe (wie in echten Dateien). */
	catalogReference?: boolean;
	/** Verweis von außen in den Katalog. */
	referenceIntoCatalog?: boolean;
	root?: string;
	teams?: number;
}

const ASSIGNED = penaltyXml(pen("V1", "Fehlstart", "DISQUALIFIKATION"), "                ");

function teamXml(index: number, assigned: boolean): string {
	return `
          <Mannschaft>
            <name>Musterstadt ${index + 1}</name>
            <allgemeineStrafen/>
            <strafen>
              <linked-list>${assigned ? ASSIGNED : ""}
              </linked-list>
              <linked-list/>
            </strafen>
            <mitglieder2>
              <Mannschaftsmitglied><vorname>Anna</vorname><nachname>Meier</nachname></Mannschaftsmitglied>
            </mitglieder2>
          </Mannschaft>`;
}

/** Eingebettetes Regelwerk: Inhalt des .rwm-Wurzelelements unter `<aks>`. */
function embeddedRulebook(groups: FixtureAgeGroup[]): string {
	const xml = rulebookXml(groups, "Wellen-Wk 2025");
	const body = xml.slice(xml.indexOf("<aks>"), xml.lastIndexOf("</Altersklassen>")).trimEnd();
	return `  <aks>\n  ${body.replace(/\n/g, "\n  ")}\n  </aks>`;
}

function catalogBlock(options: FixtureCompetitionOptions): string {
	const list = penaltyListXml(FIXTURE_CHAPTERS, 2);
	if (!options.catalogReference) return `  <strafen>\n${list}\n  </strafen>`;
	const reference = `<Strafe reference="../../../../../../../laufliste/laufliste/Lauf/laufteilies/Mannschaft/strafen/linked-list/Strafe"/>`;
	const withReference = list.replace(
		/<strafen>(\s*)<Strafe>/,
		(_m, space: string) => `<strafen>${space}${reference}${space}<Strafe>`
	);
	return `  <strafen>\n${withReference}\n  </strafen>`;
}

/** data.xml einer Mannschafts-Wettkampfdatei mit Laufliste, Katalog und Sonstigem. */
export function competitionXml(options: FixtureCompetitionOptions): string {
	const root = options.root ?? "MannschaftWettkampf";
	const teams = Array.from({ length: options.teams ?? 2 }, (_, i) => teamXml(i, i === 0 && !!options.assignedPenalty));
	const intoCatalog = options.referenceIntoCatalog
		? `\n    <letzteStrafe reference="../../strafen/strafen/StrafenKapitel/paragraphen/StrafenParagraph/strafen/Strafe"/>`
		: "";
	return `<?xml version="1.0" encoding="UTF-8"?>

<${root} version="3.0">
${embeddedRulebook(options.groups)}
  <laufliste>
    <laufliste>
      <Lauf>
        <laufteilies>${teams.join("")}
        </laufteilies>
      </Lauf>
    </laufliste>
  </laufliste>
${catalogBlock(options)}
  <properties>
    <bahnen>6</bahnen>${intoCatalog}
    <aksRef reference="../../aks"/>
  </properties>
  <empty>false</empty>
</${root}>`;
}

export function competitionFile(xml: string, extra: Record<string, Uint8Array> = {}): Uint8Array {
	return zipSync({ "data.xml": strToU8(xml), ...extra });
}
