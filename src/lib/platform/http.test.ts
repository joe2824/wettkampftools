import { afterEach, describe, expect, it, vi } from "vitest";

const httpMock = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("@tauri-apps/plugin-http", () => httpMock);

import { platformFetch } from "./http";

afterEach(() => {
	vi.unstubAllGlobals();
	httpMock.fetch.mockReset();
});

describe("platformFetch", () => {
	it("nutzt im Browser das normale fetch", async () => {
		const browserFetch = vi.fn().mockResolvedValue(new Response("ok"));
		vi.stubGlobal("fetch", browserFetch);
		await platformFetch("https://example.org/a");
		expect(browserFetch).toHaveBeenCalledWith("https://example.org/a", undefined);
		expect(httpMock.fetch).not.toHaveBeenCalled();
	});

	it("nutzt in der Desktop-Hülle das HTTP-Plugin", async () => {
		vi.stubGlobal("window", { __TAURI_INTERNALS__: {} });
		httpMock.fetch.mockResolvedValue(new Response("ok"));
		const init = { method: "GET" };
		await platformFetch("https://example.org/a", init);
		expect(httpMock.fetch).toHaveBeenCalledWith("https://example.org/a", init);
	});
});
