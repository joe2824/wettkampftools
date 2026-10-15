// @vitest-environment happy-dom
import { flushSync, mount, unmount } from "svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import { image, layoutOf, text } from "$lib/testing/layoutObjects";
import LayoutCanvas from "./LayoutCanvas.svelte";

let component: ReturnType<typeof mount> | null = null;

afterEach(() => {
	if (component) unmount(component);
	component = null;
	document.body.innerHTML = "";
});

function render(selectedIds: string[]) {
	const target = document.createElement("div");
	document.body.append(target);
	const onshortcut = vi.fn();
	component = mount(LayoutCanvas, {
		target,
		props: {
			layout: layoutOf([text({ id: "title" }), image({ id: "sig" })]),
			ops: [],
			imageUrls: {},
			backgroundOpacity: null,
			withMemberNames: true,
			zoom: "fit",
			selectedIds,
			guidesEnabled: true,
			onselect: vi.fn(),
			onchange: vi.fn(),
			onshortcut
		}
	});
	flushSync();
	return { target, onshortcut };
}

const handleCount = (target: HTMLElement) => target.querySelectorAll('rect[class*="resize"]').length;

describe("LayoutCanvas", () => {
	it("zeigt Anfasser: Texte seitlich und an Ecken, mehrere Elemente rundum", () => {
		expect(handleCount(render([]).target)).toBe(0);
		unmount(component!);
		expect(handleCount(render(["title"]).target)).toBe(6);
		unmount(component!);
		expect(handleCount(render(["title", "sig"]).target)).toBe(8);
	});

	it("meldet Entf als Löschen", () => {
		const { target, onshortcut } = render(["title"]);
		target.querySelector("svg")?.dispatchEvent(new KeyboardEvent("keydown", { key: "Delete", bubbles: true }));
		expect(onshortcut).toHaveBeenCalledWith({ kind: "delete" });
	});
});
