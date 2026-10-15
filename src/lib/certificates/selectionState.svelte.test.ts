import { describe, expect, it } from "vitest";
import { NO_HIDDEN } from "./selection";
import { SelectionState } from "./selectionState.svelte";

const resultsA = {};
const resultsB = {};

describe("SelectionState", () => {
	it("behält Filter und Häkchen für dieselbe Ergebnisdatei", () => {
		const state = new SelectionState();
		state.attach(resultsA);
		state.hidden = { ...NO_HIDDEN, genders: ["männlich"] };
		state.excluded = new Set(["row1"]);
		state.attach(resultsA);
		expect(state.hidden.genders).toEqual(["männlich"]);
		expect([...state.excluded]).toEqual(["row1"]);
	});

	it("setzt die Auswahl bei einer anderen Ergebnisdatei zurück", () => {
		const state = new SelectionState();
		state.attach(resultsA);
		state.hidden = { ...NO_HIDDEN, ageGroups: ["AK 10"] };
		state.excluded = new Set(["row1"]);
		state.attach(resultsB);
		expect(state.hidden).toBe(NO_HIDDEN);
		expect(state.excluded.size).toBe(0);
	});
});
