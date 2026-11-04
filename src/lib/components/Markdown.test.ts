// @vitest-environment happy-dom
import { flushSync, mount, unmount } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import Markdown from "./Markdown.svelte";

let component: ReturnType<typeof mount> | null = null;

function render(source: string): HTMLElement {
	const target = document.createElement("div");
	document.body.append(target);
	component = mount(Markdown, { target, props: { source } });
	flushSync();
	return target;
}

afterEach(() => {
	if (component) unmount(component);
	component = null;
	document.body.innerHTML = "";
});

describe("Markdown", () => {
	it("setzt Fett ohne zusätzliche Leerzeichen in den Satz", () => {
		const target = render("- Neu ist **fett**, dann `code`.");
		expect(target.querySelector("li")?.textContent).toBe("Neu ist fett, dann code.");
		expect(target.querySelector("strong")?.textContent).toBe("fett");
	});

	it("zeigt Markup aus den Notes als Text", () => {
		const target = render("<img src=x onerror=alert(1)>");
		expect(target.querySelector("img")).toBeNull();
		expect(target.textContent).toContain("<img");
	});
});
