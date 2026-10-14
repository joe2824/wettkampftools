import { describe, expect, it, vi } from "vitest";
import { NativeDropRouter, toLogicalPoint, zoneAt, type DropPayload, type NativeDropZone } from "./nativeDrop";

function rect(left: number, top: number, width: number, height: number) {
	return { left, top, right: left + width, bottom: top + height, width, height };
}

function zone(left: number, top: number, width: number, height: number): NativeDropZone {
	return {
		element: { getBoundingClientRect: () => rect(left, top, width, height) },
		onPaths: vi.fn(),
		onHover: vi.fn()
	};
}

describe("toLogicalPoint", () => {
	it("rechnet physische Pixel in CSS-Pixel um", () => {
		expect(toLogicalPoint({ x: 300, y: 150 }, 1.5)).toEqual({ x: 200, y: 100 });
	});

	it("nimmt bei ungültigem Faktor 1 an", () => {
		expect(toLogicalPoint({ x: 30, y: 15 }, 0)).toEqual({ x: 30, y: 15 });
	});
});

describe("zoneAt", () => {
	it("findet die Fläche unter dem Zeiger", () => {
		const top = zone(0, 0, 100, 50);
		const bottom = zone(0, 100, 100, 50);
		expect(zoneAt({ x: 10, y: 120 }, [top, bottom])).toBe(bottom);
		expect(zoneAt({ x: 10, y: 10 }, [top, bottom])).toBe(top);
	});

	it("liefert null außerhalb aller Flächen", () => {
		expect(zoneAt({ x: 500, y: 500 }, [zone(0, 0, 100, 50)])).toBeNull();
	});

	it("bevorzugt die zuletzt angemeldete Fläche (z. B. im Dialog)", () => {
		const page = zone(0, 0, 400, 400);
		const dialog = zone(100, 100, 100, 100);
		expect(zoneAt({ x: 150, y: 150 }, [page, dialog])).toBe(dialog);
	});

	it("übergeht unsichtbare Flächen", () => {
		const hidden = zone(0, 0, 0, 0);
		expect(zoneAt({ x: 0, y: 0 }, [hidden])).toBeNull();
	});
});

describe("NativeDropRouter", () => {
	const at = (type: "enter" | "over" | "drop", x: number, y: number, paths: string[] = []): DropPayload =>
		type === "over" ? { type, position: { x, y } } : { type, paths, position: { x, y } };

	it("hebt die Fläche unter dem Zeiger hervor und wechselt beim Bewegen", () => {
		const router = new NativeDropRouter(() => 1);
		const first = zone(0, 0, 100, 50);
		const second = zone(0, 100, 100, 50);
		router.register(first);
		router.register(second);
		router.handle(at("enter", 10, 10, ["/a.csv"]));
		expect(first.onHover).toHaveBeenLastCalledWith(true);
		router.handle(at("over", 10, 120));
		expect(first.onHover).toHaveBeenLastCalledWith(false);
		expect(second.onHover).toHaveBeenLastCalledWith(true);
		router.handle({ type: "leave" });
		expect(second.onHover).toHaveBeenLastCalledWith(false);
	});

	it("gibt abgelegte Pfade an die Fläche unter dem Zeiger", () => {
		const router = new NativeDropRouter(() => 2);
		const target = zone(0, 0, 100, 50);
		router.register(target);
		router.handle(at("enter", 100, 60, ["/a.xls", "/b.xls"]));
		expect(target.onHover).toHaveBeenLastCalledWith(true);
		router.handle(at("drop", 100, 60, ["/a.xls", "/b.xls"]));
		expect(target.onPaths).toHaveBeenCalledWith(["/a.xls", "/b.xls"]);
		expect(target.onHover).toHaveBeenLastCalledWith(false);
	});

	it("ignoriert Ablegen außerhalb und abgemeldete Flächen", () => {
		const router = new NativeDropRouter(() => 1);
		const target = zone(0, 0, 100, 50);
		const unregister = router.register(target);
		router.handle(at("drop", 300, 300, ["/a.csv"]));
		unregister();
		router.handle(at("drop", 10, 10, ["/a.csv"]));
		expect(target.onPaths).not.toHaveBeenCalled();
		expect(router.size).toBe(0);
	});

	it("ignoriert Ablegen ohne Pfade", () => {
		const router = new NativeDropRouter(() => 1);
		const target = zone(0, 0, 100, 50);
		router.register(target);
		router.handle(at("drop", 10, 10, []));
		expect(target.onPaths).not.toHaveBeenCalled();
	});
});
