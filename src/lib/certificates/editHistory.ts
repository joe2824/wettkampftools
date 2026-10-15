// Rückgängig/Wiederholen für den Layout-Editor über gespeicherte Zustände.

export const HISTORY_LIMIT = 100;
/** Änderungen am selben Objekt innerhalb dieser Zeit zählen als ein Schritt (z. B. Ziehen, Tippen). */
const COALESCE_MS = 700;
const GESTURE_PREFIX = "gesture:";

/** Schlüssel einer Maus-Geste (Ziehen, Skalieren): alles darin ist ein Schritt, auch mit Pausen. */
export const gestureKey = (gesture: number): string => `${GESTURE_PREFIX}${gesture}`;

export interface EditHistory {
	past: readonly string[];
	future: readonly string[];
	lastKey: string | null;
	lastAt: number;
}

export interface HistoryStep {
	history: EditHistory;
	snapshot: string | null;
}

export const emptyHistory = (): EditHistory => ({ past: [], future: [], lastKey: null, lastAt: 0 });

export const canUndo = (history: EditHistory): boolean => history.past.length > 0;
export const canRedo = (history: EditHistory): boolean => history.future.length > 0;

/** Merkt sich den Zustand vor einer Änderung. */
export function record(history: EditHistory, before: string, key: string, now: number): EditHistory {
	const recent = key.startsWith(GESTURE_PREFIX) || now - history.lastAt < COALESCE_MS;
	const coalesce = history.lastKey === key && recent && history.past.length > 0;
	const past = coalesce ? history.past : [...history.past, before].slice(-HISTORY_LIMIT);
	return { past, future: [], lastKey: key, lastAt: now };
}

export function undo(history: EditHistory, current: string): HistoryStep {
	const snapshot = history.past.at(-1);
	if (snapshot === undefined) return { history, snapshot: null };
	return {
		history: { past: history.past.slice(0, -1), future: [...history.future, current], lastKey: null, lastAt: 0 },
		snapshot
	};
}

export function redo(history: EditHistory, current: string): HistoryStep {
	const snapshot = history.future.at(-1);
	if (snapshot === undefined) return { history, snapshot: null };
	return {
		history: { past: [...history.past, current], future: history.future.slice(0, -1), lastKey: null, lastAt: 0 },
		snapshot
	};
}
