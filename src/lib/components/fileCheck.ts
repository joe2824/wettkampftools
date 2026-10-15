// Prüft eingelesene Dateien auf Endung, Signatur, Größe und Inhalt.

export type FileKind = "csv" | "excel" | "image" | "rulebook" | "penalties" | "competition" | "json" | "project";

interface KindRule {
	label: string;
	/** Endung → erlaubte Signaturen am Dateianfang; leer = Textdatei ohne Signatur. */
	extensions: Record<string, readonly (readonly number[])[]>;
}

export interface CheckedFile {
	name: string;
	bytes: Uint8Array;
	/** Änderungszeit; null, wenn unbekannt. */
	modifiedMs: number | null;
	/** Erstellungszeit im Dateisystem; null, wenn unbekannt (z. B. im Browser). */
	createdMs: number | null;
	kind: FileKind;
}

/** Datei aus der Desktop-Hülle: Bytes und Zeiten aus dem Dateisystem. */
export interface NativeInputFile {
	name: string;
	bytes: Uint8Array;
	createdMs: number | null;
	modifiedMs: number | null;
}

export type FileCheckResult = { ok: true; kind: FileKind } | { ok: false; message: string };
export type ReadFileResult = { ok: true; file: CheckedFile } | { ok: false; message: string };

const BYTES_PER_MB = 1024 * 1024;
const DEFAULT_MAX_MB = 20;
export const DEFAULT_MAX_BYTES = DEFAULT_MAX_MB * BYTES_PER_MB;
/** Bereich, in dem Textdateien auf NUL-Bytes geprüft werden. */
const TEXT_PROBE_BYTES = 4096;
const NUL = 0x00;

const ZIP = [0x50, 0x4b, 0x03, 0x04];
const OLE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
const PNG = [0x89, 0x50, 0x4e, 0x47];
const JPEG = [0xff, 0xd8, 0xff];
const ZIP_PREFIX = [0x50, 0x4b];

const KIND_RULES: Record<FileKind, KindRule> = {
	csv: { label: "CSV-Datei", extensions: { csv: [] } },
	excel: { label: "Excel-Datei", extensions: { xlsx: [ZIP], xlsm: [ZIP], xls: [OLE] } },
	image: { label: "Bilddatei", extensions: { png: [PNG], jpg: [JPEG], jpeg: [JPEG] } },
	rulebook: { label: "Wettkampfregelwerk", extensions: { rwm: [ZIP_PREFIX] } },
	penalties: { label: "Strafenkatalog", extensions: { def: [ZIP] } },
	competition: { label: "JAuswertung-Wettkampf", extensions: { wk: [ZIP] } },
	json: { label: "JSON-Datei", extensions: { json: [] } },
	project: { label: "Wettkampf-Projekt", extensions: { wwkprojekt: [ZIP] } }
};

const extensionOf = (name: string): string => {
	const dot = name.lastIndexOf(".");
	return dot < 0 ? "" : name.slice(dot + 1).toLowerCase();
};

const extensionList = (kind: FileKind): string[] => Object.keys(KIND_RULES[kind].extensions).map((ext) => `.${ext}`);

const describeKinds = (kinds: FileKind[]): string =>
	kinds.map((kind) => `${KIND_RULES[kind].label} (${extensionList(kind).join(", ")})`).join(" oder ");

const startsWith = (bytes: Uint8Array, signature: readonly number[]): boolean =>
	signature.every((value, index) => bytes[index] === value);

const looksLikeText = (bytes: Uint8Array): boolean => !bytes.subarray(0, TEXT_PROBE_BYTES).includes(NUL);

const contentMatches = (bytes: Uint8Array, signatures: readonly (readonly number[])[]): boolean =>
	signatures.length === 0 ? looksLikeText(bytes) : signatures.some((signature) => startsWith(bytes, signature));

const tooLargeMessage = (maxBytes: number): string =>
	`Die Datei ist größer als ${Math.round(maxBytes / BYTES_PER_MB)} MB.`;

/** Wert für das accept-Attribut eines Datei-Eingabefelds. */
export function acceptAttribute(kinds: FileKind[]): string {
	return kinds.flatMap(extensionList).join(",");
}

/** Filter für den Öffnen-Dialog, je Art einer. */
export function dialogFilters(kinds: FileKind[]): { name: string; extensions: string[] }[] {
	return kinds.map((kind) => ({ name: KIND_RULES[kind].label, extensions: Object.keys(KIND_RULES[kind].extensions) }));
}

/** Prüft eine Datei gegen die erlaubten Arten. */
export function checkFile(
	{ name, bytes }: { name: string; bytes: Uint8Array },
	kinds: FileKind[],
	maxBytes: number = DEFAULT_MAX_BYTES
): FileCheckResult {
	if (bytes.length === 0) return { ok: false, message: "Die Datei ist leer." };
	if (bytes.length > maxBytes) return { ok: false, message: tooLargeMessage(maxBytes) };
	const extension = extensionOf(name);
	const kind = kinds.find((candidate) => extension in KIND_RULES[candidate].extensions);
	if (!kind) return { ok: false, message: `Diese Datei passt hier nicht. Erwartet: ${describeKinds(kinds)}.` };
	if (!contentMatches(bytes, KIND_RULES[kind].extensions[extension])) {
		return { ok: false, message: `Der Inhalt passt nicht zur Dateiendung. Erwartet: ${describeKinds([kind])}.` };
	}
	return { ok: true, kind };
}

/** Liest eine Datei aus Ablage oder Auswahl und prüft sie. Zu große Dateien werden nicht gelesen. */
export async function readCheckedFile(
	file: File,
	kinds: FileKind[],
	maxBytes: number = DEFAULT_MAX_BYTES
): Promise<ReadFileResult> {
	if (file.size > maxBytes) return { ok: false, message: tooLargeMessage(maxBytes) };
	let bytes: Uint8Array;
	try {
		bytes = new Uint8Array(await file.arrayBuffer());
	} catch {
		return { ok: false, message: "Die Datei konnte nicht gelesen werden. Bitte erneut versuchen." };
	}
	const result = checkFile({ name: file.name, bytes }, kinds, maxBytes);
	if (!result.ok) return result;
	return {
		ok: true,
		file: { name: file.name, bytes, modifiedMs: file.lastModified, createdMs: null, kind: result.kind }
	};
}

/** Prüft eine über die Desktop-Hülle gelesene Datei. */
export function checkInputFile(
	input: NativeInputFile,
	kinds: FileKind[],
	maxBytes: number = DEFAULT_MAX_BYTES
): ReadFileResult {
	const result = checkFile(input, kinds, maxBytes);
	if (!result.ok) return result;
	const { name, bytes, createdMs, modifiedMs } = input;
	return { ok: true, file: { name, bytes, modifiedMs, createdMs, kind: result.kind } };
}
