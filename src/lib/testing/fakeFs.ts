// Ablage im Speicher für Tests.
import { tempPath, type AppDataStore } from "$lib/platform/fs";

export type FakeStore = AppDataStore & { files: Map<string, Uint8Array> };

/** Leere Ablage im Speicher; `files` zeigt den Inhalt. */
export function createFakeStore(): FakeStore {
	const files = new Map<string, Uint8Array>();
	const encoder = new TextEncoder();
	const decoder = new TextDecoder();
	const rename = async (from: string, to: string): Promise<void> => {
		const bytes = files.get(from);
		if (!bytes) throw new Error(`Datei fehlt: ${from}`);
		files.delete(from);
		files.set(to, bytes);
	};
	const replace = (path: string, bytes: Uint8Array): Promise<void> => {
		files.set(tempPath(path), bytes);
		return rename(tempPath(path), path);
	};
	return {
		files,
		exists: async (path) => files.has(path),
		readText: async (path) => {
			const bytes = files.get(path);
			return bytes ? decoder.decode(bytes) : null;
		},
		readBytes: async (path) => files.get(path)?.slice() ?? null,
		writeText: (path, text) => replace(path, encoder.encode(text)),
		appendText: async (path, text) => {
			const old = files.get(path) ? decoder.decode(files.get(path)) : "";
			files.set(path, encoder.encode(old + text));
		},
		writeBytes: (path, bytes) => replace(path, bytes.slice()),
		rename,
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
