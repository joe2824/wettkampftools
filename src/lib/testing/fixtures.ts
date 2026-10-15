const MAX_TEAM_MEMBERS = 5;

export interface MemberFixture {
	lastName: string;
	firstName: string;
	birthYear: number | "";
}

export interface RegistrationTeamFixture {
	gliederung: string;
	name: string;
	ak: string;
	geschlecht: string;
	qualifikation: string;
	meldepunkte: number | "";
	members: MemberFixture[];
}

export interface RegistrationCsvOptions {
	lineEnding?: string;
}

const DEFAULT_MEMBERS: MemberFixture[] = [
	{ lastName: "Meier", firstName: "Anna", birthYear: 2010 },
	{ lastName: "Mustermann", firstName: "Max", birthYear: 2011 },
	{ lastName: "Meier", firstName: "Lena", birthYear: 2010 },
	{ lastName: "Mustermann", firstName: "Erika", birthYear: 2012 }
];

const DEFAULT_TEAM: RegistrationTeamFixture = {
	gliederung: "Musterstadt",
	name: "Musterstadt",
	ak: "AK 12",
	geschlecht: "weiblich",
	qualifikation: "",
	meldepunkte: 0,
	members: DEFAULT_MEMBERS
};

const BASE_HEADERS = ["gliederung", "name", "ak", "geschlecht", "qualifikation", "meldepunkte"];

const quote = (value: string): string => `"${value.replaceAll('"', '""')}"`;

function memberHeaders(index: number): string[] {
	return [`Nachname ${index}`, `Vorname ${index}`, `Jahrgang ${index}`].map(quote);
}

/** Kopfzeile wie im DLRG-Mannschaften-Export (inkl. abschließendem Semikolon). */
function registrationCsvHeader(): string {
	const members = Array.from({ length: MAX_TEAM_MEMBERS }, (_, i) => memberHeaders(i + 1)).flat();
	return [...BASE_HEADERS, ...members].join(";") + ";";
}

function memberCells(member: MemberFixture | undefined): string[] {
	if (!member) return ['""', '""', ""];
	return [quote(member.lastName), quote(member.firstName), String(member.birthYear)];
}

function teamLine(team: RegistrationTeamFixture): string {
	const base = [team.gliederung, team.name, team.ak, team.geschlecht, team.qualifikation].map(quote);
	const members = Array.from({ length: MAX_TEAM_MEMBERS }, (_, i) => memberCells(team.members[i])).flat();
	return [...base, String(team.meldepunkte), ...members].join(";") + ";";
}

/** Baut eine Meldungs-CSV mit Platzhalterdaten. */
export function buildRegistrationCsv(
	teams: Partial<RegistrationTeamFixture>[],
	options: RegistrationCsvOptions = {}
): string {
	const lineEnding = options.lineEnding ?? "\r\n";
	const lines = teams.map((team) => teamLine({ ...DEFAULT_TEAM, ...team }));
	return [registrationCsvHeader(), ...lines].join(lineEnding) + lineEnding;
}
