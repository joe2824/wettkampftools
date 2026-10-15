// Erfundenes JAuswertung-Regelwerk (.rwm) im XStream-Format für Tests.
import { strToU8, zipSync } from "fflate";

export interface FixtureDiscipline {
	name: string;
	rec: number;
}

export interface FixtureAgeGroup {
	name: string;
	/** Erste Liste weiblich, zweite männlich. */
	female: FixtureDiscipline[];
	male: FixtureDiscipline[];
}

function disciplineXml({ name, rec }: FixtureDiscipline): string {
	return `
          <Disziplin>
            <name>${name}</name>
            <rec>${rec}</rec>
            <laenge>50</laenge>
            <runden/>
            <rundenIds>
              <int>0</int>
            </rundenIds>
          </Disziplin>`;
}

function ageGroupXml(group: FixtureAgeGroup): string {
	const array = (list: FixtureDiscipline[]) => `
        <Disziplin-array>${list.map(disciplineXml).join("")}
        </Disziplin-array>`;
	return `
    <Altersklasse>
      <name>${group.name}</name>
      <disziplinen>${array(group.female)}${array(group.male)}
      </disziplinen>
      <minMembers>4</minMembers>
      <maxMembers>5</maxMembers>
      <interneStartgruppe>
        <name>-</name>
        <outer-class reference="../.."/>
      </interneStartgruppe>
    </Altersklasse>`;
}

export function rulebookXml(groups: FixtureAgeGroup[], description = "Beispiel-Regelwerk"): string {
	return `<?xml version="1.0" encoding="UTF-8"?>

<Altersklassen version="2">
  <aks>${groups.map(ageGroupXml).join("")}
  </aks>
  <beschreibung>${description}</beschreibung>
  <wertungsgruppen>
    <Wertungsgruppe><name>Rettungswertung</name></Wertungsgruppe>
  </wertungsgruppen>
</Altersklassen>`;
}

export function rulebookFile(groups: FixtureAgeGroup[], description?: string): Uint8Array {
	return zipSync({ "data.xml": strToU8(rulebookXml(groups, description)) });
}
