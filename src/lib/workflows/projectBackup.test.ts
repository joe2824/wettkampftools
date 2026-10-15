import { strToU8 } from "fflate";
import { describe, expect, it } from "vitest";
import { compactTimestamp } from "$lib/platform/fs";
import { createFakeStore } from "$lib/testing/fakeFs";
import { backupPath, KEEP_BACKUPS, writeBackup } from "./projectBackup";

const NOW = new Date("2026-10-15T08:00:00.000Z");

describe("backupPath", () => {
	it("trägt den Zeitpunkt im Namen", () => {
		expect(backupPath(NOW)).toBe(`backups/vor-projekt-${compactTimestamp(NOW)}.wwkprojekt`);
	});
});

describe("writeBackup", () => {
	it("schreibt die Sicherung und behält nur die neuesten", async () => {
		const store = createFakeStore();
		const days = ["20261010", "20261011", "20261012", "20261013"];
		for (const day of days) store.files.set(`backups/vor-projekt-${day}-080000.wwkprojekt`, strToU8("alt"));
		const path = await writeBackup(store, strToU8("neu"), NOW);
		expect(path).toBe(backupPath(NOW));
		expect(store.files.get(path)).toEqual(strToU8("neu"));
		const kept = [...store.files.keys()].filter((name) => name.startsWith("backups/"));
		expect(kept).toHaveLength(KEEP_BACKUPS);
		expect(kept).toContain("backups/vor-projekt-20261013-080000.wwkprojekt");
	});
});
