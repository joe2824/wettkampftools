// Netzabrufe - je nachdem, wo das Programm läuft.
import { isTauri } from "./env";

export type FetchFn = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

let tauriFetch: FetchFn | null = null;

/**
 * Abruf dieser Umgebung. In der Desktop-Hülle über das HTTP-Plugin, sonst wäre
 * jeder Aufruf von `tauri://localhost` aus CORS-pflichtig.
 */
export const platformFetch: FetchFn = async (input, init) => {
	if (!isTauri()) return globalThis.fetch(input, init);
	if (!tauriFetch) tauriFetch = (await import("@tauri-apps/plugin-http")).fetch;
	return tauriFetch(input, init);
};
