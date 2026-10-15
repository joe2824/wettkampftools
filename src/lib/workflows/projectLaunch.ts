// Doppelklick auf eine Projektdatei: Datei lesen und die übliche Rückfrage stellen.
import { logError } from "$lib/log";
import { readInputFile, type InputFile } from "$lib/platform/inputFiles";
import { onProjectFileOpened, takePendingProjectFile } from "$lib/platform/launchFile";
import { userMessage } from "./errors";
import { projectOpenRequest } from "./projectOpenRequest.svelte";

const READ_FAILED = "Die Projektdatei konnte nicht gelesen werden. Bitte über „Projekt öffnen …“ auswählen.";

export interface ProjectLaunchDeps {
	takePending: () => Promise<string | null>;
	listen: (handler: (path: string) => void) => Promise<() => void>;
	readFile: (path: string) => Promise<InputFile>;
	request: (bytes: Uint8Array) => void;
	onError: (message: string) => void;
}

/** Standard-Anbindung an Desktop-Hülle und Rückfrage; Fehler zeigt der Aufrufer. */
export function defaultLaunchDeps(onError: (message: string) => void): ProjectLaunchDeps {
	return {
		takePending: takePendingProjectFile,
		listen: onProjectFileOpened,
		readFile: readInputFile,
		request: (bytes) => projectOpenRequest.request(bytes),
		onError
	};
}

/** Liest die Datei; ob sie den Stand ersetzt, entscheidet erst die Rückfrage. */
export async function openLaunchedProject(path: string, deps: ProjectLaunchDeps): Promise<void> {
	try {
		const file = await deps.readFile(path);
		deps.request(file.bytes);
	} catch (error) {
		logError("project.launchReadFailed");
		deps.onError(userMessage(error, READ_FAILED));
	}
}

/**
 * Erst zuhören, dann die beim Start übergebene Datei abholen; so geht keine verloren.
 * Der Pfad kommt immer über das Abholen, damit jede Datei genau einmal geöffnet wird.
 */
export async function startProjectLaunch(deps: ProjectLaunchDeps): Promise<() => void> {
	const consume = async () => {
		const path = await deps.takePending();
		if (path !== null) await openLaunchedProject(path, deps);
	};
	const consumeQuietly = () =>
		consume().catch(() => {
			logError("project.launchFailed");
		});
	try {
		const unlisten = await deps.listen(() => void consumeQuietly());
		await consumeQuietly();
		return unlisten;
	} catch {
		logError("project.launchFailed");
		return () => {};
	}
}
