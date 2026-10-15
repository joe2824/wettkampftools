// Blob-Adressen für Unterschriften und Hintergrund-Scan; alte werden freigegeben.
import { IMAGE_SLOTS, type ImageSet, type ImageSlot } from "$lib/certificates/layoutStore.svelte";

export type ImageUrlMap = Partial<Record<ImageSlot, string>>;

export class ImageUrls {
	urls = $state.raw<ImageUrlMap>({});

	/** Beobachtet die Bilder; liefert eine Funktion zum Beenden. */
	track(images: () => ImageSet): () => void {
		return $effect.root(() => {
			$effect(() => {
				const current = images();
				const urls: ImageUrlMap = {};
				for (const slot of IMAGE_SLOTS) {
					const bytes = current[slot];
					if (bytes) urls[slot] = URL.createObjectURL(new Blob([bytes as BlobPart]));
				}
				this.urls = urls;
				return () => Object.values(urls).forEach((url) => URL.revokeObjectURL(url));
			});
		});
	}
}
