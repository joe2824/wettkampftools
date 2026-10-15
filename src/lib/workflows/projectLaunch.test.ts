import { describe, expect, it, vi } from "vitest";

vi.mock("$lib/log", () => ({ logError: vi.fn() }));

import { logError } from "$lib/log";
import { defaultLaunchDeps, openLaunchedProject, startProjectLaunch, type ProjectLaunchDeps } from "./projectLaunch";
import { projectOpenRequest } from "./projectOpenRequest.svelte";

const PATH = "C:\\Wettkampf\\Übung 2026.wwkprojekt";
const BYTES = new Uint8Array([7]);

function createDeps(overrides: Partial<ProjectLaunchDeps> = {}) {
	let opened: (path: string) => void = () => {};
	const deps: ProjectLaunchDeps = {
		takePending: vi.fn().mockResolvedValue(null),
		listen: vi.fn().mockImplementation(async (handler: (path: string) => void) => {
			opened = handler;
			return () => {};
		}),
		readFile: vi
			.fn()
			.mockResolvedValue({ name: "Übung 2026.wwkprojekt", bytes: BYTES, createdMs: null, modifiedMs: null }),
		request: vi.fn(),
		onError: vi.fn(),
		...overrides
	};
	return { deps, fire: (path: string) => opened(path) };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("openLaunchedProject", () => {
	it("liest die Datei und stellt die Rückfrage", async () => {
		const { deps } = createDeps();
		await openLaunchedProject(PATH, deps);
		expect(deps.readFile).toHaveBeenCalledWith(PATH);
		expect(deps.request).toHaveBeenCalledWith(BYTES);
		expect(deps.onError).not.toHaveBeenCalled();
	});

	it("meldet die Ursache der Desktop-Hülle", async () => {
		const { deps } = createDeps({ readFile: vi.fn().mockRejectedValue("Die Datei ist größer als 50 MB.") });
		await openLaunchedProject(PATH, deps);
		expect(deps.request).not.toHaveBeenCalled();
		expect(deps.onError).toHaveBeenCalledWith("Die Datei ist größer als 50 MB.");
		expect(logError).toHaveBeenCalledWith("project.launchReadFailed");
	});

	it("meldet Programmfehler mit allgemeinem Text", async () => {
		const { deps } = createDeps({ readFile: vi.fn().mockRejectedValue(new TypeError("x")) });
		await openLaunchedProject(PATH, deps);
		expect(deps.onError).toHaveBeenCalledWith(expect.stringContaining("Projektdatei konnte nicht gelesen werden"));
	});
});

describe("startProjectLaunch", () => {
	it("öffnet die beim Start übergebene Datei", async () => {
		const { deps } = createDeps({ takePending: vi.fn().mockResolvedValueOnce(PATH).mockResolvedValue(null) });
		await startProjectLaunch(deps);
		expect(deps.listen).toHaveBeenCalledBefore(deps.takePending as ReturnType<typeof vi.fn>);
		expect(deps.request).toHaveBeenCalledWith(BYTES);
	});

	it("tut ohne übergebene Datei nichts", async () => {
		const { deps } = createDeps();
		await startProjectLaunch(deps);
		expect(deps.readFile).not.toHaveBeenCalled();
	});

	it("holt bei einem späteren Doppelklick die vorgemerkte Datei genau einmal ab", async () => {
		const takePending = vi.fn().mockResolvedValue(null);
		const { deps, fire } = createDeps({ takePending });
		await startProjectLaunch(deps);
		takePending.mockResolvedValueOnce(PATH);
		fire(PATH);
		fire(PATH);
		await settle();
		expect(deps.readFile).toHaveBeenCalledTimes(1);
		expect(deps.request).toHaveBeenCalledTimes(1);
	});

	it("gibt das Abmelden zurück", async () => {
		const unlisten = vi.fn();
		const { deps } = createDeps({ listen: vi.fn().mockResolvedValue(unlisten) });
		await expect(startProjectLaunch(deps)).resolves.toBe(unlisten);
	});

	it("bleibt ruhig, wenn die Desktop-Hülle nicht antwortet", async () => {
		const { deps } = createDeps({ takePending: vi.fn().mockRejectedValue(new Error("weg")) });
		await expect(startProjectLaunch(deps)).resolves.toBeTypeOf("function");
		expect(logError).toHaveBeenCalledWith("project.launchFailed");
		expect(deps.onError).not.toHaveBeenCalled();
	});

	it("bleibt ruhig, wenn das Zuhören nicht klappt", async () => {
		const { deps } = createDeps({ listen: vi.fn().mockRejectedValue(new Error("weg")) });
		await expect(startProjectLaunch(deps)).resolves.toBeTypeOf("function");
		expect(deps.takePending).not.toHaveBeenCalled();
	});
});

describe("defaultLaunchDeps", () => {
	it("stellt die Rückfrage über die gemeinsame Anfrage", () => {
		const onError = vi.fn();
		const deps = defaultLaunchDeps(onError);
		deps.request(BYTES);
		expect(projectOpenRequest.pending).toBe(BYTES);
		projectOpenRequest.cancel();
		expect(deps.onError).toBe(onError);
	});
});
