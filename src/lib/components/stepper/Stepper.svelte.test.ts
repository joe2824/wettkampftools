// @vitest-environment happy-dom
import { createRawSnippet, flushSync, mount, unmount } from "svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import Stepper from "./Stepper.svelte";
import type { Step } from "./stepper";

// Schrittknöpfe brauchen den Tooltip-Kontext der App; hier ohne Bedeutung.
vi.mock("./StepButton.svelte", () => ({ default: () => {} }));

const STEPS: Step[] = [
	{ id: "load", label: "Datei laden", status: "done" },
	{ id: "check", label: "Prüfen", status: "open" },
	{ id: "save", label: "Speichern", status: "locked", lockedReason: "Erst prüfen." }
];

let component: ReturnType<typeof mount> | null = null;

const content = createRawSnippet((step: () => Step) => ({ render: () => `<p>Inhalt ${step().id}</p>` }));

function render(page: string, actions?: ReturnType<typeof createRawSnippet>) {
	const target = document.createElement("div");
	document.body.append(target);
	component = mount(Stepper, { target, props: { page, steps: STEPS, children: content, actions } });
	flushSync();
	return target;
}

const button = (root: Element, label: string) =>
	[...root.querySelectorAll("button")].find((candidate) => candidate.textContent?.includes(label));

afterEach(() => {
	if (component) unmount(component);
	component = null;
	document.body.innerHTML = "";
});

describe("Stepper", () => {
	it("zeigt Zurück und Weiter in der Leiste unten, nicht in der Karte", () => {
		const target = render("footer");
		const bar = target.querySelector("[role=toolbar]")!;
		expect(bar.getAttribute("aria-label")).toBe("Schritt-Navigation");
		expect(button(bar, "Zurück")).toBeDefined();
		const next = button(bar, "Weiter: Speichern")!;
		expect(next.disabled).toBe(true);
		expect(bar.textContent).toContain("Erst prüfen.");
		expect(bar.closest("[data-slot=card]")).toBeNull();
	});

	it("zeigt seitenbezogene Aktionen in der Leiste", () => {
		const actions = createRawSnippet(() => ({ render: () => `<button>PDF erzeugen</button>` }));
		const bar = render("actions", actions).querySelector("[role=toolbar]")!;
		expect(button(bar, "PDF erzeugen")).toBeDefined();
	});
});
