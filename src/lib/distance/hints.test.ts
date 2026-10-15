import { describe, expect, it } from "vitest";
import { pickByHint } from "./hints";

const options = [
	{ id: "1", text: "Musterstadt – 66280 Musterstadt (Ortsgruppe)" },
	{ id: "2", text: "Musterstadt – 65843 Musterstadt am Taunus (Ortsgruppe)" },
	{ id: "3", text: "Musterstadt – 71570 Saarhausen, Musterstadt an der Murr (Stützpunkt)" }
];

describe("pickByHint", () => {
	it("wählt die einzige passende Gliederung über ein Wort im Mannschaftsnamen", () => {
		expect(pickByHint("Musterstadt", options, ["Musterstadt / Taunus"])).toBe("2");
	});

	it("erkennt Wortanfänge und Postleitzahlen", () => {
		expect(pickByHint("Musterstadt", options, ["Musterstadt (Saar)"])).toBe("3");
		expect(pickByHint("Musterstadt", options, ["Musterstadt 66280"])).toBe("1");
	});

	it("ignoriert den Gliederungsnamen selbst, kurze Wörter und Nummern", () => {
		expect(pickByHint("Musterstadt", options, ["Musterstadt 1", "DLRG Musterstadt am"])).toBeNull();
	});

	it("wählt nichts, wenn mehrere oder keine passen", () => {
		expect(pickByHint("Musterstadt", options, ["Musterstadt Ortsgruppe"])).toBeNull();
		expect(pickByHint("Musterstadt", options, ["Beispielhausen"])).toBeNull();
		expect(pickByHint("Musterstadt", options, [])).toBeNull();
	});

	it("beachtet keine Groß-/Kleinschreibung", () => {
		expect(pickByHint("musterstadt", options, ["MUSTERSTADT TAUNUS"])).toBe("2");
	});
});
