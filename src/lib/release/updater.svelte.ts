// Update-Suche und -Installation über GitHub-Releases (nur stabile Versionen).
import { check, type DownloadEvent, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { isTauri } from "$lib/platform/env";
import { flushLog, logError, logInfo } from "$lib/log";

export type UpdatePhase = "idle" | "checking" | "available" | "upToDate" | "downloading" | "error";

/** Der Server nennt keine Größe. */
export const UNKNOWN_PROGRESS = -1;
const FULL_PROGRESS = 100;

export const CHECK_ERROR = "Die Suche nach Updates ist gerade nicht möglich. Bitte die Internetverbindung prüfen.";
export const INSTALL_ERROR = "Das Update konnte nicht installiert werden. Bitte später erneut versuchen.";

export class UpdaterState {
	phase = $state<UpdatePhase>("idle");
	version = $state<string | null>(null);
	notes = $state("");
	/** 0..100 oder UNKNOWN_PROGRESS. */
	progress = $state(0);
	error = $state<string | null>(null);
	dialogOpen = $state(false);
	#update: Update | null = null;
	#downloaded = 0;
	#totalBytes = 0;

	/** Bei der stillen Suche bleiben Fehler unsichtbar (etwa ohne Netz beim Start). */
	async check({ silent = false } = {}): Promise<UpdatePhase> {
		this.phase = "checking";
		this.error = null;
		try {
			this.#update = await check();
		} catch {
			logError("update.checkFailed");
			this.#update = null;
			this.version = null;
			this.error = silent ? null : CHECK_ERROR;
			this.phase = silent ? "idle" : "error";
			return this.phase;
		}
		this.version = this.#update?.version ?? null;
		this.notes = this.#update?.body ?? "";
		this.phase = this.#update ? "available" : "upToDate";
		if (this.#update) {
			logInfo("update.found");
			this.dialogOpen = true;
		}
		return this.phase;
	}

	async checkOnStart(): Promise<void> {
		if (!isTauri()) return;
		await this.check({ silent: true });
	}

	async install(): Promise<void> {
		const update = this.#update;
		if (!update) return;
		this.phase = "downloading";
		this.error = null;
		this.progress = UNKNOWN_PROGRESS;
		this.#downloaded = 0;
		this.#totalBytes = 0;
		logInfo("update.installing");
		try {
			await update.downloadAndInstall((event) => this.#onDownload(event));
			// Vor dem Neustart schreiben, sonst geht die Zeile verloren.
			await flushLog();
			await relaunch();
		} catch {
			logError("update.installFailed");
			this.error = INSTALL_ERROR;
			this.phase = "error";
		}
	}

	postpone(): void {
		this.dialogOpen = false;
	}

	#onDownload(event: DownloadEvent): void {
		if (event.event === "Started") {
			this.#totalBytes = event.data.contentLength ?? 0;
			this.progress = this.#totalBytes > 0 ? 0 : UNKNOWN_PROGRESS;
		} else if (event.event === "Progress") {
			this.#downloaded += event.data.chunkLength;
			if (this.#totalBytes > 0) this.progress = Math.round((this.#downloaded / this.#totalBytes) * FULL_PROGRESS);
		} else {
			this.progress = FULL_PROGRESS;
		}
	}
}

export const updater = new UpdaterState();
