// Pokalwertung: berechnen, als Excel speichern, Aushang-PDF speichern und öffnen.
import { loadAppFonts } from "$lib/certificates/appFonts";
import { logError, logInfo } from "$lib/log";
import { datedFileName, saveFile } from "$lib/platform/files";
import { writeWorkbook } from "$lib/platform/workbook";
import type { SessionResults } from "$lib/session.svelte";
import type { Settings } from "$lib/settings/settings";
import { buildAgeGroupOrder } from "$lib/wwk/ageGroups";
import { buildEvaluationSheets } from "$lib/wwk/evaluationExport";
import { buildNoticePdf, type NoticeVariant } from "$lib/wwk/noticePdf";
import { findSheet } from "$lib/wwk/results";
import { trophyRulesText } from "$lib/wwk/rulesText";
import { rankOrganisations, scoreTeams, type NotScored, type Ranking, type ScoredTeam } from "$lib/wwk/scoring";
import { userMessage } from "./errors";
import { EXCEL_FILTER, openAfterSave, PDF_FILTER } from "./savedFile";

const EVALUATION_FILE_NAME = "WWK_Auswertung.xlsx";
const NOTICE_FILE_NAME = "WWK_Gesamtwertung.pdf";
const BREAKDOWN_FILE_NAME = "WWK_Aufschluesselung.pdf";
export const INDIVIDUAL_COMPETITION_MESSAGE =
	"Diese Datei stammt aus einem Einzelwettkampf. Die Pokalwertung gilt für Mannschaften – Urkunden gibt es unter ‚Urkunden‘.";
const EXCEL_FAILED = "Die Auswertung konnte nicht gespeichert werden.";
const NOTICE_FAILED = "Der Aushang konnte nicht erzeugt werden.";

export interface Evaluation {
	rescue: Ranking;
	wave: Ranking;
	scored: ScoredTeam[];
	notScored: NotScored[];
}

export type EvaluationState =
	{ status: "individualOnly"; message: string } | { status: "ready"; evaluation: Evaluation };

export type ExcelOutcome =
	{ status: "cancelled" } | { status: "saved"; path: string } | { status: "failed"; message: string };

export type NoticeOutcome =
	{ status: "cancelled" } | { status: "saved"; path: string; opened: boolean } | { status: "failed"; message: string };

/** Rein rechnerisch; Einzelwettkämpfe haben keine Pokalwertung. */
export function computeEvaluation(results: Pick<SessionResults, "kind" | "rows">, settings: Settings): EvaluationState {
	if (results.kind === "individual") return { status: "individualOnly", message: INDIVIDUAL_COMPETITION_MESSAGE };
	const order = buildAgeGroupOrder(settings);
	const { scored, notScored } = scoreTeams(results.rows, order, { excludeUnplaced: settings.excludeUnplacedTeams });
	return {
		status: "ready",
		evaluation: {
			rescue: rankOrganisations(scored, "rescue", order),
			wave: rankOrganisations(scored, "wave", order),
			scored,
			notScored
		}
	};
}

/** Excel mit Gesamtwertungen, Aufschlüsselung und Quelldaten samt Pokalpunkten. */
export async function saveEvaluationExcel(
	results: Pick<SessionResults, "workbook">,
	evaluation: Evaluation,
	now: Date = new Date()
): Promise<ExcelOutcome> {
	try {
		const sheets = buildEvaluationSheets({
			rescue: evaluation.rescue.standings,
			wave: evaluation.wave.standings,
			scored: evaluation.scored,
			notScored: evaluation.notScored,
			source: findSheet(results.workbook)
		});
		const bytes = await writeWorkbook(sheets);
		const path = await saveFile({
			defaultName: datedFileName(EVALUATION_FILE_NAME, now),
			filters: [EXCEL_FILTER],
			bytes
		});
		if (path === null) return { status: "cancelled" };
		logInfo("evaluation.saved", { teams: evaluation.scored.length });
		return { status: "saved", path };
	} catch (error) {
		logError("evaluation.failed");
		return { status: "failed", message: userMessage(error, EXCEL_FAILED) };
	}
}

/** Aushang ohne Mitgliedernamen; wird nach dem Speichern geöffnet. */
export async function saveNoticePdf(
	evaluation: Evaluation,
	settings: Settings,
	now: Date = new Date(),
	variant: NoticeVariant = "notice"
): Promise<NoticeOutcome> {
	try {
		const input = {
			event: settings.event,
			rulesParagraphs: trophyRulesText({ excludeUnplaced: settings.excludeUnplacedTeams }),
			rescue: evaluation.rescue,
			wave: evaluation.wave,
			notScored: evaluation.notScored
		};
		const bytes = await buildNoticePdf(input, await loadAppFonts(), variant);
		const fileName = variant === "notice" ? NOTICE_FILE_NAME : BREAKDOWN_FILE_NAME;
		const path = await saveFile({ defaultName: datedFileName(fileName, now), filters: [PDF_FILTER], bytes });
		if (path === null) return { status: "cancelled" };
		logInfo("notice.saved", { organisations: evaluation.rescue.standings.length + evaluation.wave.standings.length });
		return { status: "saved", path, opened: await openAfterSave(path, "notice.openFailed") };
	} catch (error) {
		logError("notice.failed");
		return { status: "failed", message: userMessage(error, NOTICE_FAILED) };
	}
}
