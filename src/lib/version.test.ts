import { describe, expect, it } from "vitest";
import { APP_VERSION } from "./version";

const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

describe("APP_VERSION", () => {
	it("ist eine semantische Versionsnummer", () => {
		expect(APP_VERSION).toMatch(SEMVER);
	});
});
