// Ausgabedateien über den Speichern-Dialog schreiben.
import { save, type DialogFilter } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";

export interface SaveFileRequest {
	defaultName: string;
	filters: DialogFilter[];
	bytes: Uint8Array;
}

/** Fragt nach dem Ziel und schreibt dorthin. Gibt den Pfad zurück, bei Abbruch null. */
export async function saveFile({ defaultName, filters, bytes }: SaveFileRequest): Promise<string | null> {
	const path = await save({ defaultPath: defaultName, filters });
	if (!path) return null;
	await writeFile(path, bytes);
	return path;
}

const pad2 = (n: number): string => String(n).padStart(2, "0");

/** Dateiname mit Datum davor, z. B. "20261114_WWK_Meldungen.xlsx". */
export function datedFileName(name: string, date: Date = new Date()): string {
	const prefix = `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}`;
	return `${prefix}_${name}`;
}
