import { describe, expect, it } from "vitest";
import { parseInline, parseMarkdown } from "./markdown";

describe("parseMarkdown", () => {
	it("erkennt Überschriften, Listen mit Folgezeilen und Absätze", () => {
		const blocks = parseMarkdown(
			"# Titel\n\nErster Satz\nzweiter Satz.\n\n### Neu\n\n- Punkt eins\n  geht weiter\n- Punkt zwei\n"
		);
		expect(blocks).toEqual([
			{ kind: "heading", level: 1, children: [{ kind: "text", text: "Titel" }] },
			{ kind: "paragraph", children: [{ kind: "text", text: "Erster Satz zweiter Satz." }] },
			{ kind: "heading", level: 3, children: [{ kind: "text", text: "Neu" }] },
			{
				kind: "list",
				ordered: false,
				items: [[{ kind: "text", text: "Punkt eins geht weiter" }], [{ kind: "text", text: "Punkt zwei" }]]
			}
		]);
	});

	it("trennt nummerierte von einfachen Listen und fasst tiefe Überschriften zusammen", () => {
		const blocks = parseMarkdown("1. Erst\n2. Dann\n- Lose\n##### Klein");
		expect(blocks.map((block) => block.kind)).toEqual(["list", "list", "heading"]);
		expect(blocks[0]).toMatchObject({ ordered: true });
		expect(blocks[2]).toMatchObject({ level: 3 });
	});

	it("liest Windows-Zeilenenden", () => {
		expect(parseMarkdown("- a\r\n- b\r\n")).toHaveLength(1);
	});
});

describe("parseInline", () => {
	it("kennt Fett, Kursiv und Code", () => {
		expect(parseInline("**fett** und *schräg* mit `code`")).toEqual([
			{ kind: "strong", children: [{ kind: "text", text: "fett" }] },
			{ kind: "text", text: " und " },
			{ kind: "em", children: [{ kind: "text", text: "schräg" }] },
			{ kind: "text", text: " mit " },
			{ kind: "code", text: "code" }
		]);
	});

	it("nimmt nur http- und https-Links, andere bleiben Text", () => {
		expect(parseInline("[Seite](https://example.org)")).toEqual([
			{ kind: "link", url: "https://example.org", children: [{ kind: "text", text: "Seite" }] }
		]);
		expect(parseInline("[böse](javascript:alert(1))")).not.toContainEqual(expect.objectContaining({ kind: "link" }));
	});

	it("lässt Markup als Text stehen", () => {
		expect(parseInline("<b>x</b> 2*3*4")).toEqual([{ kind: "text", text: "<b>x</b> 2*3*4" }]);
	});
});
