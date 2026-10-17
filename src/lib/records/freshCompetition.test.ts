// @vitest-environment happy-dom
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { penaltyCatalogFile } from "$lib/testing/penaltyFixture";
import { rulebookFile, type FixtureAgeGroup } from "$lib/testing/rulebookFixture";
import { buildFreshCompetition, formatXstreamDate, type FreshCompetitionInput } from "./freshCompetition";
import { readCatalogElement, readPenaltyCatalog } from "./penaltyCatalog";
import { applyClubPenaltyRules } from "./penaltyRules";
import { readRulebookElementRecords } from "./rulebookRecords";

const NEW_GROUPS: FixtureAgeGroup[] = [
	{
		name: "AK 12",
		female: [
			{ name: "4*25m Rettungsstaffel", rec: 5817 },
			{ name: "4*25m RLB", rec: 8219 }
		],
		male: [
			{ name: "4*25m Rettungsstaffel", rec: 5674 },
			{ name: "4*25m RLB", rec: 8100 }
		]
	},
	{
		name: "AK Senioren",
		female: [{ name: "4*25m Rettungsstaffel", rec: 6500 }],
		male: [{ name: "4*25m Rettungsstaffel", rec: 6000 }]
	},
	{
		name: "AkW offen",
		female: [{ name: "4*50m Retten in der Welle", rec: 20500 }],
		male: [{ name: "4*50m Retten in der Welle", rec: 16000 }]
	}
];

const catalog = () => applyClubPenaltyRules(readPenaltyCatalog(penaltyCatalogFile())).catalog;
const LOGO = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);

/** Vorjahresdatei mit zwei Altersklassen, zwei Mannschaften, Ergebnissen, Kampfrichtern und Eigenschaften. */
function previousXml(root = "MannschaftWettkampf"): string {
	return `<?xml version="1.0" encoding="UTF-8"?>

<${root} version="3.0">
  <aks>
    <aks>
      <Altersklasse>
        <name>AK 12</name>
        <disziplinen>
          <Disziplin-array><Disziplin><name>4*25m Rettungsstaffel</name><rec>6000</rec></Disziplin></Disziplin-array>
          <Disziplin-array><Disziplin><name>4*25m Rettungsstaffel</name><rec>5900</rec></Disziplin></Disziplin-array>
        </disziplinen>
        <interneStartgruppe><name>-</name><outer-class reference="../.."/></interneStartgruppe>
      </Altersklasse>
      <Altersklasse>
        <name>AkW offen</name>
        <disziplinen>
          <Disziplin-array><Disziplin><name>4*50m Retten in der Welle</name><rec>20894</rec></Disziplin></Disziplin-array>
          <Disziplin-array><Disziplin><name>4*50m Retten in der Welle</name><rec>16221</rec></Disziplin></Disziplin-array>
        </disziplinen>
      </Altersklasse>
    </aks>
    <beschreibung>Wellen-Wk 2025</beschreibung>
    <translations/>
  </aks>
  <laufliste>
    <wk class="MannschaftWettkampf" reference="../.."/>
    <laufliste>
      <Lauf>
        <laufteilies>
          <Mannschaft name="Musterstadt" aknummer="0" maennlich="false">
            <zeiten><int>6100</int></zeiten>
            <strafen><linked-list/><linked-list/></strafen>
            <wk class="MannschaftWettkampf" reference="../../../../../.."/>
          </Mannschaft>
          <Mannschaft name="Beispielhausen" aknummer="1" maennlich="true">
            <zeiten><int>16500</int></zeiten>
            <strafen><linked-list><Strafe><name>Fehlstart</name></Strafe></linked-list></strafen>
            <wk class="MannschaftWettkampf" reference="../../../../../.."/>
          </Mannschaft>
        </laufteilies>
      </Lauf>
    </laufliste>
    <verteilung2><LauflisteEinteilung><startgroup>0</startgroup></LauflisteEinteilung></verteilung2>
    <mode>2</mode>
    <isfinal>true</isfinal>
  </laufliste>
  <strafen>
    <strafen><StrafenKapitel><paragraphen/><name>Alt</name><kapitel>1</kapitel></StrafenKapitel></strafen>
  </strafen>
  <schwimmer>
    <Mannschaft reference="../../laufliste/laufliste/Lauf/laufteilies/Mannschaft"/>
    <Mannschaft reference="../../laufliste/laufliste/Lauf/laufteilies/Mannschaft[2]"/>
  </schwimmer>
  <einsprueche><Einspruch><text>Protest</text></Einspruch></einsprueche>
  <properties>
    <entry><string>Name</string><string>38. Wellenwettkampf</string></entry>
    <entry><string>Date</string><string>15.11.2025</string></entry>
    <entry><string>YearOfCompetition</string><int>2025</int></entry>
    <entry><string>LastChange</string><date>2025-11-15 17:48:05.340 UTC</date></entry>
    <entry><string>UploadId</string><string>abc</string></entry>
    <entry><string>UploadIndex</string><int>3</int></entry>
    <entry><string>ISCResultUploadCompetitionId</string><string>644</string></entry>
    <entry><string>ISCResultUploadEDVNumber</string><string>0720017</string></entry>
    <entry><string>Ausrichter</string><string>DLRG Musterstadt</string></entry>
    <entry><string>Organizer</string><string>DLRG Musterstadt</string></entry>
    <entry><string>NameOfPool</string><string>Wellenbad</string></entry>
    <entry><string>HeatsLanes</string><int>8</int></entry>
    <entry><string>HeatsLaneSelection</string><hashtable><entry><string>4*50m Retten in der Welle</string><boolean-array><boolean>true</boolean><boolean>false</boolean><boolean>true</boolean></boolean-array></entry></hashtable></entry>
    <entry><string>MixedHeats</string><boolean>true</boolean></entry>
    <entry><string>HlwPauseAgegroups</string><boolean-array><boolean>true</boolean><boolean>false</boolean></boolean-array></entry>
    <entry><string>HlwPauseRestarts</string><int-array><int>480</int><int>480</int></int-array></entry>
  </properties>
  <kampfrichter>
    <einheiten>
      <Kampfrichtereinheit>
        <name>Kampfgericht</name>
        <positionen><string>Zielrichter</string></positionen>
        <kampfrichter><Kampfrichter><name>Anna Meier</name></Kampfrichter></kampfrichter>
      </Kampfrichtereinheit>
    </einheiten>
  </kampfrichter>
  <timelimits><limits class="linked-list"><Limit>1</Limit></limits></timelimits>
  <pcManager><listeners><Listener><outer-class reference="../../../../laufliste"/></Listener></listeners></pcManager>
  <filterindex>3</filterindex>
  <disciplinesComplete><boolean>true</boolean></disciplinesComplete>
  <disciplinesAgeGroupComplete>
    <boolean-array-array><boolean-array><boolean>true</boolean><boolean>false</boolean></boolean-array></boolean-array-array>
    <boolean-array-array><boolean-array><boolean>true</boolean><boolean>true</boolean></boolean-array></boolean-array-array>
  </disciplinesAgeGroupComplete>
  <hlwAkComplete>
    <boolean-array><boolean>true</boolean><boolean>true</boolean></boolean-array>
    <boolean-array><boolean>true</boolean><boolean>true</boolean></boolean-array>
  </hlwAkComplete>
  <updatesDisabled>true</updatesDisabled>
  <lastcomplete><int>5</int><int>1</int><int>2</int></lastcomplete>
  <empty>
    <boolean-array><boolean>false</boolean><boolean>false</boolean></boolean-array>
    <boolean-array><boolean>false</boolean><boolean>false</boolean></boolean-array>
  </empty>
</${root}>`;
}

const previousFile = (xml = previousXml(), extra: Record<string, Uint8Array> = { "logo.png": LOGO }) =>
	zipSync({ "data.xml": strToU8(xml), ...extra });

function input(overrides: Partial<FreshCompetitionInput> = {}): FreshCompetitionInput {
	return {
		previous: previousFile(),
		rulebook: rulebookFile(NEW_GROUPS, "Wellen-Wk 2026"),
		catalog: catalog(),
		properties: { name: "39. Wellenwettkampf", date: "14.11.2026", year: 2026, host: "DLRG Beispielhausen" },
		now: new Date(Date.UTC(2026, 9, 17, 8, 30, 5, 42)),
		...overrides
	};
}

function rootOf(bytes: Uint8Array): Element {
	const xml = strFromU8(unzipSync(bytes)["data.xml"]);
	return new DOMParser().parseFromString(xml, "application/xml").documentElement;
}

const child = (parent: Element, tag: string): Element => Array.from(parent.children).find((c) => c.nodeName === tag)!;
const children = (parent: Element, tag: string): Element[] =>
	Array.from(parent.children).filter((c) => c.nodeName === tag);

function property(root: Element, key: string): Element {
	return children(child(root, "properties"), "entry").find((entry) => entry.children[0].textContent === key)!
		.children[1];
}

function build(overrides: Partial<FreshCompetitionInput> = {}) {
	const outcome = buildFreshCompetition(input(overrides));
	if (!outcome.ok) throw new Error(outcome.message);
	return outcome;
}

describe("buildFreshCompetition", () => {
	it("übernimmt das neue Regelwerk mit seinen Altersklassen und behält Felder, die nur die Wettkampfdatei kennt", () => {
		const outcome = build();
		const root = rootOf(outcome.bytes);
		const records = readRulebookElementRecords(child(root, "aks"));
		expect(records.map((r) => r.ageGroup)).toEqual([
			"AK 12",
			"AK 12",
			"AK 12",
			"AK 12",
			"AK Senioren",
			"AK Senioren",
			"AkW offen",
			"AkW offen"
		]);
		expect(records.find((r) => r.ageGroup === "AkW offen" && r.gender === "male")?.rec).toBe(16000);
		expect(child(child(root, "aks"), "beschreibung").textContent).toBe("Wellen-Wk 2026");
		expect(child(child(root, "aks"), "translations")).toBeDefined();
		expect(outcome.ageGroups).toBe(3);
	});

	it("ersetzt den Strafenkatalog", () => {
		const root = rootOf(build().bytes);
		expect(readCatalogElement(child(root, "strafen"))).toEqual(catalog());
	});

	it("entfernt Mannschaften, Läufe, Strafen, Einsprüche, Kampfrichter und Zeitlimits", () => {
		const root = rootOf(build().bytes);
		expect(root.getElementsByTagName("Mannschaft")).toHaveLength(0);
		const heats = child(root, "laufliste");
		expect(child(heats, "wk").getAttribute("reference")).toBe("../..");
		expect(child(heats, "laufliste").children).toHaveLength(0);
		expect(child(heats, "verteilung2").children).toHaveLength(0);
		expect(child(heats, "mode").textContent).toBe("0");
		expect(child(root, "schwimmer").children).toHaveLength(0);
		expect(child(root, "einsprueche").children).toHaveLength(0);
		const named = (tag: string) => Array.from(root.getElementsByTagName("*")).filter((e) => e.nodeName === tag);
		expect(named("Kampfrichter")).toHaveLength(0);
		expect(named("Kampfrichtereinheit")[0].children[0].textContent).toBe("Kampfgericht");
		expect(named("Limit")).toHaveLength(0);
	});

	it("baut die Listen je Altersklasse passend zum neuen Regelwerk auf", () => {
		const root = rootOf(build().bytes);
		expect(child(root, "disciplinesComplete").children).toHaveLength(2);
		const perGroup = children(child(root, "disciplinesAgeGroupComplete"), "boolean-array-array");
		expect(perGroup.map((matrix) => matrix.children.length)).toEqual([2, 1, 1]);
		expect(perGroup[0].children[0].children).toHaveLength(2);
		expect(children(child(root, "hlwAkComplete"), "boolean-array")).toHaveLength(3);
		expect(children(child(root, "empty"), "boolean-array").map((a) => a.children[0].textContent)).toEqual([
			"true",
			"true",
			"true"
		]);
		expect(Array.from(child(root, "lastcomplete").children).map((e) => e.textContent)).toEqual(["-1", "-1", "-1"]);
		expect(child(root, "updatesDisabled").textContent).toBe("false");
		expect(child(root, "filterindex").textContent).toBe("0");
	});

	it("setzt Name, Datum, Jahr, Ausrichter und Änderungszeit, behält Bahnen und Becken", () => {
		const root = rootOf(build().bytes);
		expect(property(root, "Name").textContent).toBe("39. Wellenwettkampf");
		expect(property(root, "Date").textContent).toBe("14.11.2026");
		expect(property(root, "YearOfCompetition").textContent).toBe("2026");
		expect(property(root, "LastChange").textContent).toBe("2026-10-17 08:30:05.042 UTC");
		expect(property(root, "UploadId").textContent).toBe("");
		expect(property(root, "UploadIndex").textContent).toBe("0");
		expect(property(root, "ISCResultUploadCompetitionId").textContent).toBe("");
		expect(property(root, "ISCResultUploadEDVNumber").textContent).toBe("0720017");
		expect(property(root, "Ausrichter").textContent).toBe("DLRG Beispielhausen");
		expect(property(root, "Organizer").textContent).toBe("DLRG Beispielhausen");
		expect(property(root, "NameOfPool").textContent).toBe("Wellenbad");
		expect(property(root, "HeatsLanes").textContent).toBe("8");
		// Bahnbelegung je Disziplin (in der Welle sind nicht alle Bahnen besetzt) bleibt unverändert.
		const lanes = property(root, "HeatsLaneSelection").children[0].children[1];
		expect(Array.from(lanes.children).map((e) => e.textContent)).toEqual(["true", "false", "true"]);
		expect(property(root, "MixedHeats").textContent).toBe("true");
		expect(property(root, "HlwPauseAgegroups").children).toHaveLength(3);
		expect(Array.from(property(root, "HlwPauseRestarts").children).map((e) => e.textContent)).toEqual([
			"480",
			"480",
			"480"
		]);
	});

	it("lässt Ausrichter und Veranstalter stehen, wenn keiner angegeben ist", () => {
		const root = rootOf(build({ properties: { name: "39. Wellenwettkampf", date: "", year: 2026, host: "" } }).bytes);
		expect(property(root, "Ausrichter").textContent).toBe("DLRG Musterstadt");
		expect(property(root, "Date").textContent).toBe("");
	});

	it("behält das Logo und schreibt data.xml als ersten Eintrag", () => {
		const outcome = build();
		expect(outcome.hasLogo).toBe(true);
		const entries = unzipSync(outcome.bytes);
		expect(Object.keys(entries)[0]).toBe("data.xml");
		expect(entries["logo.png"]).toEqual(LOGO);
		const xml = strFromU8(entries["data.xml"]);
		expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
		expect(xml).toContain("<boolean-array-array>");
		expect(xml).not.toContain("xmlns=");
		expect(xml).not.toMatch(/<[A-Z-]+>/);
	});

	it("lehnt Einzelwettkämpfe, fremde Dateien und kaputte Regelwerke ab", () => {
		expect(buildFreshCompetition(input({ previous: previousFile(previousXml("EinzelWettkampf")) }))).toMatchObject({
			ok: false,
			message: expect.stringContaining("Einzelwettkampf")
		});
		expect(buildFreshCompetition(input({ previous: strToU8("kein zip") }))).toMatchObject({
			ok: false,
			message: expect.stringContaining("keine JAuswertung-Wettkampfdatei")
		});
		expect(buildFreshCompetition(input({ rulebook: strToU8("kein zip") }))).toMatchObject({
			ok: false,
			message: expect.stringContaining("Vereins-Regelwerk")
		});
	});

	it("lehnt Dateien mit unauflösbaren Verweisen ab", () => {
		const broken = previousXml().replace('reference="../../../../laufliste"', 'reference="../../../../nirgends"');
		expect(buildFreshCompetition(input({ previous: previousFile(broken) }))).toMatchObject({
			ok: false,
			message: expect.stringContaining("Verknüpfungen")
		});
	});
});

describe("buildFreshCompetition – unbekannte Listen je Altersklasse", () => {
	it("bricht ab, wenn sich die Zahl der Altersklassen ändert und eine unbekannte Liste je Altersklasse existiert", () => {
		const withUnknown = previousXml().replace(
			"<filterindex>3</filterindex>",
			"<filterindex>3</filterindex>\n  <neueListe><int>1</int><int>2</int></neueListe>"
		);
		expect(buildFreshCompetition(input({ previous: previousFile(withUnknown) }))).toMatchObject({
			ok: false,
			message: expect.stringContaining("neueListe")
		});
	});

	it("lässt eine unbekannte Liste stehen, wenn die Altersklassen gleich bleiben", () => {
		const withUnknown = previousXml().replace(
			"<filterindex>3</filterindex>",
			"<filterindex>3</filterindex>\n  <neueListe><int>1</int><int>2</int></neueListe>"
		);
		const sameGroups: FixtureAgeGroup[] = [NEW_GROUPS[0], NEW_GROUPS[2]];
		const outcome = buildFreshCompetition(
			input({ previous: previousFile(withUnknown), rulebook: rulebookFile(sameGroups, "Wellen-Wk 2026") })
		);
		expect(outcome.ok).toBe(true);
		if (outcome.ok) expect(child(rootOf(outcome.bytes), "neueListe").children).toHaveLength(2);
	});
});

describe("formatXstreamDate", () => {
	it("schreibt das Datum wie JAuswertung in UTC", () => {
		expect(formatXstreamDate(new Date(Date.UTC(2026, 0, 5, 7, 3, 9, 7)))).toBe("2026-01-05 07:03:09.007 UTC");
	});
});
