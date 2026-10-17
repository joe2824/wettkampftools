// Angaben für den Info-Dialog.
import { openUrl } from "@tauri-apps/plugin-opener";
import { isTauri } from "$lib/platform/env";

export { APP_NAME } from "./appName";
export const AUTHOR = "Joel Klein";
export const PROJECT_URL = "https://github.com/joe2824/wettkampftools";

/**
 * Im Standardbrowser; außerhalb der Desktop-Anwendung in einem neuen Tab.
 * Die Adresse muss in src-tauri/capabilities/default.json freigegeben sein.
 */
export async function openExternalUrl(url: string): Promise<void> {
	if (isTauri()) await openUrl(url);
	else window.open(url, "_blank", "noopener");
}

/** Vorabversion: Semver mit Vorabteil, etwa „2.1.0-beta.1“. */
export function isPrerelease(version: string): boolean {
	return version.includes("-");
}
