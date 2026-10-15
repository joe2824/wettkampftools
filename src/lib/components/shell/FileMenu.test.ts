// @vitest-environment happy-dom
import { flushSync, mount, tick, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	choose: vi.fn(),
	load: vi.fn(),
	request: vi.fn(),
	hasData: true
}));

vi.mock("$lib/platform/env", () => ({ isTauri: () => true }));
vi.mock("$lib/components/nativeFile", () => ({ chooseNativeFile: mocks.choose, loadNativeFile: mocks.load }));
vi.mock("$lib/workflows/projectOpenRequest.svelte", () => ({
	projectOpenRequest: { busy: false, request: mocks.request }
}));
vi.mock("$lib/workflows/competitionStore.svelte", () => ({
	competitionStore: { savedAt: null, newCompetition: vi.fn() }
}));
vi.mock("$lib/session.svelte", () => ({
	session: {
		get hasRegistration() {
			return mocks.hasData;
		},
		hasResults: false
	}
}));

const { default: FileMenu } = await import("./FileMenu.svelte");
const { isApplePlatform } = await import("./fileShortcuts");

const PROJECT_BYTES = new Uint8Array([7]);
let component: ReturnType<typeof mount> | null = null;

function render() {
	const target = document.createElement("div");
	document.body.append(target);
	component = mount(FileMenu, { target });
	flushSync();
}

/** Strg unter Windows, ⌘ auf dem Mac – passend zur Testumgebung. */
function press(key: string): KeyboardEvent {
	const modifier = isApplePlatform(navigator.userAgent) ? { metaKey: true } : { ctrlKey: true };
	const event = new KeyboardEvent("keydown", { key, ...modifier, cancelable: true });
	window.dispatchEvent(event);
	return event;
}

const settle = async () => {
	await tick();
	await Promise.resolve();
	await Promise.resolve();
	flushSync();
};

beforeEach(() => {
	mocks.hasData = true;
	mocks.choose.mockResolvedValue("/tmp/Wettkampf.wwkprojekt");
	mocks.load.mockResolvedValue({
		ok: true,
		file: { name: "Wettkampf.wwkprojekt", bytes: PROJECT_BYTES, kind: "project", createdMs: null, modifiedMs: null }
	});
});

afterEach(() => {
	if (component) unmount(component);
	component = null;
	document.body.innerHTML = "";
	vi.clearAllMocks();
});

describe("FileMenu", () => {
	it("zeigt den Menüknopf „Datei“", () => {
		render();
		expect(document.body.textContent).toContain("Datei");
	});

	it("Strg/⌘+O öffnet eine Projektdatei und fragt nach", async () => {
		render();
		const event = press("o");
		await settle();
		expect(event.defaultPrevented).toBe(true);
		expect(mocks.choose).toHaveBeenCalledWith(["project"]);
		await vi.waitFor(() => expect(mocks.request).toHaveBeenCalledWith(PROJECT_BYTES));
	});

	it("Strg/⌘+S öffnet den Speichern-Dialog", async () => {
		render();
		press("s");
		await settle();
		expect(document.querySelector('[role="dialog"]')?.textContent).toContain("Unterschriften mitnehmen");
	});

	it("Strg/⌘+N fragt vor dem neuen Wettkampf nach", async () => {
		render();
		press("n");
		await settle();
		expect(document.querySelector('[role="alertdialog"]')?.textContent).toContain("Neuen Wettkampf beginnen?");
	});

	it("über einem offenen Dialog wirken die Kürzel nicht", async () => {
		render();
		const dialog = document.createElement("div");
		dialog.setAttribute("role", "dialog");
		document.body.append(dialog);
		const event = press("o");
		await settle();
		expect(event.defaultPrevented).toBe(true);
		expect(mocks.choose).not.toHaveBeenCalled();
	});
});
