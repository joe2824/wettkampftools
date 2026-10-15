import { describe, expect, it } from "vitest";
import { PAGE_HEIGHT_MM, PAGE_WIDTH_MM, type TextObject } from "./layout";
import { defaultLayouts } from "./layoutDefaults";
import { parseLayoutSet, serializeLayoutSet } from "./layoutParse";

const validText = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
	id: "t1",
	kind: "text",
	label: "Name",
	xMm: 25,
	yMm: 110,
	widthMm: 160,
	align: "center",
	font: "regular",
	boldFont: "black",
	sizePt: 18,
	minSizePt: 12,
	template: "{name}",
	visibleWhen: "always",
	...overrides
});
const layoutWith = (variant: string, objects: unknown[]): Record<string, unknown> => ({
	schemaVersion: 1,
	variant,
	objects
});
const setWith = (teamObjects: unknown[]): Record<string, unknown> => ({
	team: layoutWith("team", teamObjects),
	individual: serializeLayoutSet(defaultLayouts()).individual
});

describe("parseLayoutSet", () => {
	it("übernimmt Standardlayouts ohne Hinweise (Hin- und Rückweg)", () => {
		const json = JSON.parse(JSON.stringify(serializeLayoutSet(defaultLayouts())));
		const result = parseLayoutSet(json);
		expect(result.issues).toEqual([]);
		expect(result.layouts).toEqual(defaultLayouts());
	});

	it.each([null, undefined, 42, "text", [], true])("ersetzt Unsinn %s durch Standard", (input) => {
		const result = parseLayoutSet(input);
		expect(result.layouts).toEqual(defaultLayouts());
		expect(result.issues.length).toBeGreaterThan(0);
	});

	it("ersetzt eine fehlende Variante durch Standard", () => {
		const result = parseLayoutSet({ team: layoutWith("team", [validText()]) });
		expect(result.layouts.individual).toEqual(defaultLayouts().individual);
		expect(result.layouts.team.objects).toHaveLength(1);
		expect(result.issues).toHaveLength(1);
	});

	it("ersetzt eine Variante mit falscher Schema-Version oder Kennung", () => {
		const wrongVersion = parseLayoutSet({ ...setWith([]), team: { ...layoutWith("team", []), schemaVersion: 2 } });
		expect(wrongVersion.layouts.team).toEqual(defaultLayouts().team);
		const wrongVariant = parseLayoutSet({ ...setWith([]), team: layoutWith("individual", []) });
		expect(wrongVariant.layouts.team).toEqual(defaultLayouts().team);
		expect(wrongVariant.issues.length).toBeGreaterThan(0);
	});

	it("verwirft Objekte mit zusätzlichen Feldern wie Bilddaten", () => {
		const image = {
			id: "s1",
			kind: "image",
			label: "Unterschrift",
			slot: "signature1",
			xMm: 30,
			yMm: 200,
			widthMm: 40,
			heightMm: 20,
			dataUri: "data:image/png;base64,AAAA"
		};
		const result = parseLayoutSet(setWith([image, validText({ extra: 1 })]));
		expect(result.layouts.team.objects).toEqual([]);
		expect(result.issues).toHaveLength(2);
	});

	it("ignoriert zusätzliche Felder auf oberster Ebene und im Layout", () => {
		const input: Record<string, unknown> = {
			...setWith([validText()]),
			background: "data:image/png;base64,AAAA",
			signatures: { signature1: "data:image/png;base64,AAAA" }
		};
		(input.team as Record<string, unknown>).background = "data:image/jpeg;base64,BBBB";
		const result = parseLayoutSet(input);
		expect(result.layouts.team.objects).toHaveLength(1);
		expect(JSON.stringify(result.layouts)).not.toContain("data:");
		expect(result.issues.length).toBeGreaterThanOrEqual(2);
	});

	it("verwirft Texte mit eingebetteten Daten-URIs", () => {
		const result = parseLayoutSet(setWith([validText({ template: "data:image/png;base64,AAAA" })]));
		expect(result.layouts.team.objects).toEqual([]);
		expect(result.issues).toHaveLength(1);
	});

	it.each([
		["unbekannte Art", { kind: "video" }],
		["falsche Ausrichtung", { align: "justify" }],
		["falscher Schriftschnitt", { font: "italic" }],
		["keine Zahl", { xMm: "25" }],
		["unendliche Zahl", { yMm: Number.POSITIVE_INFINITY }],
		["leere ID", { id: "" }],
		["falsche Sichtbarkeit", { visibleWhen: "never" }],
		["fehlendes Feld", { template: undefined }]
	])("verwirft ungültiges Objekt: %s", (_name, overrides) => {
		const result = parseLayoutSet(setWith([validText(overrides), validText({ id: "ok" })]));
		expect(result.layouts.team.objects.map((o) => o.id)).toEqual(["ok"]);
		expect(result.issues).toHaveLength(1);
	});

	it("verwirft doppelte IDs und doppelte Unterschrift-Plätze", () => {
		const image = (id: string) => ({
			id,
			kind: "image",
			label: "Unterschrift",
			slot: "signature1",
			xMm: 30,
			yMm: 200,
			widthMm: 40,
			heightMm: 20
		});
		const result = parseLayoutSet(setWith([validText(), validText(), image("a"), image("b")]));
		expect(result.layouts.team.objects.map((o) => o.id)).toEqual(["t1", "a"]);
		expect(result.issues).toHaveLength(2);
	});

	it("begrenzt Positionen, Breiten und Größen auf die Seite", () => {
		const result = parseLayoutSet(
			setWith([validText({ xMm: -10, yMm: 500, widthMm: 900, sizePt: 1000, minSizePt: 2000 })])
		);
		const text = result.layouts.team.objects[0] as TextObject;
		expect(text.xMm).toBe(0);
		expect(text.yMm).toBe(PAGE_HEIGHT_MM);
		expect(text.widthMm).toBe(PAGE_WIDTH_MM);
		expect(text.sizePt).toBeLessThanOrEqual(144);
		expect(text.minSizePt).toBeLessThanOrEqual(text.sizePt);
		expect(result.issues).toEqual([]);
	});
});

describe("serializeLayoutSet", () => {
	it("übernimmt nur Schemafelder", () => {
		const set = defaultLayouts();
		Object.assign(set.team.objects[0], { cachedImage: "data:image/png;base64,AAAA" });
		Object.assign(set.team, { background: "x" });
		const json = serializeLayoutSet(set) as unknown as { team: { objects: Record<string, unknown>[] } };
		expect(json.team).not.toHaveProperty("background");
		expect(json.team.objects[0]).not.toHaveProperty("cachedImage");
		expect(JSON.stringify(json)).not.toContain("data:");
	});
});

describe("Kartenobjekt", () => {
	const validMap = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
		id: "map",
		kind: "map",
		label: "Deutschlandkarte",
		xMm: 150,
		yMm: 40,
		widthMm: 45,
		heightMm: 55,
		highlightOwn: false,
		...overrides
	});

	it("übernimmt eine Karte mit und ohne Sichtbarkeit (Hin- und Rückweg)", () => {
		const result = parseLayoutSet(setWith([validMap(), validMap({ id: "map2", visible: false })]));
		expect(result.issues).toEqual([]);
		expect(result.layouts.team.objects).toEqual([validMap(), validMap({ id: "map2", visible: false })]);
		const json = JSON.parse(JSON.stringify(serializeLayoutSet(result.layouts)));
		expect(parseLayoutSet(json).layouts).toEqual(result.layouts);
	});

	it.each([
		["Hervorhebung kein Wahrheitswert", { highlightOwn: "ja" }],
		["Sichtbarkeit kein Wahrheitswert", { visible: 1 }],
		["Höhe fehlt", { heightMm: undefined }],
		["zusätzliches Feld", { points: [] }]
	])("verwirft ungültige Karte: %s", (_name, overrides) => {
		const result = parseLayoutSet(setWith([validMap(overrides)]));
		expect(result.layouts.team.objects).toEqual([]);
		expect(result.issues).toHaveLength(1);
	});

	it("begrenzt die Karte auf die Seite", () => {
		const result = parseLayoutSet(setWith([validMap({ xMm: 300, yMm: -5, widthMm: 500, heightMm: 900 })]));
		const [map] = result.layouts.team.objects;
		expect(map).toMatchObject({ xMm: PAGE_WIDTH_MM - 1, yMm: 0, widthMm: 1, heightMm: PAGE_HEIGHT_MM });
	});

	it("lehnt unbekannte Arten weiterhin ab", () => {
		const result = parseLayoutSet(setWith([{ ...validMap(), kind: "chart" }]));
		expect(result.layouts.team.objects).toEqual([]);
		expect(result.issues).toHaveLength(1);
	});

	it("Standardlayouts enthalten keine Karte", () => {
		const kinds = Object.values(defaultLayouts()).flatMap((layout) => layout.objects.map((object) => object.kind));
		expect(kinds).not.toContain("map");
	});
});
