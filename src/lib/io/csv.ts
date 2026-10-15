import Papa from "papaparse";

export type TextEncodingName = "utf-8" | "windows-1252";

export interface DecodedText {
	text: string;
	encoding: TextEncodingName;
}

export type CsvRow = Record<string, string>;

export interface ParsedCsv {
	headers: string[];
	rows: CsvRow[];
}

export interface ParsedRegistrationCsv extends ParsedCsv {
	encoding: TextEncodingName;
}

const CSV_DELIMITER = ";";
export const REQUIRED_REGISTRATION_COLUMNS: readonly string[] = ["gliederung", "ak", "geschlecht"];

const BYTE_ORDER_MARK = "﻿";

/** Pflichtspalten fehlen – Datei ist vermutlich kein Mannschaften-Export. */
export class MissingColumnsError extends Error {
	readonly missing: string[];

	constructor(missing: string[]) {
		super(`Pflichtspalten fehlen: ${missing.join(", ")}`);
		this.name = "MissingColumnsError";
		this.missing = missing;
	}
}

function stripBom(text: string): string {
	return text.startsWith(BYTE_ORDER_MARK) ? text.slice(BYTE_ORDER_MARK.length) : text;
}

/** Erst striktes UTF-8, sonst Windows-1252 (deckt ISO-8859-1 ab). */
export function decodeText(bytes: Uint8Array): DecodedText {
	try {
		const text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
		return { text: stripBom(text), encoding: "utf-8" };
	} catch {
		const text = new TextDecoder("windows-1252").decode(bytes);
		return { text: stripBom(text), encoding: "windows-1252" };
	}
}

function toRow(cells: string[], columns: { header: string; index: number }[]): CsvRow {
	const row: CsvRow = {};
	for (const { header, index } of columns) {
		row[header] = (cells[index] ?? "").trim();
	}
	return row;
}

/** Liest Semikolon-CSV; Spalten ohne Überschrift und leere Zeilen entfallen. */
export function parseCsv(text: string): ParsedCsv {
	const result = Papa.parse<string[]>(stripBom(text), {
		delimiter: CSV_DELIMITER,
		skipEmptyLines: "greedy"
	});
	const [headerCells = [], ...dataRows] = result.data;
	const columns = headerCells
		.map((cell, index) => ({ header: cell.trim(), index }))
		.filter((column) => column.header !== "");
	return {
		headers: columns.map((column) => column.header),
		rows: dataRows.map((cells) => toRow(cells, columns))
	};
}

export function checkRequiredColumns(headers: readonly string[], required: readonly string[]): string[] {
	return required.filter((column) => !headers.includes(column));
}

/** Dekodieren, lesen und Pflichtspalten prüfen. */
export function parseRegistrationCsv(bytes: Uint8Array): ParsedRegistrationCsv {
	const { text, encoding } = decodeText(bytes);
	const parsed = parseCsv(text);
	const missing = checkRequiredColumns(parsed.headers, REQUIRED_REGISTRATION_COLUMNS);
	if (missing.length > 0) throw new MissingColumnsError(missing);
	return { encoding, ...parsed };
}
