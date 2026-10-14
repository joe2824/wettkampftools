// Datei-Protokoll im App-Datenordner. Nur Codes und Zahlen, nie Inhalte.
import { appDataStore } from "$lib/platform/fs";

export type LogLevel = "INFO" | "ERROR";

/** Zusatzwerte: nur Zahlen und Wahrheitswerte, damit kein Text ins Protokoll gerät. */
export type LogData = Readonly<Record<string, number | boolean>>;

const LOG_DIR = "logs";
const LOG_FILE = /^(\d{4}-\d{2}-\d{2})\.log$/;
const CODE = /^[a-z0-9_.-]+$/i;
const INVALID_CODE = "invalid_code";
const MS_DIGITS = 3;

/** So viele Tage (einschließlich heute) bleiben liegen. */
export const KEEP_DAYS = 14;

const pad = (n: number, len = 2): string => String(n).padStart(len, "0");

function dayStamp(d: Date): string {
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function timeStamp(d: Date): string {
	const ms = pad(d.getMilliseconds(), MS_DIGITS);
	return `${dayStamp(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${ms}`;
}

function safeCode(code: string): string {
	return CODE.test(code) ? code : INVALID_CODE;
}

function dataText(data: LogData): string {
	return Object.entries(data)
		.filter(([key, value]) => CODE.test(key) && (typeof value === "number" || typeof value === "boolean"))
		.map(([key, value]) => ` ${key}=${value}`)
		.join("");
}

/** Eine Protokollzeile im selben Format wie der Rust-Teil. */
export function formatLogLine(at: Date, level: LogLevel, code: string, data: LogData = {}): string {
	return `${timeStamp(at)} web ${level.padEnd(5)} ${safeCode(code)}${dataText(data)}`;
}

let queue: Promise<void> = Promise.resolve();

function write(level: LogLevel, code: string, data?: LogData): void {
	const now = new Date();
	const line = formatLogLine(now, level, code, data);
	if (import.meta.env.DEV) (level === "ERROR" ? console.error : console.info)(line);
	const path = `${LOG_DIR}/${dayStamp(now)}.log`;
	queue = queue
		.then(() => appDataStore().appendText(path, `${line}\n`))
		// Protokollieren darf die Anwendung nie stören.
		.catch(() => {});
}

export function logInfo(code: string, data?: LogData): void {
	write("INFO", code, data);
}

export function logError(code: string, data?: LogData): void {
	write("ERROR", code, data);
}

/** Wartet, bis alle Zeilen geschrieben sind. */
export function flushLog(): Promise<void> {
	return queue;
}

/** Löscht Tagesdateien, die älter als KEEP_DAYS sind. */
export async function pruneOldLogs(today: Date = new Date()): Promise<void> {
	const store = appDataStore();
	const cutoff = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (KEEP_DAYS - 1));
	const oldest = dayStamp(cutoff);
	for (const name of await store.list(LOG_DIR)) {
		const day = LOG_FILE.exec(name)?.[1];
		if (day !== undefined && day < oldest) await store.remove(`${LOG_DIR}/${name}`);
	}
}

/** Nur der Name, nie die Meldung: die kann Inhalte enthalten. */
function errorName(value: unknown): string {
	return value instanceof Error ? value.name : "unknown";
}

type ErrorEventTarget = Pick<Window, "addEventListener" | "removeEventListener">;

/** Ungefangene Fehler protokollieren. Gibt eine Funktion zum Abmelden zurück. */
export function installErrorLogging(target: ErrorEventTarget = window): () => void {
	const onError = (e: ErrorEvent): void => logError(`uncaught.${errorName(e.error)}`);
	const onRejection = (e: PromiseRejectionEvent): void => logError(`unhandled.${errorName(e.reason)}`);
	target.addEventListener("error", onError);
	target.addEventListener("unhandledrejection", onRejection);
	return () => {
		target.removeEventListener("error", onError);
		target.removeEventListener("unhandledrejection", onRejection);
	};
}
