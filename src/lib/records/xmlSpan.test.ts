import { describe, expect, it } from "vitest";
import { findElementSpan } from "./xmlSpan";

const XML = `<?xml version="1.0" encoding="UTF-8"?>
<!-- <strafen>Kommentar</strafen> -->
<Wurzel a="x > y">
  <liste>
    <strafen>innen</strafen>
  </liste>
  <strafen>
    <strafen><leer/></strafen>
  </strafen>
  <ende/>
</Wurzel>
`;

describe("findElementSpan", () => {
	it("findet das direkte Kind der Wurzel, nicht gleichnamige tiefere Elemente", () => {
		const span = findElementSpan(XML, ["Wurzel", "strafen"]);
		expect(XML.slice(span!.start, span!.end)).toBe("<strafen>\n    <strafen><leer/></strafen>\n  </strafen>");
	});

	it("findet verschachtelte Pfade und leere Elemente", () => {
		const inner = findElementSpan(XML, ["Wurzel", "liste", "strafen"]);
		expect(XML.slice(inner!.start, inner!.end)).toBe("<strafen>innen</strafen>");
		const empty = findElementSpan(XML, ["Wurzel", "ende"]);
		expect(XML.slice(empty!.start, empty!.end)).toBe("<ende/>");
	});

	it("liefert null, wenn das Element fehlt oder mehrfach vorkommt", () => {
		expect(findElementSpan(XML, ["Wurzel", "fehlt"])).toBeNull();
		expect(findElementSpan("<a><b/><b/></a>", ["a", "b"])).toBeNull();
	});

	it("wirft bei kaputtem XML", () => {
		expect(() => findElementSpan("<a><b></a>", ["a", "b"])).toThrow();
		expect(() => findElementSpan("<a><b>", ["a", "b"])).toThrow();
	});
});
