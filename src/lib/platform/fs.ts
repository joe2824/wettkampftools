// Dateien im App-Datenordner. Pfade sind relativ zu diesem Ordner.
import {
	BaseDirectory,
	exists,
	mkdir,
	readDir,
	readFile,
	readTextFile,
	remove,
	writeFile,
	writeTextFile
} from "@tauri-apps/plugin-fs";

/** Was die Anwendung von der Ablage braucht. Fehlende Dateien liefern null. */
export interface AppDataStore {
	exists(path: string): Promise<boolean>;
	readText(path: string): Promise<string | null>;
	readBytes(path: string): Promise<Uint8Array | null>;
	writeText(path: string, text: string): Promise<void>;
	appendText(path: string, text: string): Promise<void>;
	writeBytes(path: string, bytes: Uint8Array): Promise<void>;
	/** Fehlende Dateien sind kein Fehler. */
	remove(path: string): Promise<void>;
	/** Dateinamen direkt im Ordner; fehlender Ordner ergibt eine leere Liste. */
	list(dir: string): Promise<string[]>;
}

const opts = { baseDir: BaseDirectory.AppData } as const;

/** Elternordner eines relativen Pfads; "" steht für den Datenordner selbst. */
function parentDir(path: string): string {
	const slash = path.lastIndexOf("/");
	return slash < 0 ? "" : path.slice(0, slash);
}

function ensureParent(path: string): Promise<void> {
	return mkdir(parentDir(path), { ...opts, recursive: true });
}

export const tauriStore: AppDataStore = {
	exists: (path) => exists(path, opts),
	readText: async (path) => ((await exists(path, opts)) ? readTextFile(path, opts) : null),
	readBytes: async (path) => ((await exists(path, opts)) ? readFile(path, opts) : null),
	async writeText(path, text) {
		await ensureParent(path);
		await writeTextFile(path, text, opts);
	},
	async appendText(path, text) {
		await ensureParent(path);
		await writeTextFile(path, text, { ...opts, append: true });
	},
	async writeBytes(path, bytes) {
		await ensureParent(path);
		await writeFile(path, bytes, opts);
	},
	async remove(path) {
		if (await exists(path, opts)) await remove(path, opts);
	},
	async list(dir) {
		if (!(await exists(dir, opts))) return [];
		return (await readDir(dir, opts)).filter((e) => e.isFile).map((e) => e.name);
	}
};

let active: AppDataStore = tauriStore;

/** Die eingestellte Ablage. */
export function appDataStore(): AppDataStore {
	return active;
}

/** Andere Ablage einsetzen, etwa die Attrappe in Tests. */
export function setAppDataStore(store: AppDataStore): void {
	active = store;
}

/** Zurück zur Ablage auf der Platte. */
export function resetAppDataStore(): void {
	active = tauriStore;
}

/**
 * JSON lesen und prüfen. Fehlt die Datei, ist sie kaputt oder lehnt die Prüfung
 * ab (null oder Ausnahme), kommt null zurück.
 */
export async function readJson<T>(path: string, validate: (raw: unknown) => T | null): Promise<T | null> {
	const text = await active.readText(path);
	if (text === null) return null;
	try {
		return validate(JSON.parse(text));
	} catch {
		return null;
	}
}

/** JSON lesbar eingerückt schreiben. */
export function writeJson(path: string, value: unknown): Promise<void> {
	return active.writeText(path, JSON.stringify(value, null, "\t"));
}
