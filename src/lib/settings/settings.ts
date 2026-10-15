import {
	checkBoolean,
	checkIntegerInRange,
	checkNumberInRange,
	checkString,
	checkStringList,
	checkStringMap,
	isRecord,
	IssueCollector,
	parseSection,
	type Checked
} from "./validate";

export const SETTINGS_SCHEMA_VERSION = 1;

export const MIN_COPIES = 1;
export const MAX_COPIES = 10;
export const MAX_PRINT_OFFSET_MM = 20;
export const MAX_TEAM_NAME_LENGTH = 80;

const DEFAULT_COPIES_PER_TEAM = 5;
const DEFAULT_COPIES_PER_INDIVIDUAL = 1;
const SIGNER_COUNT = 2;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export interface Signer {
	name: string;
	role: string;
}

export interface EventInfo {
	number: string;
	title: string;
	host: string;
	/** ISO-Datum (yyyy-mm-dd) oder leer. */
	date: string;
	venue: string;
	signers: [Signer, Signer];
}

export interface CertificateSettings {
	withMemberNames: boolean;
	copiesPerTeam: number;
	copiesPerIndividual: number;
	printOffsetMm: { x: number; y: number };
}

export interface RulebookAgeGroup {
	name: string;
	minMembers: number;
	maxMembers: number;
}

export interface RulebookSummary {
	name: string;
	ageGroups: RulebookAgeGroup[];
}

export interface Settings {
	schemaVersion: typeof SETTINGS_SCHEMA_VERSION;
	ageGroups: string[];
	seniorTeamAgeGroups: string[];
	seniorIndividualAgeGroups: string[];
	waveStartAgeGroup: string;
	simplifySeniorAgeGroups: boolean;
	excludeUnplacedTeams: boolean;
	rulebook: RulebookSummary | null;
	event: EventInfo;
	certificates: CertificateSettings;
	/** Eigener Mannschaftsname je Gliederung (Schlüssel wie in der Meldedatei). */
	teamNameOverrides: Record<string, string>;
	legacyMigrated: boolean;
}

export type ExportedSettings = Omit<Settings, "legacyMigrated">;

export function defaultSettings(): Settings {
	return {
		schemaVersion: SETTINGS_SCHEMA_VERSION,
		ageGroups: ["AK 10", "AK 12", "AK 13/14", "AK 15/16", "AK 17/18", "AK Offen"],
		seniorTeamAgeGroups: ["AK 100", "AK 120", "AK 140", "AK 170", "AK 200", "AK 240", "AK 280+"],
		seniorIndividualAgeGroups: ["AK 25", "AK 30", "AK 35", "AK 40", "AK 45", "AK 50", "AK 55", "AK 60+"],
		waveStartAgeGroup: "AK 13/14",
		simplifySeniorAgeGroups: true,
		excludeUnplacedTeams: true,
		rulebook: null,
		event: {
			number: "",
			title: "Wellenwettkampf",
			host: "DLRG-Ortsgruppe Dorheim",
			date: "",
			venue: "Usa-Wellenbad Bad Nauheim",
			signers: [
				{ name: "", role: "Vorsitzende/r" },
				{ name: "", role: "Wettkampforganisation" }
			]
		},
		certificates: {
			withMemberNames: false,
			copiesPerTeam: DEFAULT_COPIES_PER_TEAM,
			copiesPerIndividual: DEFAULT_COPIES_PER_INDIVIDUAL,
			printOffsetMm: { x: 0, y: 0 }
		},
		teamNameOverrides: {},
		legacyMigrated: false
	};
}

const SETTINGS_KEYS: readonly (keyof Settings)[] = Object.keys(defaultSettings()) as (keyof Settings)[];

/** Wellen-Start muss in den Altersklassen stehen, sonst Standard bzw. erster Eintrag. */
export function resolveWaveStart(candidate: string, ageGroups: readonly string[]): Checked<string> {
	if (ageGroups.includes(candidate)) return { value: candidate };
	const fallback = defaultSettings().waveStartAgeGroup;
	const value = ageGroups.includes(fallback) ? fallback : ageGroups[0];
	return { value, issue: "waveStartAgeGroup.invalid" };
}

function isRulebookAgeGroup(input: unknown): input is RulebookAgeGroup {
	return (
		isRecord(input) &&
		typeof input.name === "string" &&
		Number.isInteger(input.minMembers) &&
		Number.isInteger(input.maxMembers) &&
		(input.minMembers as number) >= 0 &&
		(input.minMembers as number) <= (input.maxMembers as number)
	);
}

function checkRulebook(input: unknown): Checked<RulebookSummary | null> {
	if (input === null) return { value: null };
	const invalid = { value: null, issue: "rulebook.invalid" };
	if (!isRecord(input) || typeof input.name !== "string" || !Array.isArray(input.ageGroups)) return invalid;
	if (!input.ageGroups.every(isRulebookAgeGroup)) return invalid;
	const ageGroups = input.ageGroups.map(({ name, minMembers, maxMembers }) => ({ name, minMembers, maxMembers }));
	return { value: { name: input.name, ageGroups } };
}

function parseSigner(
	input: Record<string, unknown>,
	fallback: Signer,
	field: string,
	collector: IssueCollector
): Signer {
	return {
		name: collector.take(input, "name", fallback.name, () => checkString(input.name, fallback.name, `${field}.name`)),
		role: collector.take(input, "role", fallback.role, () => checkString(input.role, fallback.role, `${field}.role`))
	};
}

function parseSigners(input: unknown, fallback: EventInfo["signers"], collector: IssueCollector): EventInfo["signers"] {
	if (!Array.isArray(input) || input.length !== SIGNER_COUNT || !input.every(isRecord)) {
		collector.report("event.signers.invalid");
		return fallback;
	}
	return [
		parseSigner(input[0], fallback[0], "event.signers.0", collector),
		parseSigner(input[1], fallback[1], "event.signers.1", collector)
	];
}

function checkIsoDate(input: unknown, fallback: string): Checked<string> {
	const valid = typeof input === "string" && (input === "" || ISO_DATE_PATTERN.test(input));
	return valid ? { value: input } : { value: fallback, issue: "event.date.invalid" };
}

function parseEvent(input: Record<string, unknown>, fallback: EventInfo, collector: IssueCollector): EventInfo {
	const text = (key: "number" | "title" | "host" | "venue") =>
		collector.take(input, key, fallback[key], () => checkString(input[key], fallback[key], `event.${key}`));
	return {
		number: text("number"),
		title: text("title"),
		host: text("host"),
		date: collector.take(input, "date", fallback.date, () => checkIsoDate(input.date, fallback.date)),
		venue: text("venue"),
		signers: "signers" in input ? parseSigners(input.signers, fallback.signers, collector) : fallback.signers
	};
}

function parseOffset(input: unknown, fallback: CertificateSettings["printOffsetMm"], collector: IssueCollector) {
	if (!isRecord(input)) {
		collector.report("certificates.printOffsetMm.invalid");
		return fallback;
	}
	const axis = (key: "x" | "y") =>
		collector.take(input, key, fallback[key], () =>
			checkNumberInRange(
				input[key],
				fallback[key],
				-MAX_PRINT_OFFSET_MM,
				MAX_PRINT_OFFSET_MM,
				`certificates.printOffsetMm.${key}`
			)
		);
	return { x: axis("x"), y: axis("y") };
}

function parseCertificates(
	input: Record<string, unknown>,
	fallback: CertificateSettings,
	collector: IssueCollector
): CertificateSettings {
	const copies = (key: "copiesPerTeam" | "copiesPerIndividual") =>
		collector.take(input, key, fallback[key], () =>
			checkIntegerInRange(input[key], fallback[key], MIN_COPIES, MAX_COPIES, `certificates.${key}`)
		);
	return {
		withMemberNames: collector.take(input, "withMemberNames", fallback.withMemberNames, () =>
			checkBoolean(input.withMemberNames, fallback.withMemberNames, "certificates.withMemberNames")
		),
		copiesPerTeam: copies("copiesPerTeam"),
		copiesPerIndividual: copies("copiesPerIndividual"),
		printOffsetMm:
			"printOffsetMm" in input
				? parseOffset(input.printOffsetMm, fallback.printOffsetMm, collector)
				: fallback.printOffsetMm
	};
}

type ListKey = "ageGroups" | "seniorTeamAgeGroups" | "seniorIndividualAgeGroups";
type FlagKey = "simplifySeniorAgeGroups" | "excludeUnplacedTeams" | "legacyMigrated";

/** Prüft Einstellungen beim Laden und Importieren; wirft nie. */
export function parseSettings(input: unknown): { settings: Settings; issues: string[] } {
	const settings = defaultSettings();
	if (!isRecord(input)) return { settings, issues: ["root.invalid"] };
	const collector = new IssueCollector();
	if (Object.keys(input).some((key) => !(SETTINGS_KEYS as readonly string[]).includes(key))) {
		collector.report("unknownKeys.dropped");
	}
	if ("schemaVersion" in input && input.schemaVersion !== SETTINGS_SCHEMA_VERSION) {
		collector.report("schemaVersion.unsupported");
	}
	const list = (key: ListKey) =>
		collector.take(input, key, settings[key], () => checkStringList(input[key], settings[key], key));
	const flag = (key: FlagKey) =>
		collector.take(input, key, settings[key], () => checkBoolean(input[key], settings[key], key));

	settings.ageGroups = list("ageGroups");
	settings.seniorTeamAgeGroups = list("seniorTeamAgeGroups");
	settings.seniorIndividualAgeGroups = list("seniorIndividualAgeGroups");
	const waveStart = resolveWaveStart(
		collector.take(input, "waveStartAgeGroup", settings.waveStartAgeGroup, () =>
			checkString(input.waveStartAgeGroup, settings.waveStartAgeGroup, "waveStartAgeGroup")
		),
		settings.ageGroups
	);
	if (waveStart.issue) collector.report(waveStart.issue);
	settings.waveStartAgeGroup = waveStart.value;
	settings.simplifySeniorAgeGroups = flag("simplifySeniorAgeGroups");
	settings.excludeUnplacedTeams = flag("excludeUnplacedTeams");
	settings.rulebook = collector.take(input, "rulebook", settings.rulebook, () => checkRulebook(input.rulebook));
	settings.event = parseSection(input, "event", settings.event, collector, parseEvent);
	settings.certificates = parseSection(input, "certificates", settings.certificates, collector, parseCertificates);
	settings.teamNameOverrides = collector.take(input, "teamNameOverrides", settings.teamNameOverrides, () =>
		checkStringMap(input.teamNameOverrides, MAX_TEAM_NAME_LENGTH, "teamNameOverrides")
	);
	settings.legacyMigrated = flag("legacyMigrated");
	return { settings, issues: collector.issues };
}

/** Für den Export: ohne Übernahme-Merker (Einstellungen enthalten keine Bilder). */
export function serializeSettingsForExport(settings: Settings): ExportedSettings {
	const { legacyMigrated: _omitted, ...exported } = structuredClone(settings);
	return exported;
}
