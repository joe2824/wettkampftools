import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CREDITS, NUNITO_DOWNLOAD_URL } from "./credits";

/** Erlaubte Adressen des Openers aus den Tauri-Berechtigungen. */
function allowedUrlPatterns(): RegExp[] {
	const capability = JSON.parse(readFileSync("src-tauri/capabilities/default.json", "utf-8"));
	const opener = capability.permissions.find(
		(permission: unknown) =>
			typeof permission === "object" && (permission as { identifier: string }).identifier === "opener:allow-open-url"
	);
	return opener.allow.map(({ url }: { url: string }) => {
		const escaped = url.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replaceAll("*", ".*");
		return new RegExp(`^${escaped}$`);
	});
}

const urls = [...new Set([...CREDITS.flatMap((credit) => credit.links.map((link) => link.url)), NUNITO_DOWNLOAD_URL])];

describe("CREDITS", () => {
	it("nennt Programm, Schrift, Karte, Datenquellen und Oberfläche", () => {
		expect(CREDITS.map((credit) => credit.title)).toEqual([
			"Wettkampftools",
			"Schrift Nunito",
			"Deutschlandkarte",
			"DLRG-Standortdaten",
			"Regelwerke aus JAuswertung",
			"Bedienelemente"
		]);
	});

	it("übernimmt den Urheberrechtsvermerk der Schrift wörtlich aus OFL.txt", () => {
		const firstLine = readFileSync("static/fonts/OFL.txt", "utf-8").split(/\r?\n/)[0];
		const nunito = CREDITS.find((credit) => credit.title === "Schrift Nunito");
		expect(nunito?.copyright).toBe(firstLine);
	});

	it.each(urls)("%s darf der Opener öffnen", (url) => {
		expect(url.startsWith("https://")).toBe(true);
		expect(allowedUrlPatterns().some((pattern) => pattern.test(url))).toBe(true);
	});
});
