// Dateien im App-Datenordner. Pfade sind relativ zu diesem Ordner.
import {
	BaseDirectory,
	exists,
	mkdir,
	readDir,
	readFile,
	readTextFile,
	remove,
	rename,
	writeFile,
	writeTextFile
} from "@tauri-apps/plugin-fs";

/** Was die Anwendung von der Ablage braucht. Fehlende Dateien liefern null. */
export interface AppDataStore {
	exists(path: string): Promise<boolean>;
	readText(path: string): Promise<string | null>;
	readBytes(path: string): Promise<Uint8Array | null>;
	/** Schreibt erst eine Zwischendatei und ersetzt dann das Ziel. */
	writeText(path: string, text: string): Promise<void>;
	appendText(path: string, text: string): Promise<void>;
	/** Wie writeText. */
	writeBytes(path: string, bytes: Uint8Array): Promise<void>;
	/** Benennt um; ein vorhandenes Ziel wird ersetzt. */
	rename(from: string, to: string): Promise<void>;
	/** Fehlende Dateien sind kein Fehler. */
	remove(path: string): Promise<void>;
	/** Dateinamen direkt im Ordner; fehlender Ordner ergibt eine leere Liste. */
	list(dir: string): Promise<string[]>;
}

const opts = { baseDir: BaseDirectory.AppData } as const;
const renameOpts = { oldPathBaseDir: BaseDirectory.AppData, newPathBaseDir: BaseDirectory.AppData } as const;

/** Zwischendatei, aus der das Ziel erst nach vollständigem Schreiben wird. */
export const tempPath = (path: string): string => `${path}.tmp`;

/** Elternordner eines relativen Pfads; "" steht für den Datenordner selbst. */
function parentDir(path: string): string {
	const slash = path.lastIndexOf("/");
	return slash < 0 ? "" : path.slice(0, slash);
}

function ensureParent(path: string): Promise<void> {
	return mkdir(parentDir(path), { ...opts, recursive: true });
}

/** Ein Abbruch beim Schreiben lässt die alte Datei unversehrt. */
async function replaceFile(path: string, write: (target: string) => Promise<void>): Promise<void> {
	await ensureParent(path);
	await write(tempPath(path));
	await rename(tempPath(path), path, renameOpts);
}

export const tauriStore: AppDataStore = {
	exists: (path) => exists(path, opts),
	readText: async (path) => ((await exists(path, opts)) ? readTextFile(path, opts) : null),
	readBytes: async (path) => ((await exists(path, opts)) ? readFile(path, opts) : null),
	writeText: (path, text) => replaceFile(path, (target) => writeTextFile(target, text, opts)),
	async appendText(path, text) {
		await ensureParent(path);
		await writeTextFile(path, text, { ...opts, append: true });
	},
	writeBytes: (path, bytes) => replaceFile(path, (target) => writeFile(target, bytes, opts)),
	rename: (from, to) => rename(from, to, renameOpts),
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

export interface StoredJson<T> {
	value: T | null;
	/** Neuer Name einer unlesbaren Datei; null, wenn nichts beiseitegelegt wurde. */
	setAsideAs: string | null;
}

const pad2 = (n: number): string => String(n).padStart(2, "0");

/** „20261015-070509“ in Ortszeit. */
export function compactTimestamp(date: Date): string {
	const day = `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}`;
	return `${day}-${pad2(date.getHours())}${pad2(date.getMinutes())}${pad2(date.getSeconds())}`;
}

/**
 * Wie readJson, aber eine vorhandene, unlesbare Datei wird umbenannt statt später
 * überschrieben: Sie bleibt zur Rettung erhalten.
 */
export async function readJsonOrSetAside<T>(
	path: string,
	validate: (raw: unknown) => T | null,
	now: Date = new Date()
): Promise<StoredJson<T>> {
	if (!(await active.exists(path))) return { value: null, setAsideAs: null };
	const value = await readJson(path, validate);
	if (value !== null) return { value, setAsideAs: null };
	const setAsideAs = `${path}.unreadable-${compactTimestamp(now)}`;
	await active.rename(path, setAsideAs);
	return { value: null, setAsideAs };
}

/** JSON lesbar eingerückt schreiben. */
export function writeJson(path: string, value: unknown): Promise<void> {
	return active.writeText(path, JSON.stringify(value, null, "\t"));
}
