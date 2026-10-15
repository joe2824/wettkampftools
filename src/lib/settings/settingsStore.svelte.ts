// Einstellungen im App-Datenordner: laden, speichern, zurücksetzen, Export/Import.
import { appDataStore, readJsonOrSetAside, writeJson } from "$lib/platform/fs";
import { readLegacySettings, type LegacySettings } from "$lib/platform/legacySettings";
import { logError, logInfo } from "$lib/log";
import { mergeLegacySettings } from "./legacyMerge";
import {
	defaultSettings,
	keepDeviceFields,
	parseSettings,
	serializeSettingsForExport,
	type Settings
} from "./settings";

export const SETTINGS_FILE = "settings.json";
const INVALID_FILE_ISSUE = "root.invalid";

/** Was beim ersten Start aus der alten Version übernommen wurde. */
export interface MigrationReport {
	applied: string[];
	fellBack: string[];
	warnings: string[];
}

export interface SettingsStoreDeps {
	readLegacy?: () => Promise<LegacySettings | null>;
}

const snapshot = (settings: Settings): string => JSON.stringify(settings);

function parseJsonBytes(bytes: Uint8Array): unknown {
	try {
		return JSON.parse(new TextDecoder().decode(bytes));
	} catch {
		return null;
	}
}

const isObject = (value: unknown): boolean => typeof value === "object" && value !== null && !Array.isArray(value);

export class SettingsStore {
	settings = $state<Settings>(defaultSettings());
	#savedJson = $state(snapshot(defaultSettings()));
	dirty = $derived(snapshot(this.settings) !== this.#savedJson);
	/** Beim Laden beiseitegelegte, unlesbare Dateien. */
	setAside: string[] = [];
	readonly #readLegacy: () => Promise<LegacySettings | null>;

	constructor(deps: SettingsStoreDeps = {}) {
		this.#readLegacy = deps.readLegacy ?? readLegacySettings;
	}

	/** Lädt die Datei; nur beim allerersten Start wird die alte Version übernommen. */
	async load(): Promise<MigrationReport | null> {
		this.setAside = [];
		if (await appDataStore().exists(SETTINGS_FILE)) {
			const { value, setAsideAs } = await readJsonOrSetAside(SETTINGS_FILE, (raw) =>
				isObject(raw) ? parseSettings(raw).settings : null
			);
			this.#accept(value ?? defaultSettings());
			if (setAsideAs !== null) await this.#replaceUnreadable(setAsideAs);
			return null;
		}
		const legacy = await this.#tryReadLegacy();
		if (legacy === null) {
			this.#accept(defaultSettings());
			return null;
		}
		const merged = mergeLegacySettings(defaultSettings(), legacy);
		this.settings = merged.settings;
		await this.save();
		logInfo("settings.migrated", { applied: merged.applied.length, fellBack: merged.fellBack.length });
		return { applied: merged.applied, fellBack: merged.fellBack, warnings: legacy.warnings };
	}

	async save(): Promise<void> {
		await writeJson(SETTINGS_FILE, this.settings);
		this.#savedJson = snapshot(this.settings);
	}

	/** Speichert einzelne Felder sofort, ohne andere ungespeicherte Änderungen mitzuspeichern. */
	async saveFields(patch: Partial<Settings>): Promise<void> {
		const saved: Settings = { ...(JSON.parse(this.#savedJson) as Settings), ...patch };
		const savedJson = snapshot(saved);
		// Vor dem Schreiben übernehmen: Eingaben während des Schreibens bleiben erhalten.
		this.settings = { ...this.settings, ...patch };
		await writeJson(SETTINGS_FILE, saved);
		this.#savedJson = savedJson;
	}

	/**
	 * Nur Altersklassen und Optionen; Mannschaftsnamen, Veranstaltung und Regelwerk bleiben erhalten.
	 * Wirkt nur im Speicher, bis gespeichert wird.
	 */
	resetToDefaults(): void {
		const { teamNameOverrides, event, rulebook } = this.settings;
		this.settings = keepDeviceFields({ ...defaultSettings(), teamNameOverrides, event, rulebook }, this.settings);
	}

	exportJson(): Uint8Array {
		const exported = serializeSettingsForExport($state.snapshot(this.settings) as Settings);
		return new TextEncoder().encode(JSON.stringify(exported, null, "\t"));
	}

	/** Übernimmt eine exportierte Datei; liefert Prüfhinweise. Unlesbare Dateien ändern nichts. */
	importJson(bytes: Uint8Array): string[] {
		const raw = parseJsonBytes(bytes);
		if (!isObject(raw)) return [INVALID_FILE_ISSUE];
		const { settings, issues } = parseSettings(raw);
		this.settings = keepDeviceFields(settings, this.settings);
		return issues;
	}

	#accept(settings: Settings): void {
		this.settings = settings;
		this.#savedJson = snapshot(settings);
	}

	/** Standardwerte gleich speichern, damit beim nächsten Start nicht die alte Version übernommen wird. */
	async #replaceUnreadable(setAsideAs: string): Promise<void> {
		logError("settings.unreadable");
		this.setAside = [setAsideAs];
		await this.save();
	}

	async #tryReadLegacy(): Promise<LegacySettings | null> {
		try {
			return await this.#readLegacy();
		} catch {
			logError("settings.legacyUnreadable");
			return null;
		}
	}
}

export const settingsStore = new SettingsStore();
