// Seriendruck-Tabelle für die bisherige Word-Vorlage; alle Zellen als Text.
import { formatCompetitionPoints } from "$lib/format/points";
import type { Cell, Sheet } from "$lib/platform/workbook";
import { classifyAgeGroup, compareAgeGroups, matchAgeGroup } from "./ageGroups";
import type { CompetitionKind, ResultRow } from "./results";

export const SERIAL_LETTER_SHEET = "Seriendruck";

const WAVE_MARK = "x";

interface Entry {
  row: ResultRow;
  place: number;
  ageGroup: string;
}

function toEntry(row: ResultRow, order: readonly string[]): Entry | null {
  const match = matchAgeGroup(row.ageGroupRaw, order);
  if (row.place === null || match.kind === "unknown") return null;
  return { row, place: row.place, ageGroup: match.name };
}

/** AK nach Reihenfolge, weiblich zuerst, letzter Platz zuerst, dann Name. */
function compareEntries(
  order: readonly string[],
): (a: Entry, b: Entry) => number {
  const byAgeGroup = compareAgeGroups(order);
  return (a, b) =>
    byAgeGroup(a.ageGroup, b.ageGroup) ||
    b.row.gender.localeCompare(a.row.gender, "de") ||
    b.place - a.place ||
    a.row.name.localeCompare(b.row.name, "de");
}

function memberHeaders(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `Mitglied ${index + 1}`);
}

function entryRow(
  entry: Entry,
  memberCount: number,
  order: readonly string[],
): Cell[] {
  const { row } = entry;
  const members = memberHeaders(memberCount).map(
    (_, index) => row.members[index] ?? "",
  );
  return [
    String(entry.place),
    row.name,
    ...members,
    row.organisation,
    entry.ageGroup,
    row.gender,
    formatCompetitionPoints(row.competitionPoints),
    classifyAgeGroup(entry.ageGroup, order) === "wave" ? WAVE_MARK : "",
  ];
}

export function buildSerialLetterSheet(
  rows: readonly ResultRow[],
  order: readonly string[],
  kind: CompetitionKind,
): Sheet {
  const entries = rows
    .map((row) => toEntry(row, order))
    .filter((entry): entry is Entry => entry !== null)
    .sort(compareEntries(order));
  const memberCount =
    kind === "team"
      ? Math.max(0, ...entries.map((entry) => entry.row.members.length))
      : 0;
  const header = [
    "Platz",
    "Name",
    ...memberHeaders(memberCount),
    "Gliederung",
    "Altersklasse",
    "Geschlecht",
    "Punkte",
    "WWK",
  ];
  return {
    name: SERIAL_LETTER_SHEET,
    rows: [
      header,
      ...entries.map((entry) => entryRow(entry, memberCount, order)),
    ],
  };
}
