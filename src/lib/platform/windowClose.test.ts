import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const windowMock = vi.hoisted(() => {
	const onCloseRequested = vi.fn();
	return { onCloseRequested, getCurrentWindow: vi.fn(() => ({ onCloseRequested })) };
});
vi.mock("@tauri-apps/api/window", () => windowMock);

import { beforeWindowClose } from "./windowClose";

type CloseHandler = (event: { preventDefault: () => void }) => Promise<void>;

beforeEach(() => {
	windowMock.onCloseRequested.mockReset();
	vi.stubGlobal("window", { __TAURI_INTERNALS__: {} });
});

afterEach(() => vi.unstubAllGlobals());

describe("beforeWindowClose", () => {
	it("wartet beim Schließen auf die Aufgabe und lässt das Fenster danach schließen", async () => {
		const unlisten = vi.fn();
		windowMock.onCloseRequested.mockResolvedValue(unlisten);
		let release = () => {};
		const task = vi.fn(() => new Promise<void>((resolve) => (release = resolve)));
		await expect(beforeWindowClose(task)).resolves.toBe(unlisten);

		const handler = windowMock.onCloseRequested.mock.calls[0][0] as CloseHandler;
		const preventDefault = vi.fn();
		let closed = false;
		const closing = handler({ preventDefault }).then(() => (closed = true));
		await Promise.resolve();
		expect(task).toHaveBeenCalledTimes(1);
		expect(closed).toBe(false);
		release();
		await closing;
		expect(preventDefault).not.toHaveBeenCalled();
	});

	it("schließt auch, wenn die Aufgabe fehlschlägt", async () => {
		windowMock.onCloseRequested.mockResolvedValue(vi.fn());
		await beforeWindowClose(() => Promise.reject(new Error("voll")));
		const handler = windowMock.onCloseRequested.mock.calls[0][0] as CloseHandler;
		const preventDefault = vi.fn();
		await expect(handler({ preventDefault })).resolves.toBeUndefined();
		expect(preventDefault).not.toHaveBeenCalled();
	});

	it("tut im normalen Browser nichts", async () => {
		vi.stubGlobal("window", {});
		await expect(beforeWindowClose(async () => undefined)).resolves.toBeNull();
		expect(windowMock.onCloseRequested).not.toHaveBeenCalled();
	});
});
