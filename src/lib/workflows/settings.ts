// Abläufe der Einstellungsseite: Export, Import, Speichern, Regelwerk und Unterschriften.
import { datedFileName, saveFile } from "$lib/platform/files";
import { parseRulebook, RulebookError } from "$lib/io/rulebook";
import { issueMessages } from "$lib/settings/issueMessages";
import {
	MAX_COPIES,
	MAX_PRINT_OFFSET_MM,
	MIN_COPIES,
	type RulebookSummary,
	type Settings,
} from "$lib/settings/settings";
import { IMAGE_FORMAT_ERROR, type ImageSlot } from "$lib/certificates/layoutStore.svelte";

const SETTINGS_EXPORT_NAME = "Wettkampftools_Einstellungen.json";
const UNREADABLE_ISSUE = "root.invalid";
const SIGNATURE_SAVE_ERROR = "Die Unterschrift konnte nicht gespeichert werden. Bitte erneut versuchen.";

export interface ImportOutcome {
	/** false: Datei war unlesbar, nichts wurde geändert. */
	applied: boolean;
	messages: string[];
}

export type RulebookOutcome = { ok: true; rulebook: RulebookSummary } | { ok: false; message: string };

/** Speichern-Dialog für die Einstellungsdatei; null bei Abbruch. */
export function exportSettings(store: { exportJson(): Uint8Array }): Promise<string | null> {
	return saveFile({
		defaultName: datedFileName(SETTINGS_EXPORT_NAME),
		filters: [{ name: "Einstellungen", extensions: ["json"] }],
		bytes: store.exportJson(),
	});
}

export function importSettings(store: { importJson(bytes: Uint8Array): string[] }, bytes: Uint8Array): ImportOutcome {
	const issues = store.importJson(bytes);
	return { applied: !issues.includes(UNREADABLE_ISSUE), messages: issueMessages(issues) };
}

/** Die Wellen-Starterlaubnis muss in der Altersklassen-Liste stehen. */
export async function saveSettings(store: { settings: Settings; save(): Promise<void> }): Promise<void> {
	const { settings } = store;
	if (!settings.ageGroups.includes(settings.waveStartAgeGroup) && settings.ageGroups.length > 0) {
		settings.waveStartAgeGroup = settings.ageGroups[0];
	}
	await store.save();
}

export function readRulebook(bytes: Uint8Array): RulebookOutcome {
	try {
		return { ok: true, rulebook: parseRulebook(bytes) };
	} catch (error) {
		if (error instanceof RulebookError) return { ok: false, message: error.message };
		throw error;
	}
}

/** Liefert eine Fehlermeldung oder null bei Erfolg. */
export async function storeSignature(
	images: { setImage(slot: ImageSlot, bytes: Uint8Array): Promise<void> },
	slot: ImageSlot,
	bytes: Uint8Array,
): Promise<string | null> {
	try {
		await images.setImage(slot, bytes);
		return null;
	} catch (error) {
		// Nur die Formatmeldung ist für Anwender geschrieben.
		return error instanceof Error && error.message === IMAGE_FORMAT_ERROR ? IMAGE_FORMAT_ERROR : SIGNATURE_SAVE_ERROR;
	}
}

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

/** Eingabe aus einem Zahlenfeld; leer bleibt beim alten Wert. */
export function toCopies(value: number, previous: number): number {
	return Number.isFinite(value) ? clamp(Math.round(value), MIN_COPIES, MAX_COPIES) : previous;
}

export function toOffsetMm(value: number, previous: number): number {
	return Number.isFinite(value) ? clamp(value, -MAX_PRINT_OFFSET_MM, MAX_PRINT_OFFSET_MM) : previous;
}
