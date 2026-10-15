import { describe, expect, it } from "vitest";
import { canEnter, firstOpen, nextStep, prevStep, resolveActive, type Step } from "./stepper";

const steps: Step[] = [
	{ id: "a", label: "Eins", status: "done" },
	{ id: "b", label: "Zwei", status: "warning" },
	{ id: "c", label: "Drei", status: "open" },
	{ id: "d", label: "Vier", status: "locked", lockedReason: "Zuerst laden." }
];

describe("canEnter", () => {
	it("erlaubt alles außer gesperrten und unbekannten Schritten", () => {
		expect(canEnter(steps, "a")).toBe(true);
		expect(canEnter(steps, "b")).toBe(true);
		expect(canEnter(steps, "d")).toBe(false);
		expect(canEnter(steps, "x")).toBe(false);
	});
});

describe("nextStep / prevStep", () => {
	it("liefert den Nachbarn, auch wenn er gesperrt ist", () => {
		expect(nextStep(steps, "c")?.id).toBe("d");
		expect(prevStep(steps, "b")?.id).toBe("a");
	});

	it("liefert null am Rand oder bei unbekannter ID", () => {
		expect(nextStep(steps, "d")).toBeNull();
		expect(prevStep(steps, "a")).toBeNull();
		expect(nextStep(steps, "x")).toBeNull();
		expect(prevStep(steps, "x")).toBeNull();
	});
});

describe("firstOpen", () => {
	it("nimmt den ersten nicht erledigten, betretbaren Schritt", () => {
		expect(firstOpen(steps)?.id).toBe("b");
	});

	it("nimmt sonst den letzten betretbaren Schritt", () => {
		const allDone: Step[] = [
			{ id: "a", label: "Eins", status: "done" },
			{ id: "b", label: "Zwei", status: "done" },
			{ id: "c", label: "Drei", status: "locked" }
		];
		expect(firstOpen(allDone)?.id).toBe("b");
	});

	it("liefert null ohne Schritte", () => {
		expect(firstOpen([])).toBeNull();
	});
});

describe("resolveActive", () => {
	it("behält den gemerkten Schritt, solange er betretbar ist", () => {
		expect(resolveActive(steps, "a")).toBe("a");
	});

	it("fällt auf den ersten offenen Schritt zurück", () => {
		expect(resolveActive(steps, "d")).toBe("b");
		expect(resolveActive(steps, null)).toBe("b");
		expect(resolveActive(steps, "x")).toBe("b");
	});

	it("liefert den ersten Schritt, wenn nichts betretbar ist", () => {
		expect(resolveActive([{ id: "a", label: "Eins", status: "locked" }], null)).toBe("a");
	});
});
