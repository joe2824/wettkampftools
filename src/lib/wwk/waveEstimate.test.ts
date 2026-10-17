import { describe, expect, it } from "vitest";
import type { WaveStatistic } from "$lib/records/waveRecords";
import type { Team } from "./registrations";
import { countWaveStarts, estimateWaveDuration, formatDuration, type WaveStartGroup } from "./waveEstimate";

const RETTEN = "4*50m Retten in der Welle";
const GURT = "4*50m Retten in der Welle mit Gurtretter";

function team(id: string, ageGroup: string, gender: string): Team {
	return {
		id,
		sourceRow: 1,
		organisation: "Musterstadt",
		originalName: "Musterstadt",
		name: "Musterstadt",
		ageGroup,
		ageGroupKnown: true,
		gender,
		qualification: "",
		reportedPoints: "",
		members: []
	};
}

function statistic(ageGroup: string, gender: "female" | "male", discipline: string, average: number): WaveStatistic {
	return {
		ageGroup,
		gender,
		discipline,
		record: {
			ageGroup,
			gender,
			discipline,
			time: average - 2000,
			slowest: average + 2000,
			average,
			teams: 5,
			year: 2024
		},
		average,
		slowest: average + 2000,
		slowestYear: 2019,
		teamsPerYear: 5,
		years: 10
	};
}

const STATISTICS = [
	statistic("AkW offen", "male", RETTEN, 18000),
	statistic("AkW offen", "female", RETTEN, 21000),
	statistic("AkW offen", "male", GURT, 11000)
];

describe("countWaveStarts", () => {
	it("zählt nur ausgewählte Mannschaften, je Wellen-AK und Geschlecht", () => {
		const teams = [
			team("1", "AK offen", "männlich"),
			team("2", "AK offen", "männlich"),
			team("3", "AK offen", "weiblich"),
			team("4", "AK 13/14", "männlich"),
			team("5", "AK offen", "gemischt")
		];
		expect(countWaveStarts(teams, new Set(["1", "2", "3", "5"]))).toEqual([
			{ ageGroup: "AkW offen", gender: "male", teams: 2 },
			{ ageGroup: "AkW offen", gender: "female", teams: 1 }
		]);
	});
});

describe("estimateWaveDuration", () => {
	const starts: WaveStartGroup[] = [
		{ ageGroup: "AkW offen", gender: "male", teams: 3 },
		{ ageGroup: "AkW offen", gender: "female", teams: 2 }
	];

	it("rechnet Läufe mal Durchschnitt plus Pause je Disziplin", () => {
		const estimate = estimateWaveDuration(starts, STATISTICS, [RETTEN], { teamsPerHeat: 2, pauseS: 60 });
		// männlich: 2 Läufe × (180 s + 60 s), weiblich: 1 Lauf × (210 s + 60 s)
		expect(estimate.disciplines).toEqual([
			{ discipline: RETTEN, teams: 5, heats: 3, duration: (2 * 240 + 270) * 100, unknownGroups: [] }
		]);
		expect(estimate.teams).toBe(5);
		expect(estimate.duration).toBe((2 * 240 + 270) * 100);
	});

	it("nimmt für Gruppen ohne Erfahrungswerte den Durchschnitt der Disziplin und nennt sie", () => {
		const estimate = estimateWaveDuration(starts, STATISTICS, [GURT], { teamsPerHeat: 1, pauseS: 0 });
		expect(estimate.disciplines[0]).toMatchObject({
			heats: 5,
			duration: 5 * 11000,
			unknownGroups: ["AkW offen weiblich"]
		});
	});

	it("lässt Disziplinen ohne jede Erfahrung weg und summiert den Rest", () => {
		const estimate = estimateWaveDuration(starts, STATISTICS, [RETTEN, "Schwimmen in der Welle"], {
			teamsPerHeat: 1,
			pauseS: 0
		});
		expect(estimate.disciplines.map((d) => d.discipline)).toEqual([RETTEN]);
		expect(estimate.duration).toBe(3 * 18000 + 2 * 21000);
	});
});

describe("formatDuration", () => {
	it("zeigt Minuten und ab einer Stunde Stunden", () => {
		expect(formatDuration(45 * 60 * 100)).toBe("45 min");
		expect(formatDuration(85 * 60 * 100 + 2000)).toBe("1 h 25 min");
	});
});
