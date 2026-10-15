// Mitgelieferte Dateien aus dem Programmordner (static/) laden.

/** Bytes einer mitgelieferten Datei, z. B. „/fonts/Nunito-Bold.ttf“. */
export async function loadStaticAsset(path: string): Promise<Uint8Array> {
	const response = await globalThis.fetch(path);
	if (!response.ok) throw new Error(`Die Datei ${path} konnte nicht geladen werden.`);
	return new Uint8Array(await response.arrayBuffer());
}
