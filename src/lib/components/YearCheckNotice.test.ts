// @vitest-environment happy-dom
import { flushSync, mount, unmount } from "svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import { session, type SessionResults } from "$lib/session.svelte";
import YearCheckNotice from "./YearCheckNotice.svelte";

const RESULTS: SessionResults = {
	fileName: "JAuswertung.xls",
	createdMs: null,
	modifiedMs: 0,
	workbook: { sheets: [], properties: { created: null, modified: null } },
	kind: "team",
	rows: [],
	yearWarning: 2025,
	creationUnknown: false,
	yearConfirmed: false
};

let component: ReturnType<typeof mount> | null = null;

function render(results: SessionResults, onreplace = vi.fn()) {
	const target = document.createElement("div");
	document.body.append(target);
	component = mount(YearCheckNotice, { target, props: { results, onreplace } });
	flushSync();
	return { target, onreplace };
}

const button = (target: HTMLElement, label: string) =>
	[...target.querySelectorAll("button")].find((candidate) => candidate.textContent?.includes(label))!;

afterEach(() => {
	if (component) unmount(component);
	component = null;
	document.body.innerHTML = "";
	session.clear();
});

describe("YearCheckNotice", () => {
	it("fragt deutlich nach und bestätigt die Datei", () => {
		session.setResults(RESULTS);
		const { target } = render(RESULTS);
		expect(target.querySelector('[role="alert"]')?.textContent).toContain("Diese Datei stammt aus 2025.");
		button(target, "Ja, Datei ist richtig").click();
		expect(session.results?.yearConfirmed).toBe(true);
	});

	it("bietet eine andere Datei an", () => {
		const { target, onreplace } = render(RESULTS);
		button(target, "Andere Datei laden").click();
		expect(onreplace).toHaveBeenCalledOnce();
	});

	it("zeigt nach der Bestätigung nur noch einen ruhigen Hinweis", () => {
		const { target } = render({ ...RESULTS, yearConfirmed: true });
		expect(target.querySelector('[role="alert"]')).toBeNull();
		expect(target.textContent).toContain("als richtig bestätigt");
	});

	it("weist auf ein unbekanntes Erstellungsdatum hin", () => {
		const { target } = render({ ...RESULTS, yearWarning: null, creationUnknown: true });
		expect(target.textContent).toContain("Erstellungsdatum der Datei unbekannt");
		expect(target.querySelector("button")).toBeNull();
	});
});
