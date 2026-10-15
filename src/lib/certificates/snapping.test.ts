import { describe, expect, it } from "vitest";
import { image, text } from "$lib/testing/layoutObjects";
import { formatSpacing, snapMove, snapResize, type SnapOptions } from "./snapping";

const ON: SnapOptions = { grid: true, guides: true };
const OFF: SnapOptions = { grid: true, guides: false };

/** Bild in einer Spalte (x 50 bis 80) mit Oberkante und Höhe */
const block = (id: string, yMm: number, heightMm = 10) =>
	image({ id, slot: "signature1", xMm: 50, yMm, widthMm: 30, heightMm });

describe("snapMove: Hilfslinien", () => {
	it("rastet auf die Seitenmitte und zeigt die Linie", () => {
		const result = snapMove([image({ xMm: 88, yMm: 200 })], { x: 1, y: 0 }, [], ON);
		expect(result.objects[0].xMm).toBe(90);
		expect(result.guides).toContainEqual({ axis: "x", positionMm: 105 });
	});

	it("rastet auf die Kante eines anderen Objekts", () => {
		const other = image({ id: "other", xMm: 100, yMm: 10 });
		const result = snapMove([image({ xMm: 20, yMm: 200 })], { x: 51.2, y: 0 }, [other], ON);
		expect(result.objects[0].xMm).toBe(70);
		expect(result.guides).toContainEqual({ axis: "x", positionMm: 100 });
	});

	it("rastet Texte Grundlinie auf Grundlinie", () => {
		const other = text({ id: "other", xMm: 0, widthMm: 50, sizePt: 18, yMm: 100 });
		const moving = text({ xMm: 120, widthMm: 60, sizePt: 12, yMm: 100.2 });
		const result = snapMove([moving], { x: 0, y: 0 }, [other], ON);
		expect(result.objects[0].yMm).toBe(100);
		expect(result.guides).toContainEqual({ axis: "y", positionMm: 100 });
	});

	it("schaltet ohne Hilfslinien (Alt oder Schalter) ab, das Raster bleibt", () => {
		const result = snapMove([image({ xMm: 88, yMm: 200 })], { x: 1.3, y: 0 }, [], OFF);
		expect(result.objects[0].xMm).toBe(89.5);
		expect(result.guides).toEqual([]);
		expect(result.spacings).toEqual([]);
	});

	it("rastet nicht außerhalb der Schwelle", () => {
		const result = snapMove([image({ xMm: 80, yMm: 200 })], { x: 0, y: 0 }, [], ON);
		expect(result.objects[0].xMm).toBe(80);
	});
});

describe("snapMove: gleiche Abstände", () => {
	const above = block("above", 10);
	const below = block("below", 60);

	it("rastet mittig zwischen zwei Nachbarn und zeigt beide Abstände", () => {
		const result = snapMove([block("moving", 34.6)], { x: 0, y: 0 }, [above, below], ON);
		expect(result.objects[0].yMm).toBe(35);
		expect(result.spacings).toEqual([
			{ axis: "y", fromMm: 20, toMm: 35, crossMm: 65 },
			{ axis: "y", fromMm: 45, toMm: 60, crossMm: 65 }
		]);
	});

	it("rastet auf den Abstand eines bestehenden Paars", () => {
		const first = block("first", 10);
		const second = block("second", 30);
		const result = snapMove([block("moving", 50.8)], { x: 0, y: 0 }, [first, second], ON);
		expect(result.objects[0].yMm).toBe(50);
		expect(result.spacings).toHaveLength(2);
		expect(result.spacings).toContainEqual({ axis: "y", fromMm: 20, toMm: 30, crossMm: 65 });
		expect(result.spacings).toContainEqual({ axis: "y", fromMm: 40, toMm: 50, crossMm: 65 });
	});

	it("erkennt waagerechte Abstände, z. B. zwischen Unterschriften", () => {
		const left = image({ id: "left", xMm: 20, yMm: 250, widthMm: 40 });
		const right = image({ id: "right", xMm: 150, yMm: 250, widthMm: 40 });
		const middle = image({ id: "middle", xMm: 84.2, yMm: 250, widthMm: 40 });
		const result = snapMove([middle], { x: 0, y: 0 }, [left, right], ON);
		expect(result.objects[0].xMm).toBe(85);
		expect(result.spacings.map((mark) => mark.axis)).toEqual(["x", "x"]);
	});

	it("rastet nicht außerhalb der Schwelle", () => {
		const result = snapMove([block("moving", 33)], { x: 0, y: 0 }, [above, below], ON);
		expect(result.objects[0].yMm).toBe(33);
		expect(result.spacings).toEqual([]);
	});

	it("schaltet mit Alt ab", () => {
		const result = snapMove([block("moving", 34.6)], { x: 0, y: 0 }, [above, below], OFF);
		expect(result.objects[0].yMm).toBe(34.5);
		expect(result.spacings).toEqual([]);
	});

	it("bezieht Objekte in anderen Spalten nicht ein", () => {
		const aside = image({ id: "aside", xMm: 150, yMm: 10, widthMm: 30, heightMm: 10 });
		const result = snapMove([block("moving", 34.6)], { x: 0, y: 0 }, [aside, below], ON);
		expect(result.spacings).toEqual([]);
	});
});

describe("snapResize", () => {
	it("rastet die bewegte Kante auf andere Objekte", () => {
		const other = image({ id: "other", xMm: 100, yMm: 10 });
		const moving = image({ xMm: 20, yMm: 50, widthMm: 30 });
		const result = snapResize([moving], "e", { x: 49.2, y: 0 }, [other], { ...ON, keepAspect: false });
		expect(result.objects[0].widthMm).toBe(80);
		expect(result.guides).toContainEqual({ axis: "x", positionMm: 100 });
	});

	it("rastet die bewegte Kante auf gleiche Abstände", () => {
		const first = block("first", 10);
		const second = block("second", 30);
		const moving = block("moving", 49, 11);
		const result = snapResize([moving], "n", { x: 0, y: 1.6 }, [first, second], { ...ON, keepAspect: false });
		expect(result.objects[0]).toMatchObject({ yMm: 50, heightMm: 10 });
		expect(result.spacings).toHaveLength(2);
	});

	it("schaltet mit Alt ab", () => {
		const other = image({ id: "other", xMm: 100, yMm: 10 });
		const moving = image({ xMm: 20, yMm: 50, widthMm: 30 });
		const result = snapResize([moving], "e", { x: 49.2, y: 0 }, [other], { ...OFF, keepAspect: false });
		expect(result.objects[0].widthMm).toBe(79);
		expect(result.guides).toEqual([]);
	});
});

describe("formatSpacing", () => {
	it("zeigt Millimeter mit einer Nachkommastelle", () => {
		expect(formatSpacing(7.6)).toBe("7,6 mm");
		expect(formatSpacing(10)).toBe("10 mm");
	});
});
