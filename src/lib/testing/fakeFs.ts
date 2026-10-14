// Ablage im Speicher für Tests.
import type { AppDataStore } from "$lib/platform/fs";

export type FakeStore = AppDataStore & { files: Map<string, Uint8Array> };

/** Leere Ablage im Speicher; `files` zeigt den Inhalt. */
export function createFakeStore(): FakeStore {
	const files = new Map<string, Uint8Array>();
	const encoder = new TextEncoder();
	const decoder = new TextDecoder();
	return {
		files,
		exists: async (path) => files.has(path),
		readText: async (path) => {
			const bytes = files.get(path);
			return bytes ? decoder.decode(bytes) : null;
		},
		readBytes: async (path) => files.get(path)?.slice() ?? null,
		writeText: async (path, text) => void files.set(path, encoder.encode(text)),
		appendText: async (path, text) => {
			const old = files.get(path) ? decoder.decode(files.get(path)) : "";
			files.set(path, encoder.encode(old + text));
		},
		writeBytes: async (path, bytes) => void files.set(path, bytes.slice()),
		remove: async (path) => void files.delete(path),
		list: async (dir) => {
			const prefix = `${dir}/`;
			return [...files.keys()]
				.filter((k) => k.startsWith(prefix))
				.map((k) => k.slice(prefix.length))
				.filter((name) => !name.includes("/"));
		}
	};
}
