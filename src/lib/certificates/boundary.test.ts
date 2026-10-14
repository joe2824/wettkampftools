import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const CERTIFICATES_DIR = join(process.cwd(), "src/lib/certificates");
const SELF = "boundary.test.ts";
const SCORING_IMPORT = /from\s+["'](?:\.\.\/wwk|\$lib\/wwk)\/scoring["']/;
const FORBIDDEN_NAME = "trophy" + "Points";

function sourceFiles(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((item) => {
		const path = join(dir, item.name);
		if (item.isDirectory()) return sourceFiles(path);
		return item.name.endsWith(".ts") && item.name !== SELF ? [path] : [];
	});
}

describe("Urkunden-Bereich", () => {
	const files = sourceFiles(CERTIFICATES_DIR);

	it("findet die Quelldateien", () => {
		expect(files.some((file) => file.endsWith("model.ts"))).toBe(true);
	});

	it.each(files)("%s nutzt die Pokalwertung nicht", (file) => {
		const source = readFileSync(file, "utf8");
		expect(source).not.toMatch(SCORING_IMPORT);
		expect(source).not.toContain(FORBIDDEN_NAME);
	});
});
