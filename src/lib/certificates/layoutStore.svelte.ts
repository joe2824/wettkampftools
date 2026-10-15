// Urkunden-Layout, Unterschriften und Hintergrund-Scan im App-Datenordner.
import { appDataStore, readJson, writeJson } from "$lib/platform/fs";
import { logError } from "$lib/log";
import type { LayoutSet, LayoutVariant, SignatureSlot } from "./layout";
import { defaultLayouts } from "./layoutDefaults";
import { parseLayoutSet, serializeLayoutSet } from "./layoutParse";

export const LAYOUT_FILE = "layout.json";
const IMAGE_DIR = "images";

export const IMAGE_SLOTS = ["signature1", "signature2", "background"] as const satisfies readonly (
	SignatureSlot | "background"
)[];
export type ImageSlot = (typeof IMAGE_SLOTS)[number];
export type ImageType = "png" | "jpg";
export type ImageSet = Record<ImageSlot, Uint8Array | null>;

const IMAGE_TYPES: readonly ImageType[] = ["png", "jpg"];
const MAGIC: Record<ImageType, readonly number[]> = {
	png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
	jpg: [0xff, 0xd8, 0xff]
};

export const IMAGE_FORMAT_ERROR = "Bitte ein Bild im Format PNG oder JPEG wählen.";
const INVALID_IMPORT_ISSUE = "Die Datei ist keine gültige Layout-Datei. Das Layout bleibt unverändert.";

/** Bildformat an den ersten Bytes; null bei allem außer PNG und JPEG. */
export function detectImageType(bytes: Uint8Array): ImageType | null {
	return IMAGE_TYPES.find((type) => MAGIC[type].every((byte, i) => bytes[i] === byte)) ?? null;
}

const imagePath = (slot: ImageSlot, type: ImageType): string => `${IMAGE_DIR}/${slot}.${type}`;

const emptyImages = (): ImageSet => ({ signature1: null, signature2: null, background: null });

function parseJsonObject(bytes: Uint8Array): object | null {
	try {
		const raw: unknown = JSON.parse(new TextDecoder().decode(bytes));
		return typeof raw === "object" && raw !== null && !Array.isArray(raw) ? raw : null;
	} catch {
		return null;
	}
}

export class LayoutStore {
	layouts = $state<LayoutSet>(defaultLayouts());
	/** Rohe Bilddaten; die Oberfläche baut daraus Blob-Adressen. */
	images = $state<ImageSet>(emptyImages());

	async load(): Promise<void> {
		const loaded = await readJson(LAYOUT_FILE, (raw) => parseLayoutSet(raw).layouts);
		this.layouts = loaded ?? defaultLayouts();
	}

	save(): Promise<void> {
		return writeJson(LAYOUT_FILE, serializeLayoutSet(this.layouts));
	}

	/** Nur im Speicher. */
	resetVariant(variant: LayoutVariant): void {
		this.layouts[variant] = defaultLayouts()[variant];
	}

	/** Nur Positionen, Texte und Stile; nie Bilder. */
	exportLayoutJson(): Uint8Array {
		const serialized = serializeLayoutSet($state.snapshot(this.layouts) as LayoutSet);
		return new TextEncoder().encode(JSON.stringify(serialized, null, "\t"));
	}

	/** Übernimmt eine exportierte Datei; liefert Hinweise. Unlesbare Dateien ändern nichts. */
	importLayoutJson(bytes: Uint8Array): string[] {
		const raw = parseJsonObject(bytes);
		if (raw === null) return [INVALID_IMPORT_ISSUE];
		const { layouts, issues } = parseLayoutSet(raw);
		this.layouts = layouts;
		return issues;
	}

	async loadImages(): Promise<ImageSet> {
		const images = emptyImages();
		for (const slot of IMAGE_SLOTS) images[slot] = await this.#readImage(slot);
		this.images = images;
		return images;
	}

	/** Prüft das Format und ersetzt ein vorhandenes Bild, auch mit anderer Endung. */
	async setImage(slot: ImageSlot, bytes: Uint8Array): Promise<void> {
		const type = detectImageType(bytes);
		if (type === null) throw new Error(IMAGE_FORMAT_ERROR);
		await appDataStore().writeBytes(imagePath(slot, type), bytes);
		for (const other of IMAGE_TYPES) {
			if (other !== type) await appDataStore().remove(imagePath(slot, other));
		}
		this.images[slot] = bytes;
	}

	async removeImage(slot: ImageSlot): Promise<void> {
		for (const type of IMAGE_TYPES) await appDataStore().remove(imagePath(slot, type));
		this.images[slot] = null;
	}

	async #readImage(slot: ImageSlot): Promise<Uint8Array | null> {
		for (const type of IMAGE_TYPES) {
			const bytes = await appDataStore().readBytes(imagePath(slot, type));
			if (bytes === null) continue;
			if (detectImageType(bytes) === type) return bytes;
			logError("layout.imageInvalid");
		}
		return null;
	}
}

export const layoutStore = new LayoutStore();
