// Tastenkürzel des Menüs „Datei“: Strg unter Windows, ⌘ auf dem Mac.

export type FileAction = "new" | "open" | "save";

const ACTION_KEYS: Record<FileAction, string> = { new: "N", open: "O", save: "S" };
const APPLE = /Mac|iPhone|iPad/;
const DIALOG_SELECTOR = '[role="dialog"], [role="alertdialog"]';

/** Läuft das Programm auf einem Apple-Gerät? Erwartet z. B. navigator.userAgent. */
export function isApplePlatform(userAgent: string): boolean {
	return APPLE.test(userAgent);
}

/** Anzeige im Menü, z. B. „⌘S“ oder „Strg+S“. */
export function shortcutLabel(action: FileAction, apple: boolean): string {
	const key = ACTION_KEYS[action];
	return apple ? `⌘${key}` : `Strg+${key}`;
}

/** Welche Menüaktion die Taste auslöst; null, wenn keine. */
export function fileShortcut(event: KeyboardEvent, apple: boolean): FileAction | null {
	const command = apple ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;
	if (!command || event.shiftKey || event.altKey || event.repeat) return null;
	const key = event.key.toUpperCase();
	const match = (Object.keys(ACTION_KEYS) as FileAction[]).find((action) => ACTION_KEYS[action] === key);
	return match ?? null;
}

/** Ein offener Dialog hat Vorrang vor den Kürzeln. */
export function hasOpenDialog(root: ParentNode): boolean {
	return root.querySelector(DIALOG_SELECTOR) !== null;
}
