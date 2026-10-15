// Angaben für den Info-Dialog.
import { openUrl } from "@tauri-apps/plugin-opener";
import { isTauri } from "$lib/platform/env";

export const APP_NAME = "Wettkampftools";
export const AUTHOR = "Joel Klein";
export const PROJECT_URL = "https://github.com/joe2824/wettkampftools";

/** Im Standardbrowser; außerhalb der Desktop-Anwendung in einem neuen Tab. */
export async function openProjectPage(): Promise<void> {
	if (isTauri()) await openUrl(PROJECT_URL);
	else window.open(PROJECT_URL, "_blank", "noopener");
}

/** Vorabversion: Semver mit Vorabteil, etwa „2.1.0-beta.1“. */
export function isPrerelease(version: string): boolean {
	return version.includes("-");
}
