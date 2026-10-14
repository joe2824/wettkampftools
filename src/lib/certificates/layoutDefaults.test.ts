import { describe, expect, it } from "vitest";
import { PAGE_HEIGHT_MM, PAGE_WIDTH_MM, type ImageObject, type Layout, type TextObject } from "./layout";
import { defaultLayouts } from "./layoutDefaults";

const textObjects = (layout: Layout): TextObject[] =>
	layout.objects.filter((o): o is TextObject => o.kind === "text");
const imageObjects = (layout: Layout): ImageObject[] =>
	layout.objects.filter((o): o is ImageObject => o.kind === "image");
const byTemplate = (layout: Layout, template: string): TextObject => {
	const found = textObjects(layout).find((o) => o.template === template);
	if (!found) throw new Error(`fehlt: ${template}`);
	return found;
};
const signerTemplates = new Set(["{unterzeichner1}", "({funktion1})", "{unterzeichner2}", "({funktion2})"]);

describe("defaultLayouts", () => {
	const set = defaultLayouts();

	it("liefert bei jedem Aufruf eine neue Kopie", () => {
		const other = defaultLayouts();
		expect(other).toEqual(set);
		other.team.objects[0].xMm = 99;
		expect(defaultLayouts().team.objects[0].xMm).not.toBe(99);
	});

	for (const variant of ["team", "individual"] as const) {
		describe(variant, () => {
			const layout = set[variant];

			it("hat Schema-Version und Variante", () => {
				expect(layout.schemaVersion).toBe(1);
				expect(layout.variant).toBe(variant);
			});

			it("hat eindeutige IDs und deutsche Bezeichnungen", () => {
				const ids = layout.objects.map((o) => o.id);
				expect(new Set(ids).size).toBe(ids.length);
				for (const o of layout.objects) expect(o.label.length).toBeGreaterThan(0);
			});

			it("liegt vollständig auf der Seite", () => {
				for (const o of layout.objects) {
					expect(o.xMm).toBeGreaterThanOrEqual(0);
					expect(o.yMm).toBeGreaterThanOrEqual(0);
					expect(o.xMm + o.widthMm).toBeLessThanOrEqual(PAGE_WIDTH_MM);
					const bottom = o.kind === "image" ? o.yMm + o.heightMm : o.yMm;
					expect(bottom).toBeLessThanOrEqual(PAGE_HEIGHT_MM);
				}
			});

			it("zentriert den Haupttext im Satzspiegel (25 mm, 160 mm breit)", () => {
				for (const o of textObjects(layout).filter((t) => !signerTemplates.has(t.template))) {
					expect(o.align).toBe("center");
					expect(o.xMm).toBe(25);
					expect(o.widthMm).toBe(160);
				}
			});

			it("verwendet die Größen der Word-Vorlage und 70 % Mindestgröße", () => {
				expect(byTemplate(layout, "{name}").sizePt).toBe(22);
				expect(byTemplate(layout, "{name}").font).toBe("black");
				expect(byTemplate(layout, "erreichte beim").sizePt).toBe(18);
				expect(byTemplate(layout, "erreichte beim").boldFont).toBe("black");
				expect(byTemplate(layout, "**{platz}. Platz**").sizePt).toBe(20);
				for (const t of signerTemplates) {
					expect(byTemplate(layout, t).sizePt).toBe(10);
					expect(byTemplate(layout, t).font).toBe("light");
				}
				for (const o of textObjects(layout)) expect(o.minSizePt).toBeCloseTo(o.sizePt * 0.7, 5);
			});

			it("beginnt am oberen Rand von 100 mm", () => {
				const name = byTemplate(layout, "{name}");
				expect(name.yMm).toBeGreaterThan(100);
				// Oberlänge von Nunito liegt knapp über 1 em
				expect(name.yMm).toBeLessThan(100 + 1.1 * 22 * (25.4 / 72));
			});

			it("hat streng steigende Grundlinien im Haupttext mit Zeilenabstand 1,2", () => {
				const body = textObjects(layout).filter((t) => !signerTemplates.has(t.template));
				for (let i = 1; i < body.length; i++) {
					expect(body[i].yMm).toBeGreaterThan(body[i - 1].yMm);
				}
				const step = byTemplate(layout, "der {ausrichter}").yMm - byTemplate(layout, "**{nr}. {titel}**").yMm;
				expect(step).toBeCloseTo(18 * 1.2 * (25.4 / 72), 1);
			});

			it("setzt Unterschriften nebeneinander unter den Haupttext", () => {
				const platz = byTemplate(layout, "**{platz}. Platz**");
				const images = imageObjects(layout);
				expect(images.map((i) => i.slot).sort()).toEqual(["signature1", "signature2"]);
				const left = byTemplate(layout, "{unterzeichner1}");
				const right = byTemplate(layout, "{unterzeichner2}");
				expect(left.yMm).toBe(right.yMm);
				expect(left.xMm + left.widthMm).toBeLessThanOrEqual(right.xMm);
				expect(byTemplate(layout, "({funktion1})").yMm).toBeGreaterThan(left.yMm);
				for (const image of images) {
					expect(image.yMm).toBeGreaterThan(platz.yMm);
					expect(image.yMm + image.heightMm).toBeLessThan(left.yMm);
				}
			});
		});
	}

	it("zeigt im Mannschaftslayout das Mitglied nur bei Mitgliedernamen", () => {
		const member = byTemplate(set.team, "{mitglied}");
		expect(member.visibleWhen).toBe("withMemberNames");
		expect(member.sizePt).toBe(16);
		expect(member.font).toBe("bold");
		expect(textObjects(set.team).some((o) => o.template.includes("{gliederung}"))).toBe(false);
	});

	it("zeigt im Einzellayout die Gliederung statt des Mitglieds", () => {
		const layout = set.individual;
		expect(textObjects(layout).some((o) => o.template.includes("{mitglied}"))).toBe(false);
		const name = byTemplate(layout, "{name}");
		const group = byTemplate(layout, "({gliederung})");
		expect(group.yMm).toBeGreaterThan(name.yMm);
		expect(group.visibleWhen).toBe("always");
	});
});
