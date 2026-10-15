import { describe, expect, it } from "vitest";
import { ActiveSteps } from "./activeSteps.svelte";

describe("ActiveSteps", () => {
	it("merkt sich den Schritt je Seite", () => {
		const memory = new ActiveSteps();
		memory.set("preparation", "check");
		memory.set("evaluation", "save");
		expect(memory.get("preparation")).toBe("check");
		expect(memory.get("evaluation")).toBe("save");
	});

	it("liefert null für unbekannte Seiten", () => {
		expect(new ActiveSteps().get("certificates")).toBeNull();
	});

	it("setzt den Anfangsschritt nur, wenn noch keiner gemerkt ist", () => {
		const memory = new ActiveSteps();
		memory.init("preparation", "event");
		memory.init("preparation", "load");
		expect(memory.get("preparation")).toBe("event");
	});
});
