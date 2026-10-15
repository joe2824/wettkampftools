// Projektdatei, mit der die Anwendung per Doppelklick gestartet oder nach vorn geholt wurde.
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

const PROJECT_FILE_OPENED = "project-file-opened";

/** Vorgemerkte Projektdatei; jede Datei wird nur einmal geliefert. */
export async function takePendingProjectFile(): Promise<string | null> {
	return (await invoke<string | null>("take_pending_project_file")) ?? null;
}

/** Meldet Projektdateien, die geöffnet werden, während die Anwendung läuft. */
export async function onProjectFileOpened(handler: (path: string) => void): Promise<UnlistenFn> {
	return listen<string>(PROJECT_FILE_OPENED, (event) => handler(event.payload));
}
