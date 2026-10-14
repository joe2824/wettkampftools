import { describe, expect, it } from "vitest";
import { defaultSettings, type EventInfo } from "./settings";
import { eventHeadline, isEventComplete, nextCompetitionEvent, nextCompetitionHint } from "./eventInfo";

function event(overrides: Partial<EventInfo> = {}): EventInfo {
	return { ...defaultSettings().event, ...overrides };
}

describe("nextCompetitionEvent", () => {
	it("zählt eine ganze Zahl hoch und leert das Datum", () => {
		const current = event({
			number: "39",
			date: "2026-11-14",
			signers: [
				{ name: "Anna Meier", role: "Vorsitzende" },
				{ name: "Max Mustermann", role: "Wettkampforganisation" }
			]
		});
		const next = nextCompetitionEvent(current);
		expect(next).toEqual({ ...current, number: "40", date: "" });
		expect(current.number).toBe("39");
	});

	it("verträgt Leerzeichen um die Zahl", () => {
		expect(nextCompetitionEvent(event({ number: " 9 " })).number).toBe("10");
	});

	it("lässt eine Nummer, die keine ganze Zahl ist, unverändert", () => {
		expect(nextCompetitionEvent(event({ number: "XXXIX" })).number).toBe("XXXIX");
		expect(nextCompetitionEvent(event({ number: "39a" })).number).toBe("39a");
		expect(nextCompetitionEvent(event({ number: "3.5" })).number).toBe("3.5");
	});

	it("lässt eine leere Nummer leer", () => {
		const next = nextCompetitionEvent(event({ number: "", date: "2026-11-14" }));
		expect(next.number).toBe("");
		expect(next.date).toBe("");
	});

	it("kopiert die Unterzeichner", () => {
		const current = event();
		const next = nextCompetitionEvent(current);
		next.signers[0].name = "Anna Meier";
		expect(current.signers[0].name).toBe("");
	});
});

describe("isEventComplete", () => {
	it("verlangt Nummer, Titel und Datum", () => {
		expect(isEventComplete(event({ number: "39", title: "Wellenwettkampf", date: "2026-11-14" }))).toBe(true);
		expect(isEventComplete(event({ number: "", title: "Wellenwettkampf", date: "2026-11-14" }))).toBe(false);
		expect(isEventComplete(event({ number: "39", title: " ", date: "2026-11-14" }))).toBe(false);
		expect(isEventComplete(event({ number: "39", title: "Wellenwettkampf", date: "" }))).toBe(false);
	});
});

describe("eventHeadline", () => {
	it("setzt Nummer und Titel zusammen", () => {
		expect(eventHeadline(event({ number: "39", title: "Wellenwettkampf" }))).toBe("39. Wellenwettkampf");
	});

	it("kommt ohne Nummer aus", () => {
		expect(eventHeadline(event({ number: "", title: "Wellenwettkampf" }))).toBe("Wellenwettkampf");
	});

	it("nennt einen Ersatz, wenn nichts eingetragen ist", () => {
		expect(eventHeadline(event({ number: "", title: "" }))).toBe("Veranstaltung ohne Titel");
	});
});

describe("nextCompetitionHint", () => {
	it("nennt die neue Nummer", () => {
		expect(nextCompetitionHint(event({ number: "39" }))).toBe("Die Nummer wird auf 40 erhöht, das Datum geleert.");
	});

	it("erwähnt nur das Datum, wenn die Nummer bleibt", () => {
		expect(nextCompetitionHint(event({ number: "" }))).toBe("Das Datum wird geleert.");
		expect(nextCompetitionHint(event({ number: "XXXIX" }))).toBe("Das Datum wird geleert.");
	});
});
