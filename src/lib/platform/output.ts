// Gespeicherte Ausgabedateien öffnen oder im Ordner zeigen. Die Prüfung von
// Pfad und Endung übernimmt die Desktop-Hülle.
import { invoke } from "@tauri-apps/api/core";

/** Öffnet die Datei mit dem Standardprogramm. */
export function openOutputFile(path: string): Promise<void> {
	return invoke("open_output_file", { path });
}

/** Zeigt die Datei im Dateimanager. */
export function revealOutputFile(path: string): Promise<void> {
	return invoke("reveal_output_file", { path });
}
