// @vitest-environment happy-dom
import { flushSync, mount, unmount } from "svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import Dropzone from "./Dropzone.svelte";
import type { CheckedFile } from "./fileCheck";

const ZIP = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x01]);

let component: ReturnType<typeof mount> | null = null;

function render(onfile: (file: CheckedFile) => void) {
	const target = document.createElement("div");
	document.body.append(target);
	component = mount(Dropzone, { target, props: { kinds: ["excel"], title: "Meldungen ablegen", onfile } });
	flushSync();
	return target;
}

function dropEvent(files: File[]): Event {
	const event = new Event("drop", { bubbles: true, cancelable: true });
	Object.defineProperty(event, "dataTransfer", { value: { files } });
	return event;
}

const settle = () => vi.waitFor(() => flushSync());

afterEach(() => {
	if (component) unmount(component);
	component = null;
	document.body.innerHTML = "";
});

describe("Dropzone", () => {
	it("liefert die Bytes einer abgelegten Datei", async () => {
		const onfile = vi.fn();
		const target = render(onfile);
		target.querySelector('[role="group"]')!.dispatchEvent(dropEvent([new File([ZIP], "Meldungen.xlsx")]));
		await vi.waitFor(() => expect(onfile).toHaveBeenCalledOnce());
		expect(onfile.mock.calls[0][0]).toMatchObject({ name: "Meldungen.xlsx", kind: "excel", bytes: ZIP });
	});

	it("liefert die Bytes einer über den Button gewählten Datei", async () => {
		const onfile = vi.fn();
		const target = render(onfile);
		const input = target.querySelector<HTMLInputElement>('input[type="file"]')!;
		const click = vi.spyOn(input, "click").mockImplementation(() => {});
		target.querySelector("button")!.click();
		expect(click).toHaveBeenCalled();
		Object.defineProperty(input, "files", { value: [new File([ZIP], "Meldungen.xlsx")], configurable: true });
		input.dispatchEvent(new Event("change", { bubbles: true }));
		await vi.waitFor(() => expect(onfile).toHaveBeenCalledOnce());
		expect(input.accept).toBe(".xlsx,.xlsm,.xls");
	});

	it("zeigt eine deutsche Meldung bei falscher Datei", async () => {
		const onfile = vi.fn();
		const target = render(onfile);
		target.querySelector('[role="group"]')!.dispatchEvent(dropEvent([new File(["x"], "Bild.png")]));
		await vi.waitFor(() => {
			flushSync();
			expect(target.querySelector('[role="alert"]')?.textContent).toContain("Diese Datei passt hier nicht.");
		});
		expect(onfile).not.toHaveBeenCalled();
	});

	it("übernimmt nur die erste von mehreren Dateien", async () => {
		const onfile = vi.fn();
		const target = render(onfile);
		const files = [new File([ZIP], "Eins.xlsx"), new File([ZIP], "Zwei.xlsx")];
		target.querySelector('[role="group"]')!.dispatchEvent(dropEvent(files));
		await vi.waitFor(() => expect(onfile).toHaveBeenCalledOnce());
		await settle();
		expect(onfile.mock.calls[0][0].name).toBe("Eins.xlsx");
		expect(target.querySelector('[role="status"]')?.textContent).toContain("nur die erste Datei");
	});
});
