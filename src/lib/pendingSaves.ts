// Ausstehende, verzögerte Speicherungen, die beim Schließen des Fensters sofort geschrieben werden.
import { logError } from "$lib/log";

export type PendingFlush = () => Promise<void>;

/** So lange wartet das Schließen höchstens auf ausstehende Speicherungen. */
export const FLUSH_TIMEOUT_MS = 2000;

const pending = new Set<PendingFlush>();

/** Mehrfaches Anmelden derselben Funktion zählt einmal. */
export function registerPendingSave(flush: PendingFlush): void {
	pending.add(flush);
}

export function unregisterPendingSave(flush: PendingFlush): void {
	pending.delete(flush);
}

export function pendingSaveCount(): number {
	return pending.size;
}

/** Schreibt alles Ausstehende; true, wenn alles vor Ablauf der Obergrenze fertig war. */
export async function flushPendingSaves(timeoutMs = FLUSH_TIMEOUT_MS): Promise<boolean> {
	if (pending.size === 0) return true;
	const all = Promise.allSettled([...pending].map((flush) => flush())).then(() => true);
	let timer: ReturnType<typeof setTimeout> | undefined;
	const timeout = new Promise<boolean>((resolve) => {
		timer = setTimeout(() => resolve(false), timeoutMs);
	});
	const done = await Promise.race([all, timeout]);
	clearTimeout(timer);
	if (!done) logError("pendingSaves.timeout");
	return done;
}
