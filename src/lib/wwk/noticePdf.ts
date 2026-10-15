// Aushang der Gesamtwertung als PDF (A4 Hochformat). Enthält nie Mitgliedernamen.
import {
  createMetrics,
  type FontBytes,
  type TextMetrics,
} from "$lib/certificates/fonts";
import {
  PAGE_HEIGHT_MM,
  PAGE_WIDTH_MM,
  type FontWeight,
} from "$lib/certificates/layout";
import type { DrawOp, TextOp } from "$lib/certificates/render";
import { formatGermanDate } from "$lib/format/date";
import { formatTrophyPoints } from "$lib/format/points";
import { renderPdf } from "$lib/pdf/document";
import { layoutTable, type TableColumn } from "$lib/pdf/table";
import { lineHeightMm, paragraphOps } from "$lib/pdf/text";
import type { EventInfo } from "$lib/settings/settings";
import { displayAgeGroup } from "./ageGroups";
import type { NotScored, Ranking, Standing } from "./scoring";

export interface NoticeInput {
  event: EventInfo;
  rulesParagraphs: string[];
  rescue: Ranking;
  wave: Ranking;
  notScored: NotScored[];
}

const TITLE = "Gesamtwertung";
const BREAKDOWN_TITLE = "Aufschlüsselung der Gesamtwertung";

/** Aushang mit Ranglisten oder Aufschlüsselung je Mannschaft für Rückfragen. */
export type NoticeVariant = "notice" | "breakdown";
const FOOTER_CREDIT = "Erstellt mit Wettkampftools";
const TIE_LINE =
  "Gleichstand um Platz 1 – Entscheidung durch die Wettkampfleitung.";
const NO_STANDINGS = "Keine gewerteten Mannschaften.";
const EVENT_SEPARATOR = " · ";
const NO_PLACE = "–";

const MARGIN_MM = 20;
const CONTENT_WIDTH_MM = PAGE_WIDTH_MM - 2 * MARGIN_MM;
const FOOTER_BASELINE_MM = PAGE_HEIGHT_MM - MARGIN_MM;
const FOOTER_SPACE_MM = 8;
const CONTENT_BOTTOM_MM = FOOTER_BASELINE_MM - FOOTER_SPACE_MM;
/** Überschrift nicht allein am Seitenende stehen lassen */
const KEEP_WITH_NEXT_MM = 15;
const SECTION_GAP_MM = 6;
const BLOCK_GAP_MM = 2;

const SIZE = {
  title: 20,
  event: 11,
  heading: 13,
  subheading: 11,
  body: 10,
  table: 9,
  breakdown: 8,
  footer: 8,
};

const STANDINGS_COLUMNS: TableColumn[] = [
  { header: "Platz", widthMm: 15, align: "right" },
  { header: "Ortsgruppe", widthMm: 115, align: "left" },
  { header: "Pokalpunkte", widthMm: 40, align: "right" },
];
const BREAKDOWN_COLUMNS: TableColumn[] = [
  { header: "Ortsgruppe", widthMm: 33, align: "left" },
  { header: "Mannschaft", widthMm: 33, align: "left" },
  { header: "AK", widthMm: 18, align: "left" },
  { header: "Geschl.", widthMm: 16, align: "left" },
  { header: "Platz", widthMm: 11, align: "right" },
  { header: "Teams", widthMm: 12, align: "right" },
  { header: "Rechnung", widthMm: 27, align: "left" },
  { header: "Pokalpunkte", widthMm: 20, align: "right" },
];
const NOT_SCORED_COLUMNS: TableColumn[] = [
  { header: "Mannschaft", widthMm: 50, align: "left" },
  { header: "Gliederung", widthMm: 50, align: "left" },
  { header: "AK", widthMm: 25, align: "left" },
  { header: "Grund", widthMm: 45, align: "left" },
];

/** Fortlaufender Inhalt über mehrere Seiten. */
class PageFlow {
  readonly pages: DrawOp[][] = [[]];
  private cursorMm = MARGIN_MM;

  constructor(private readonly metrics: TextMetrics) {}

  private get page(): DrawOp[] {
    return this.pages[this.pages.length - 1];
  }

  private newPage(): void {
    this.pages.push([]);
    this.cursorMm = MARGIN_MM;
  }

  gap(mm: number): void {
    this.cursorMm += mm;
  }

  keepSpace(mm: number): void {
    if (this.cursorMm > MARGIN_MM && this.cursorMm + mm > CONTENT_BOTTOM_MM)
      this.newPage();
  }

  paragraph(text: string, weight: FontWeight, sizePt: number): void {
    const place = () =>
      paragraphOps({
        text,
        xMm: MARGIN_MM,
        topMm: this.cursorMm,
        widthMm: CONTENT_WIDTH_MM,
        weight,
        sizePt,
        metrics: this.metrics,
      });
    let layout = place();
    if (layout.endMm > CONTENT_BOTTOM_MM && this.cursorMm > MARGIN_MM) {
      this.newPage();
      layout = place();
    }
    this.page.push(...layout.ops);
    this.cursorMm = layout.endMm;
  }

  heading(text: string, sizePt: number): void {
    this.keepSpace(lineHeightMm(sizePt) + KEEP_WITH_NEXT_MM);
    this.paragraph(text, "bold", sizePt);
    this.gap(BLOCK_GAP_MM);
  }

  table(columns: TableColumn[], rows: string[][], sizePt: number): void {
    const layout = layoutTable({
      columns,
      rows,
      xMm: MARGIN_MM,
      topMm: MARGIN_MM,
      bottomMm: CONTENT_BOTTOM_MM,
      firstPageTopMm: this.cursorMm,
      sizePt,
      headerWeight: "bold",
      bodyWeight: "regular",
      metrics: this.metrics,
    });
    const [first = [], ...rest] = layout.pages;
    this.page.push(...first);
    this.pages.push(...rest);
    this.cursorMm = layout.endMm;
  }
}

export function eventLine(event: EventInfo): string {
  const title = event.title.trim();
  const number = event.number.trim();
  const named = number !== "" && title !== "" ? `${number}. ${title}` : title;
  return [
    named,
    event.host.trim(),
    formatGermanDate(event.date),
    event.venue.trim(),
  ]
    .filter((part) => part !== "")
    .join(EVENT_SEPARATOR);
}

function standingRows(standings: readonly Standing[]): string[][] {
  return standings.map((standing) => [
    String(standing.rank),
    standing.organisation,
    formatTrophyPoints(standing.trophyPoints),
  ]);
}

// Nur Mannschaftsname und Ortsgruppe, keine Mitglieder.
function breakdownRows(standings: readonly Standing[]): string[][] {
  return standings.flatMap((standing) =>
    standing.teams.map((team) => [
      standing.organisation,
      team.row.name,
      displayAgeGroup(team.ageGroup),
      team.gender,
      team.place === null ? NO_PLACE : String(team.place),
      String(team.n),
      team.formula,
      formatTrophyPoints(team.trophyPoints),
    ]),
  );
}

function notScoredRows(entries: readonly NotScored[]): string[][] {
  return entries.map(({ row, message }) => [
    row.name,
    row.organisation,
    row.ageGroupRaw.trim(),
    message,
  ]);
}

function addRanking(flow: PageFlow, heading: string, ranking: Ranking): void {
  flow.heading(heading, SIZE.heading);
  if (ranking.standings.length === 0)
    flow.paragraph(NO_STANDINGS, "regular", SIZE.body);
  else
    flow.table(STANDINGS_COLUMNS, standingRows(ranking.standings), SIZE.table);
  if (ranking.tieForFirst) {
    flow.gap(BLOCK_GAP_MM);
    flow.paragraph(TIE_LINE, "bold", SIZE.body);
  }
  flow.gap(SECTION_GAP_MM);
}

function addBreakdown(flow: PageFlow, input: NoticeInput): void {
  const parts: [string, Ranking][] = [
    ["Rettungswertung", input.rescue],
    ["Wellenwertung", input.wave],
  ];
  for (const [heading, ranking] of parts) {
    if (ranking.standings.length === 0) continue;
    flow.heading(heading, SIZE.subheading);
    flow.table(
      BREAKDOWN_COLUMNS,
      breakdownRows(ranking.standings),
      SIZE.breakdown,
    );
    flow.gap(SECTION_GAP_MM);
  }
}

function addRules(flow: PageFlow, paragraphs: readonly string[]): void {
  flow.heading("Regeln", SIZE.heading);
  for (const paragraph of paragraphs) {
    flow.paragraph(paragraph, "regular", SIZE.body);
    flow.gap(BLOCK_GAP_MM);
  }
}

function footerOps(
  pageNumber: number,
  pageCount: number,
  metrics: TextMetrics,
): TextOp[] {
  const pageLabel = `Seite ${pageNumber} von ${pageCount}`;
  const text = (value: string, xMm: number): TextOp => ({
    kind: "text",
    text: value,
    font: "regular",
    sizePt: SIZE.footer,
    xMm,
    baselineMm: FOOTER_BASELINE_MM,
  });
  const labelWidth = metrics.widthMm(pageLabel, "regular", SIZE.footer);
  return [
    text(FOOTER_CREDIT, MARGIN_MM),
    text(pageLabel, PAGE_WIDTH_MM - MARGIN_MM - labelWidth),
  ];
}

export function buildNoticePages(
  input: NoticeInput,
  metrics: TextMetrics,
  variant: NoticeVariant = "notice",
): DrawOp[][] {
  const flow = new PageFlow(metrics);
  flow.paragraph(variant === "notice" ? TITLE : BREAKDOWN_TITLE, "black", SIZE.title);
  const line = eventLine(input.event);
  if (line !== "") flow.paragraph(line, "regular", SIZE.event);
  flow.gap(SECTION_GAP_MM);
  if (variant === "notice") {
    addRanking(flow, "Rettungswertung – Pokal", input.rescue);
    addRanking(flow, "Wellenwertung – Pokal", input.wave);
  } else {
    addBreakdown(flow, input);
  }
  if (input.notScored.length > 0) {
    flow.heading("Nicht gewertet", SIZE.heading);
    flow.table(NOT_SCORED_COLUMNS, notScoredRows(input.notScored), SIZE.table);
    flow.gap(SECTION_GAP_MM);
  }
  addRules(flow, input.rulesParagraphs);
  const pageCount = flow.pages.length;
  return flow.pages.map((ops, index) => [
    ...ops,
    ...footerOps(index + 1, pageCount, metrics),
  ]);
}

export async function buildNoticePdf(
  input: NoticeInput,
  fonts: FontBytes,
  variant: NoticeVariant = "notice",
): Promise<Uint8Array> {
  const pages = buildNoticePages(input, createMetrics(fonts), variant);
  const title = variant === "notice" ? TITLE : BREAKDOWN_TITLE;
  return renderPdf(pages, { fonts, images: {} }, { title });
}
