import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
/** Alles, was Urkunden erzeugt oder anzeigt: Ordner werden rekursiv durchsucht. */
const CERTIFICATE_PATHS = [
	"src/lib/certificates",
	"src/lib/workflows/certificates.ts",
	"src/lib/components/certificates",
	"src/lib/wwk/serialLetterExport.ts",
	"src/lib/wwk/certificateOrder.ts",
	"src/routes/certificates"
];
const SELF = "boundary.test.ts";
const SOURCE_FILE = /\.(ts|svelte)$/;
const SCORING_IMPORT = /from\s+["'][^"']*\/scoring["']/;
const FORBIDDEN_NAME = "trophy" + "Points";

function sourceFiles(path: string): string[] {
	if (!statSync(path).isDirectory()) return [path];
	return readdirSync(path, { withFileTypes: true }).flatMap((item) => {
		const child = join(path, item.name);
		if (item.isDirectory()) return sourceFiles(child);
		return SOURCE_FILE.test(item.name) && item.name !== SELF ? [child] : [];
	});
}

describe("Urkunden-Bereich", () => {
	const files = CERTIFICATE_PATHS.flatMap((path) => sourceFiles(join(ROOT, path)));

	it("findet die Quelldateien aller Bereiche", () => {
		for (const name of ["model.ts", "certificates.ts", "EntryTable.svelte", "serialLetterExport.ts", "+page.svelte"]) {
			expect(files.some((file) => file.endsWith(name))).toBe(true);
		}
	});

	it("erkennt einen Import der Pokalwertung", () => {
		expect('import { scoreTeams } from "./scoring";').toMatch(SCORING_IMPORT);
		expect('import { scoreTeams } from "$lib/wwk/scoring";').toMatch(SCORING_IMPORT);
	});

	it.each(files)("%s nutzt die Pokalwertung nicht", (file) => {
		const source = readFileSync(file, "utf8");
		expect(source).not.toMatch(SCORING_IMPORT);
		expect(source).not.toContain(FORBIDDEN_NAME);
	});
});
