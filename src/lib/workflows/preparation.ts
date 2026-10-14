// Vorbereitung: Meldedatei einlesen, prüfen, Welle wählen, für JAuswertung speichern.
import { MissingColumnsError, parseRegistrationCsv, type TextEncodingName } from "$lib/io/csv";
import { logInfo } from "$lib/log";
import { datedFileName, saveFile } from "$lib/platform/files";
import { readWorkbook, writeWorkbook } from "$lib/platform/workbook";
import type { SessionRegistration } from "$lib/session.svelte";
import type { Settings } from "$lib/settings/settings";
import {
	buildRegistrationRows,
	defaultWaveSelection,
	expectedCounts,
	toRegistrationSheet,
	verifyRegistrationSheet,
	type ExpectedCounts,
	type ExportRow,
	type VerificationResult,
} from "$lib/wwk/registrationExport";
import { parseRegistrations, type Team } from "$lib/wwk/registrations";
import { errorTeamIds, validateTeams, type Issue } from "$lib/wwk/validation";

export const REGISTRATION_FILE_NAME = "WWK_Meldungen.xlsx";
const EXCEL_FILTER = { name: "Excel-Datei", extensions: ["xlsx"] };
const LOCALE = "de";

const ENCODING_LABELS: Record<TextEncodingName, string> = {
	"utf-8": "UTF-8",
	"windows-1252": "Windows (ältere Exporte)",
};

const NOT_A_TEAM_EXPORT =
	"Diese Datei scheint kein Mannschaften-Export zu sein. Bitte im DLRG-Meldeportal die Mannschaften als CSV exportieren und diese Datei laden.";

export type LoadOutcome = { ok: true; registration: SessionRegistration } | { ok: false; message: string };

export interface RegistrationSummary {
	teams: number;
	organisations: number;
	encodingLabel: string;
}

export interface PreparationCheck {
	rows: ExportRow[];
	errors: Issue[];
	warnings: Issue[];
	excludedRows: ExportRow[];
	exportableRows: ExportRow[];
}

export interface OrganisationGroup {
	organisation: string;
	teams: Team[];
	selected: number;
}

export type ExportOutcome =
	| { status: "cancelled" }
	| { status: "saved"; path: string; expected: ExpectedCounts; verification: VerificationResult };

export function loadRegistrations(bytes: Uint8Array, fileName: string, settings: Settings): LoadOutcome {
	try {
		const { encoding, rows } = parseRegistrationCsv(bytes);
		const { teams, renames } = parseRegistrations(rows, settings);
		logInfo("preparation.loaded", { teams: teams.length, renames: renames.length });
		const waveSelection = defaultWaveSelection(teams, settings);
		const settingsKey = registrationSettingsKey(settings);
		return {
			ok: true,
			registration: { fileName, sourceBytes: bytes, settingsKey, encoding, teams, renames, waveSelection },
		};
	} catch (error) {
		if (error instanceof MissingColumnsError) return { ok: false, message: NOT_A_TEAM_EXPORT };
		throw error;
	}
}

/** Nur die Einstellungen, die das Einlesen beeinflussen. */
export function registrationSettingsKey(settings: Settings): string {
	const { ageGroups, seniorTeamAgeGroups, seniorIndividualAgeGroups, waveStartAgeGroup, simplifySeniorAgeGroups } =
		settings;
	return JSON.stringify([
		ageGroups,
		seniorTeamAgeGroups,
		seniorIndividualAgeGroups,
		waveStartAgeGroup,
		simplifySeniorAgeGroups,
	]);
}

export function summarizeRegistration(registration: SessionRegistration): RegistrationSummary {
	return {
		teams: registration.teams.length,
		organisations: new Set(registration.teams.map((team) => team.organisation)).size,
		encodingLabel: ENCODING_LABELS[registration.encoding],
	};
}

/** Prüft genau die Zeilen, die exportiert würden (Teams plus Wellen-Kopien). */
export function checkRegistration(registration: SessionRegistration, settings: Settings): PreparationCheck {
	const rows = buildRegistrationRows(registration.teams, registration.waveSelection, settings);
	const issues = validateTeams(rows, { rulebook: settings.rulebook });
	const blocked = errorTeamIds(issues);
	return {
		rows,
		errors: issues.filter((issue) => issue.severity === "error"),
		warnings: issues.filter((issue) => issue.severity === "warning"),
		excludedRows: rows.filter((row) => blocked.has(row.id)),
		exportableRows: rows.filter((row) => !blocked.has(row.id)),
	};
}

/** Original und Wellen-Kopie liefern oft denselben Text; jeder Text nur einmal. */
export function uniqueIssueMessages(issues: readonly Issue[]): string[] {
	return [...new Set(issues.map((issue) => issue.message))];
}

export function groupByOrganisation(teams: readonly Team[], selection: ReadonlySet<string>): OrganisationGroup[] {
	const groups = new Map<string, Team[]>();
	for (const team of teams) groups.set(team.organisation, [...(groups.get(team.organisation) ?? []), team]);
	return [...groups]
		.map(([organisation, members]) => ({
			organisation,
			teams: members,
			selected: members.filter((team) => selection.has(team.id)).length,
		}))
		.sort((a, b) => a.organisation.localeCompare(b.organisation, LOCALE));
}

export function setTeamsInWave(selection: ReadonlySet<string>, teamIds: readonly string[], inWave: boolean): Set<string> {
	const next = new Set(selection);
	for (const id of teamIds) {
		if (inWave) next.add(id);
		else next.delete(id);
	}
	return next;
}

/** Schreibt die Meldungen, liest die Datei zurück und prüft die Anzahlen. */
export async function exportRegistrations(rows: readonly ExportRow[]): Promise<ExportOutcome> {
	const bytes = await writeWorkbook([toRegistrationSheet(rows)]);
	const path = await saveFile({
		defaultName: datedFileName(REGISTRATION_FILE_NAME),
		filters: [EXCEL_FILTER],
		bytes,
	});
	if (path === null) return { status: "cancelled" };
	const expected = expectedCounts(rows);
	const verification = verifyRegistrationSheet(await readWorkbook(bytes), expected);
	logInfo("preparation.exported", { rows: expected.total, verified: verification.ok });
	return { status: "saved", path, expected, verification };
}
