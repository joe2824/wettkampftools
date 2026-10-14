import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
	it("fügt Klassen zusammen und löst Tailwind-Konflikte auf", () => {
		expect(cn("p-2", false && "hidden", "p-4")).toBe("p-4");
	});
});
