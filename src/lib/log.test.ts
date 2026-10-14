import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeStore, type FakeStore } from "$lib/testing/fakeFs";
import { resetAppDataStore, setAppDataStore } from "$lib/platform/fs";
import { flushLog, formatLogLine, installErrorLogging, logError, logInfo, pruneOldLogs } from "./log";

let store: FakeStore;

beforeEach(() => {
	store = createFakeStore();
	setAppDataStore(store);
	vi.spyOn(console, "info").mockImplementation(() => {});
	vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
	resetAppDataStore();
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe("formatLogLine", () => {
	const at = new Date(2026, 9, 14, 9, 5, 7, 42);

	it("schreibt Zeit, Stufe, Code und Werte", () => {
		expect(formatLogLine(at, "INFO", "csv.loaded", { rows: 70, utf8: true })).toBe(
			"2026-10-14 09:05:07.042 web INFO  csv.loaded rows=70 utf8=true"
		);
	});

	it("ersetzt ungültige Codes", () => {
		expect(formatLogLine(at, "ERROR", "Anna Meier fehlt")).toBe(
			"2026-10-14 09:05:07.042 web ERROR invalid_code"
		);
		expect(formatLogLine(at, "ERROR", "")).toContain(" invalid_code");
	});

	it("lässt Werte mit ungültigem Schlüssel weg", () => {
		expect(formatLogLine(at, "INFO", "x", { "Max Mustermann": 1, ok: 2 })).toBe(
			"2026-10-14 09:05:07.042 web INFO  x ok=2"
		);
	});

	it("lässt Text als Wert nicht durch", () => {
		// Zur Laufzeit trotzdem abgefangen, falls der Typ umgangen wird.
		const data = { name: "Anna Meier", rows: 3 } as unknown as Record<string, number>;
		expect(formatLogLine(at, "INFO", "x", data)).toBe("2026-10-14 09:05:07.042 web INFO  x rows=3");
	});
});

describe("logInfo/logError", () => {
	it("schreibt in die Tagesdatei", async () => {
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(new Date(2026, 9, 14, 12, 0, 0, 0));
		logInfo("app.start");
		logError("export.failed", { code: 2 });
		await flushLog();
		expect(await store.readText("logs/2026-10-14.log")).toBe(
			"2026-10-14 12:00:00.000 web INFO  app.start\n2026-10-14 12:00:00.000 web ERROR export.failed code=2\n"
		);
	});

	it("nimmt keine Textwerte an", () => {
		// @ts-expect-error Nur Zahlen und Wahrheitswerte erlaubt.
		logInfo("x", { name: "Anna Meier" });
	});

	it("verkraftet eine Ablage, die nicht schreiben kann", async () => {
		store.appendText = () => Promise.reject(new Error("voll"));
		logInfo("x");
		await expect(flushLog()).resolves.toBeUndefined();
	});
});

describe("pruneOldLogs", () => {
	it("behält 14 Tage und räumt Älteres weg", async () => {
		for (const name of ["2026-09-30.log", "2026-10-01.log", "2026-10-14.log", "notiz.txt"]) {
			await store.writeText(`logs/${name}`, "");
		}
		await pruneOldLogs(new Date(2026, 9, 14, 8, 0));
		expect((await store.list("logs")).sort()).toEqual(["2026-10-01.log", "2026-10-14.log", "notiz.txt"]);
	});

	it("verkraftet einen fehlenden Ordner", async () => {
		await expect(pruneOldLogs(new Date(2026, 9, 14))).resolves.toBeUndefined();
	});
});

describe("installErrorLogging", () => {
	function fakeTarget() {
		const handlers = new Map<string, (e: unknown) => void>();
		return {
			handlers,
			addEventListener: (type: string, h: (e: unknown) => void) => void handlers.set(type, h),
			removeEventListener: (type: string) => void handlers.delete(type)
		};
	}

	it("protokolliert nur den Fehlernamen", async () => {
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(new Date(2026, 9, 14, 12, 0, 0, 0));
		const target = fakeTarget();
		const uninstall = installErrorLogging(target);
		target.handlers.get("error")?.({ error: new TypeError("Anna Meier undefined") });
		target.handlers.get("unhandledrejection")?.({ reason: new RangeError("Max Mustermann") });
		target.handlers.get("unhandledrejection")?.({ reason: "Musterstadt" });
		await flushLog();
		const text = (await store.readText("logs/2026-10-14.log")) ?? "";
		expect(text).toContain("ERROR uncaught.TypeError");
		expect(text).toContain("ERROR unhandled.RangeError");
		expect(text).toContain("ERROR unhandled.unknown");
		expect(text).not.toMatch(/Anna|Max|Musterstadt/);
		uninstall();
		expect(target.handlers.size).toBe(0);
	});
});
