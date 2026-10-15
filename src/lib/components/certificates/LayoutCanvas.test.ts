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

function render(selectedIds: string[], onselect = vi.fn()) {
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
			onselect,
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

function pointer(type: string, x: number, y: number, init: PointerEventInit = {}): PointerEvent {
	return new PointerEvent(type, { clientX: x, clientY: y, button: 0, pointerId: 1, bubbles: true, ...init });
}

// Bildschirm = Millimeter, damit Mausposition und Seitenkoordinaten übereinstimmen.
function canvasSvg(target: HTMLElement): SVGSVGElement {
	const svg = target.querySelector("svg")!;
	svg.getScreenCTM = () => new DOMMatrix() as unknown as SVGMatrix;
	svg.setPointerCapture = () => undefined;
	return svg;
}

describe("LayoutCanvas – Auswahlrahmen", () => {
	it("zeigt beim Ziehen auf freier Fläche einen Rahmen im SVG und markiert erfasste Elemente", () => {
		const onselect = vi.fn();
		const { target } = render([], onselect);
		const svg = canvasSvg(target);
		svg.dispatchEvent(pointer("pointerdown", 20, 240));
		svg.dispatchEvent(pointer("pointermove", 70, 280));
		flushSync();
		const rect = target.querySelector("rect[data-marquee]");
		expect(rect).not.toBeNull();
		expect(rect?.namespaceURI).toBe("http://www.w3.org/2000/svg");
		expect(Number(rect?.getAttribute("width"))).toBe(50);
		expect(target.querySelectorAll("rect[data-marquee-mark]")).toHaveLength(1);
		svg.dispatchEvent(pointer("pointerup", 70, 280));
		flushSync();
		expect(onselect).toHaveBeenLastCalledWith(["sig"]);
		expect(target.querySelector("rect[data-marquee]")).toBeNull();
	});

	it("zieht mit Umschalt auch über einem Element einen Rahmen auf", () => {
		const onselect = vi.fn();
		const { target } = render(["title"], onselect);
		const svg = canvasSvg(target);
		svg.dispatchEvent(pointer("pointerdown", 40, 260, { shiftKey: true }));
		svg.dispatchEvent(pointer("pointermove", 45, 265, { shiftKey: true }));
		flushSync();
		expect(target.querySelector("rect[data-marquee]")).not.toBeNull();
	});
});
