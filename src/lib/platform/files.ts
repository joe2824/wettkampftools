// Ausgabedateien über den Speichern-Dialog schreiben. Pfad und Endung prüft die Desktop-Hülle.
import { invoke } from "@tauri-apps/api/core";
import type { DialogFilter } from "./dialog";

export interface SaveFileRequest {
	defaultName: string;
	filters: DialogFilter[];
	bytes: Uint8Array;
}

/** Fragt nach dem Ziel und schreibt dorthin. Gibt den Pfad zurück, bei Abbruch null. */
export async function saveFile({ defaultName, filters, bytes }: SaveFileRequest): Promise<string | null> {
	// Der Dialog der Desktop-Hülle gibt das Ziel nur zum Schreiben frei.
	const path = await invoke<string | null>("pick_save_path", { defaultName, filters });
	if (!path) return null;
	await invoke("write_output_file", bytes, pathHeader(path));
	return path;
}

/** Bytes roh im Body; der Pfad steht kodiert in einer Kopfzeile. */
const pathHeader = (path: string) => ({ headers: { "x-output-path": encodeURIComponent(path) } });

/**
 * Schreibt den Strafenkatalog als „<Name>m.def“ neben ein gerade über den Dialog
 * gespeichertes Regelwerk. Gibt den Pfad des Katalogs zurück.
 */
export function writePenaltyCatalogNextTo(rulebookPath: string, bytes: Uint8Array): Promise<string> {
	return invoke<string>("write_penalty_catalog", bytes, pathHeader(rulebookPath));
}

const pad2 = (n: number): string => String(n).padStart(2, "0");

/** Dateiname mit Datum davor, z. B. "20261114_WWK_Meldungen.xlsx". */
export function datedFileName(name: string, date: Date = new Date()): string {
	const prefix = `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}`;
	return `${prefix}_${name}`;
}
