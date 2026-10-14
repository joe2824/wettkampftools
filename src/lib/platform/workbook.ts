// Excel-Arbeitsmappen über den Rust-Kern lesen (.xls/.xlsx) und schreiben (.xlsx).
// Datumszellen kommen als Excel-Seriennummer, leere Zeilen/Spalten am Ende sind abgeschnitten.
import { invoke } from "@tauri-apps/api/core";

export type Cell = string | number | boolean | null;

export interface Sheet {
	name: string;
	rows: Cell[][];
}

/** ISO-Zeitpunkte aus den Dokumenteigenschaften; nur bei .xlsx vorhanden. */
export interface WorkbookProperties {
	created: string | null;
	modified: string | null;
}

export interface Workbook {
	sheets: Sheet[];
	properties: WorkbookProperties;
}

export interface WorkbookAdapter {
	read(bytes: Uint8Array): Promise<Workbook>;
	write(sheets: Sheet[]): Promise<Uint8Array>;
}

/** Bytes gehen roh hin und zurück, nicht als JSON-Zahlenliste. */
const tauriWorkbookAdapter: WorkbookAdapter = {
	read: (bytes) => invoke<Workbook>("read_workbook", bytes),
	write: async (sheets) => new Uint8Array(await invoke<ArrayBuffer>("write_workbook", { sheets }))
};

let adapter: WorkbookAdapter = tauriWorkbookAdapter;

/** Für Tests: eigene Anbindung setzen; `null` stellt Rust wieder her. */
export function setWorkbookAdapter(next: WorkbookAdapter | null): void {
	adapter = next ?? tauriWorkbookAdapter;
}

export function readWorkbook(bytes: Uint8Array): Promise<Workbook> {
	return adapter.read(bytes);
}

export function writeWorkbook(sheets: Sheet[]): Promise<Uint8Array> {
	return adapter.write(sheets);
}
