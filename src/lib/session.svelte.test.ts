import { describe, expect, it } from "vitest";
import { SessionState, type SessionRegistration, type SessionResults } from "./session.svelte";

const registration: SessionRegistration = {
	fileName: "meldungen.csv",
	sourceBytes: new Uint8Array(),
	settingsKey: "",
	encoding: "utf-8",
	teams: [],
	renames: [],
	waveSelection: new Set()
};

const results: SessionResults = {
	fileName: "ergebnisse.xlsx",
	createdMs: null,
	modifiedMs: 0,
	workbook: { sheets: [], properties: { created: null, modified: null } },
	kind: "team",
	rows: [],
	yearWarning: null,
	creationUnknown: false,
	yearConfirmed: false
};

describe("SessionState", () => {
	it("ist anfangs leer", () => {
		const session = new SessionState();
		expect(session.registration).toBeNull();
		expect(session.results).toBeNull();
		expect(session.hasRegistration).toBe(false);
		expect(session.hasResults).toBe(false);
	});

	it("merkt Meldungen und Ergebnisse", () => {
		const session = new SessionState();
		session.setRegistration(registration);
		session.setResults(results);
		expect(session.hasRegistration).toBe(true);
		expect(session.hasResults).toBe(true);
		expect(session.results?.fileName).toBe("ergebnisse.xlsx");
	});

	it("ersetzt die Wellen-Auswahl", () => {
		const session = new SessionState();
		session.setWaveSelection(["a"]);
		expect(session.registration).toBeNull();
		session.setRegistration(registration);
		session.setWaveSelection(["a", "b"]);
		expect([...(session.registration?.waveSelection ?? [])]).toEqual(["a", "b"]);
		expect(registration.waveSelection.size).toBe(0);
	});

	it("leert alles", () => {
		const session = new SessionState();
		session.setRegistration(registration);
		session.setResults(results);
		session.clear();
		expect(session.hasRegistration).toBe(false);
		expect(session.hasResults).toBe(false);
	});
});
