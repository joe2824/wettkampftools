// @vitest-environment happy-dom
import { createRawSnippet, flushSync, mount, unmount } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import ActionBar from "./ActionBar.svelte";

let component: ReturnType<typeof mount> | null = null;

const text = (content: string) => createRawSnippet(() => ({ render: () => `<span>${content}</span>` }));

function render(props: Record<string, unknown>) {
	const target = document.createElement("div");
	document.body.append(target);
	component = mount(ActionBar, { target, props: { label: "Aktionen", ...props } });
	flushSync();
	return target;
}

afterEach(() => {
	if (component) unmount(component);
	component = null;
	document.body.innerHTML = "";
});

describe("ActionBar", () => {
	it("ist eine benannte Werkzeugleiste, die unten schwebt", () => {
		const bar = render({ start: text("Links") }).querySelector("[role=toolbar]")!;
		expect(bar.getAttribute("aria-label")).toBe("Aktionen");
		expect(bar.className).toContain("sticky");
		expect(bar.className).toContain("bottom-0");
		expect(bar.className).toContain("border-t");
	});

	it("zeigt links und rechts getrennte Bereiche", () => {
		const target = render({ start: text("Links"), end: text("Rechts") });
		const start = target.querySelector("[data-slot=action-bar-start]")!;
		const end = target.querySelector("[data-slot=action-bar-end]")!;
		expect(start.textContent).toBe("Links");
		expect(end.textContent).toBe("Rechts");
		expect(end.className).toContain("ms-auto");
	});

	it("lässt leere Bereiche weg", () => {
		const target = render({ end: text("Rechts") });
		expect(target.querySelector("[data-slot=action-bar-start]")).toBeNull();
		expect(target.querySelector("[data-slot=action-bar-end]")).not.toBeNull();
	});
});
