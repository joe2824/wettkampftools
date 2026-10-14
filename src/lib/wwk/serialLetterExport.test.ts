import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { ResultRow } from "./results";
import { buildSerialLetterSheet } from "./serialLetterExport";

const ORDER = ["AK 12", "AK 13/14", "AkW 13/14"];

function row(overrides: Partial<ResultRow>): ResultRow {
  return {
    sourceRow: 1,
    place: 1,
    name: "Musterstadt 1",
    organisation: "Musterstadt",
    ageGroupRaw: "AK 12",
    gender: "weiblich",
    competitionPoints: 1234.5,
    members: ["Anna Meier", "Max Mustermann"],
    ...overrides,
  };
}

describe("buildSerialLetterSheet", () => {
  it("benennt das Blatt Seriendruck und setzt die Kopfzeile mit Mitgliedern", () => {
    const sheet = buildSerialLetterSheet(
      [
        row({}),
        row({ members: ["Anna Meier", "Max Mustermann", "Max Mustermann"] }),
      ],
      ORDER,
      "team",
    );
    expect(sheet.name).toBe("Seriendruck");
    expect(sheet.rows[0]).toEqual([
      "Platz",
      "Name",
      "Mitglied 1",
      "Mitglied 2",
      "Mitglied 3",
      "Gliederung",
      "Altersklasse",
      "Geschlecht",
      "Punkte",
      "WWK",
    ]);
  });

  it("schreibt im Einzelwettkampf keine Mitgliederspalten und nur Text", () => {
    const sheet = buildSerialLetterSheet(
      [row({ ageGroupRaw: "ak 12", place: 2 })],
      ORDER,
      "individual",
    );
    expect(sheet.rows).toEqual([
      [
        "Platz",
        "Name",
        "Gliederung",
        "Altersklasse",
        "Geschlecht",
        "Punkte",
        "WWK",
      ],
      ["2", "Musterstadt 1", "Musterstadt", "AK 12", "weiblich", "1234,50", ""],
    ]);
  });

  it("füllt fehlende Mitglieder leer auf und setzt WWK x für Wellen-AK", () => {
    const sheet = buildSerialLetterSheet(
      [
        row({
          ageGroupRaw: "AkW 13/14",
          members: ["Anna Meier"],
          competitionPoints: null,
        }),
        row({ place: 2 }),
      ],
      ORDER,
      "team",
    );
    expect(sheet.rows[2]).toEqual([
      "1",
      "Musterstadt 1",
      "Anna Meier",
      "",
      "Musterstadt",
      "AkW 13/14",
      "weiblich",
      "",
      "x",
    ]);
    expect(sheet.rows.flat().every((cell) => typeof cell === "string")).toBe(
      true,
    );
  });

  it("lässt Einträge ohne Platz oder mit unbekannter Altersklasse weg", () => {
    const sheet = buildSerialLetterSheet(
      [
        row({ place: null }),
        row({ ageGroupRaw: "AK 99" }),
        row({ name: "Beispielhausen 1" }),
      ],
      ORDER,
      "individual",
    );
    expect(sheet.rows.slice(1).map((r) => r[1])).toEqual(["Beispielhausen 1"]);
  });

  it("sortiert nach AK, weiblich zuerst, Platz absteigend, dann Name", () => {
    const rows = [
      row({ name: "A", ageGroupRaw: "AkW 13/14", place: 1 }),
      row({ name: "B", ageGroupRaw: "AK 12", gender: "männlich", place: 1 }),
      row({ name: "C", ageGroupRaw: "AK 12", place: 1 }),
      row({ name: "D", ageGroupRaw: "AK 12", place: 2 }),
      row({ name: "F", ageGroupRaw: "AK 13/14", place: 1 }),
      row({ name: "E", ageGroupRaw: "AK 12", place: 2 }),
    ];
    const sheet = buildSerialLetterSheet(rows, ORDER, "individual");
    expect(sheet.rows.slice(1).map((r) => r[1])).toEqual([
      "D",
      "E",
      "C",
      "B",
      "F",
      "A",
    ]);
  });

  it("enthält keine Pokalpunkte", () => {
    const source = readFileSync(
      resolve(__dirname, "serialLetterExport.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/trophy|pokal|scoring/i);
  });
});
