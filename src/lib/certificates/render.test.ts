import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { createMetrics, loadFontBytes } from "./fonts";
import {
	LAYOUT_SCHEMA_VERSION,
	type ImageObject,
	type Layout,
	type LayoutObject,
	type MapObject,
	type TextObject
} from "./layout";
import { defaultLayouts } from "./layoutDefaults";
import { grayCss, layoutPage, textSpans, type DrawOp, type RenderOptions, type TextOp } from "./render";

const metrics = createMetrics(await loadFontBytes(async (path) => new Uint8Array(await readFile(`static${path}`))));

const OPTIONS: RenderOptions = {
	withMemberNames: true,
	offsetMm: { x: 0, y: 0 },
	availableSlots: new Set(["signature1", "signature2"])
};

function text(overrides: Partial<TextObject> = {}): TextObject {
	return {
		id: "t",
		kind: "text",
		label: "Text",
		xMm: 25,
		yMm: 100,
		widthMm: 160,
		align: "center",
		font: "regular",
		boldFont: "black",
		sizePt: 18,
		minSizePt: 12,
		template: "{name}",
		visibleWhen: "always",
		...overrides
	};
}

const image: ImageObject = {
	id: "signature1",
	kind: "image",
	label: "Unterschrift 1",
	slot: "signature1",
	xMm: 40,
	yMm: 200,
	widthMm: 30,
	heightMm: 20
};

const page = (objects: LayoutObject[]): Layout => ({
	schemaVersion: LAYOUT_SCHEMA_VERSION,
	variant: "team",
	objects
});
const textOps = (ops: DrawOp[]) => ops.filter((op): op is TextOp => op.kind === "text");

function lineExtent(ops: TextOp[]): { left: number; right: number } {
	const last = ops[ops.length - 1];
	return {
		left: ops[0].xMm,
		right: last.xMm + metrics.widthMm(last.text, last.font, last.sizePt)
	};
}

describe("layoutPage – Text", () => {
	it("zentriert innerhalb der Breite", () => {
		const ops = textOps(layoutPage(page([text()]), { name: "Anna Meier" }, OPTIONS, metrics));
		expect(ops).toHaveLength(1);
		const { left, right } = lineExtent(ops);
		expect(Math.abs(left - 25 - (185 - right))).toBeLessThan(0.01);
		expect(ops[0].baselineMm).toBe(100);
		expect(ops[0].sizePt).toBe(18);
	});

	it("richtet links und rechts aus", () => {
		const values = { name: "Max Mustermann" };
		const [left] = textOps(layoutPage(page([text({ align: "left" })]), values, OPTIONS, metrics));
		expect(left.xMm).toBe(25);
		const right = textOps(layoutPage(page([text({ align: "right" })]), values, OPTIONS, metrics));
		expect(lineExtent(right).right).toBeCloseTo(185, 6);
	});

	it("setzt fette Abschnitte im Fettschnitt und behält Leerzeichen", () => {
		const ops = textOps(
			layoutPage(
				page([text({ template: "mit **{wettkampfpunkte}** Punkten" })]),
				{ wettkampfpunkte: "1234" },
				OPTIONS,
				metrics
			)
		);
		expect(ops.map((op) => [op.text, op.font])).toEqual([
			["mit ", "regular"],
			["1234", "black"],
			[" Punkten", "regular"]
		]);
		const firstWidth = metrics.widthMm("mit ", "regular", 18);
		expect(ops[1].xMm).toBeCloseTo(ops[0].xMm + firstWidth, 6);
		const { left, right } = lineExtent(ops);
		expect(Math.abs(left - 25 - (185 - right))).toBeLessThan(0.01);
	});

	it("verkleinert zu lange Texte bis zur Breite", () => {
		const object = text({ widthMm: 60, sizePt: 18, minSizePt: 8 });
		const ops = textOps(layoutPage(page([object]), { name: "Max Mustermann aus Beispielhausen" }, OPTIONS, metrics));
		expect(ops[0].sizePt).toBeLessThan(18);
		expect(ops[0].sizePt).toBeGreaterThanOrEqual(8);
		expect((ops[0].sizePt * 2) % 1).toBe(0);
		expect(metrics.widthMm(ops[0].text, "regular", ops[0].sizePt)).toBeLessThanOrEqual(60);
		expect(metrics.widthMm(ops[0].text, "regular", ops[0].sizePt + 0.5)).toBeGreaterThan(60);
	});

	it("verkleinert nie unter die Mindestgröße", () => {
		const object = text({ widthMm: 10, sizePt: 18, minSizePt: 12.3 });
		const [op] = textOps(layoutPage(page([object]), { name: "Max Mustermann" }, OPTIONS, metrics));
		expect(op.sizePt).toBe(12.3);
	});

	it("blendet Mitgliedszeilen ohne Mitgliedsnamen aus", () => {
		const member = text({
			template: "{mitglied}",
			visibleWhen: "withMemberNames"
		});
		const values = { mitglied: "Anna Meier" };
		expect(layoutPage(page([member]), values, { ...OPTIONS, withMemberNames: false }, metrics)).toEqual([]);
		expect(layoutPage(page([member]), values, OPTIONS, metrics)).toHaveLength(1);
	});

	it("lässt leere Zeilen weg", () => {
		const member = text({ template: "**{mitglied}** " });
		expect(layoutPage(page([member]), { mitglied: "" }, OPTIONS, metrics)).toEqual([]);
	});
});

describe("layoutPage – Ränder", () => {
	it("entfernt äußere Leerzeichen auch nach leeren Platzhaltern", () => {
		const object = text({
			template: "**{mitglied}** Punkte {platz}",
			align: "left"
		});
		const ops = textOps(layoutPage(page([object]), { mitglied: "", platz: "3" }, OPTIONS, metrics));
		expect(ops.map((op) => op.text)).toEqual(["Punkte 3"]);
		expect(ops[0].xMm).toBe(25);
	});
});

describe("layoutPage – leere Platzhalter", () => {
	it("lässt Zeilen weg, deren Platzhalter alle leer sind", () => {
		const object = text({ template: "({gliederung})" });
		expect(layoutPage(page([object]), { gliederung: "" }, OPTIONS, metrics)).toEqual([]);
		const signer = text({ template: "{unterzeichner1} ({funktion1})" });
		expect(layoutPage(page([signer]), { unterzeichner1: " ", funktion1: "" }, OPTIONS, metrics)).toEqual([]);
	});

	it("behält Zeilen, wenn mindestens ein Platzhalter gefüllt ist", () => {
		const signer = text({ template: "{unterzeichner1} ({funktion1})", align: "left" });
		const ops = textOps(
			layoutPage(page([signer]), { unterzeichner1: "Max Mustermann", funktion1: "" }, OPTIONS, metrics)
		);
		expect(ops.map((op) => op.text)).toEqual(["Max Mustermann ()"]);
	});

	it("lässt Vorlagen ohne Platzhalter unverändert", () => {
		const ops = textOps(layoutPage(page([text({ template: "Urkunde" })]), {}, OPTIONS, metrics));
		expect(ops.map((op) => op.text)).toEqual(["Urkunde"]);
	});

	it("wertet unbekannte Platzhalter nicht als leer", () => {
		const ops = textOps(layoutPage(page([text({ template: "({unbekannt})" })]), {}, OPTIONS, metrics));
		expect(ops.map((op) => op.text)).toEqual(["({unbekannt})"]);
	});
});

describe("layoutPage – Bilder und Versatz", () => {
	it("zeichnet Unterschriften nur mit vorhandenem Bild", () => {
		expect(layoutPage(page([image]), {}, { ...OPTIONS, availableSlots: new Set() }, metrics)).toEqual([]);
		expect(layoutPage(page([image]), {}, OPTIONS, metrics)).toEqual([
			{
				kind: "image",
				slot: "signature1",
				xMm: 40,
				topMm: 200,
				widthMm: 30,
				heightMm: 20
			}
		]);
	});

	it("verschiebt alle Elemente um den Versatz", () => {
		const layout = defaultLayouts().team;
		const values = {
			name: "Team Musterstadt",
			mitglied: "Anna Meier",
			unterzeichner1: "Max Mustermann"
		};
		const plain = layoutPage(layout, values, OPTIONS, metrics);
		const shifted = layoutPage(layout, values, { ...OPTIONS, offsetMm: { x: 1.5, y: -2 } }, metrics);
		expect(shifted).toHaveLength(plain.length);
		expect(plain.some((op) => op.kind === "image")).toBe(true);
		shifted.forEach((op, index) => {
			const base = plain[index];
			if (op.kind === "text" && base.kind === "text") {
				expect(op.xMm).toBeCloseTo(base.xMm + 1.5, 9);
				expect(op.baselineMm).toBeCloseTo(base.baselineMm - 2, 9);
			} else if (op.kind === "image" && base.kind === "image") {
				expect(op.xMm).toBeCloseTo(base.xMm + 1.5, 9);
				expect(op.topMm).toBeCloseTo(base.topMm - 2, 9);
			} else throw new Error("Unerwartete Reihenfolge");
		});
	});
});

describe("layoutPage – Deutschlandkarte", () => {
	const map: MapObject = {
		id: "map",
		kind: "map",
		label: "Deutschlandkarte",
		xMm: 150,
		yMm: 40,
		widthMm: 45,
		heightMm: 55,
		highlightOwn: false
	};
	const markers = [{ name: "Musterstadt", position: { lat: 53.55, lon: 9.99 } }];

	it("zeichnet die Karte als Vektorbefehle und verschiebt sie mit dem Druckversatz", () => {
		const plain = layoutPage(page([map]), {}, { ...OPTIONS, map: { markers } }, metrics);
		const shifted = layoutPage(page([map]), {}, { ...OPTIONS, map: { markers }, offsetMm: { x: 2, y: -1 } }, metrics);
		expect(plain.map((op) => op.kind)).toContain("circle");
		expect(plain.every((op) => op.kind === "path" || op.kind === "circle")).toBe(true);
		const dot = plain.find((op) => op.kind === "circle")!;
		const shiftedDot = shifted.find((op) => op.kind === "circle")!;
		expect(shiftedDot).toMatchObject({ cxMm: dot.cxMm + 2, cyMm: dot.cyMm - 1 });
		const firstPoint = (ops: DrawOp[]) => (ops[0].kind === "path" ? ops[0].rings[0][0] : null);
		expect(firstPoint(shifted)!.x).toBeCloseTo(firstPoint(plain)!.x + 2, 9);
	});

	it("lässt eine ausgeschaltete Karte weg", () => {
		expect(layoutPage(page([{ ...map, visible: false }]), {}, OPTIONS, metrics)).toEqual([]);
	});
});

describe("grayCss", () => {
	it("übersetzt Grauwerte in CSS-Farben", () => {
		expect(grayCss(0)).toBe("rgb(0 0 0)");
		expect(grayCss(1)).toBe("rgb(255 255 255)");
		expect(grayCss(0.5)).toBe("rgb(128 128 128)");
		expect(grayCss(null)).toBe("none");
	});
});

describe("textSpans", () => {
	it("liefert die waagrechte Ausdehnung des gezeichneten Texts je Textobjekt", () => {
		const layout = page([text(), text({ id: "empty", template: "({gliederung})" }), image]);
		const values = { name: "Anna Meier", gliederung: "" };
		const spans = textSpans(layout, values, true, metrics);
		const { left, right } = lineExtent(textOps(layoutPage(page([text()]), values, OPTIONS, metrics)));
		expect(spans.get("t")?.xMm).toBeCloseTo(left, 6);
		expect(spans.get("t")?.widthMm).toBeCloseTo(right - left, 6);
		expect(spans.has("empty")).toBe(false);
		expect(spans.has("signature1")).toBe(false);
	});

	it("lässt ausgeblendete Mitgliedernamen weg", () => {
		const layout = page([text({ visibleWhen: "withMemberNames" })]);
		expect(textSpans(layout, { name: "Anna Meier" }, false, metrics).size).toBe(0);
	});
});
