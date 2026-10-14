// Eingabedateien über den Öffnen-Dialog oder Ablegen lesen, samt Datum aus dem Dateisystem.
// Pfad, Endung und Größe prüft die Desktop-Hülle.
import { invoke } from "@tauri-apps/api/core";
import { open, type DialogFilter } from "@tauri-apps/plugin-dialog";

export interface InputFile {
	name: string;
	bytes: Uint8Array;
	/** Erstellungszeit im Dateisystem; null, wenn unbekannt. */
	createdMs: number | null;
	/** Änderungszeit im Dateisystem; null, wenn unbekannt. */
	modifiedMs: number | null;
}

interface InputFileInfo {
	name: string;
	size: number;
	createdMs: number | null;
	modifiedMs: number | null;
}

/** Fragt nach einer Datei. Gibt den Pfad zurück, bei Abbruch null. */
export async function pickInputFile(filters: DialogFilter[]): Promise<string | null> {
	const path = await open({ multiple: false, directory: false, filters });
	return path ?? null;
}

/** Liest eine gewählte oder abgelegte Datei. */
export async function readInputFile(path: string): Promise<InputFile> {
	const info = await invoke<InputFileInfo>("input_file_info", { path });
	const buffer = await invoke<ArrayBuffer>("read_input_file", { path });
	return { name: info.name, bytes: new Uint8Array(buffer), createdMs: info.createdMs, modifiedMs: info.modifiedMs };
}

export type DropPayload =
	| { type: "enter" | "drop"; paths: string[]; position: { x: number; y: number } }
	| { type: "over"; position: { x: number; y: number } }
	| { type: "leave" };

/** Meldet Ziehen und Ablegen von Dateien über dem Fenster (Positionen in physischen Pixeln). */
export async function listenFileDrop(handler: (payload: DropPayload) => void): Promise<() => void> {
	const { getCurrentWebview } = await import("@tauri-apps/api/webview");
	return getCurrentWebview().onDragDropEvent((event) => handler(event.payload));
}
