// Seriendruck-Tabelle für die bisherige Word-Vorlage; alle Zellen als Text.
import { formatCompetitionPoints } from "$lib/format/points";
import type { Cell, Sheet } from "$lib/platform/workbook";
import { classifyAgeGroup } from "./ageGroups";
import { placedEntries, type PlacedEntry } from "./certificateOrder";
import type { CompetitionKind, ResultRow } from "./results";

export const SERIAL_LETTER_SHEET = "Seriendruck";

const WAVE_MARK = "x";

function memberHeaders(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `Mitglied ${index + 1}`);
}

function entryRow(
  entry: PlacedEntry,
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
  const entries = placedEntries(rows, order);
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
