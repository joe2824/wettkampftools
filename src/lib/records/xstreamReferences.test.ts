// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { checkBlockReferences, resolveReference } from "./xstreamReferences";

const parse = (xml: string): Element => new DOMParser().parseFromString(xml, "application/xml").documentElement;
const XML = `<W>
  <liste><Lauf><Team><n>1</n></Team><Team><n>2</n></Team></Lauf><Lauf><Team reference="../../Lauf/Team[2]"/></Lauf></liste>
  <katalog><Strafe><c>V1</c></Strafe></katalog>
  <info><ref reference="/W/liste/Lauf/Team"/></info>
</W>`;

describe("resolveReference", () => {
	it("löst relative und absolute XStream-Pfade auf", () => {
		const root = parse(XML);
		const ref = root.querySelector("Team[reference]")!;
		expect(resolveReference(ref, ref.getAttribute("reference")!)?.at(-1)?.textContent).toBe("2");
		const absolute = root.querySelector("ref")!;
		expect(resolveReference(absolute, "/W/liste/Lauf/Team")?.at(-1)?.textContent).toBe("1");
	});

	it("liefert null für unbekannte Pfade und ID-Verweise", () => {
		const root = parse(XML);
		const ref = root.querySelector("ref")!;
		expect(resolveReference(ref, "../../fehlt")).toBeNull();
		expect(resolveReference(ref, "../../liste/Lauf[5]")).toBeNull();
		expect(resolveReference(ref, "17")).toBeNull();
		expect(resolveReference(root, "../../..")).toBeNull();
	});
});

describe("checkBlockReferences", () => {
	it("erlaubt Verweise, die den Block nicht berühren", () => {
		const root = parse(XML);
		expect(checkBlockReferences(root, root.querySelector("katalog")!)).toBe("ok");
	});

	it("erkennt Verweise im Block, in den Block und unauflösbare Verweise", () => {
		const inside = parse(XML.replace("<Strafe>", '<Strafe reference="../../liste/Lauf/Team"/><Strafe>'));
		expect(checkBlockReferences(inside, inside.querySelector("katalog")!)).toBe("inside");
		const into = parse(XML.replace('reference="/W/liste/Lauf/Team"', 'reference="../../katalog/Strafe"'));
		expect(checkBlockReferences(into, into.querySelector("katalog")!)).toBe("into");
		const broken = parse(XML.replace('reference="/W/liste/Lauf/Team"', 'reference="../../nix"'));
		expect(checkBlockReferences(broken, broken.querySelector("katalog")!)).toBe("unresolved");
	});
});
