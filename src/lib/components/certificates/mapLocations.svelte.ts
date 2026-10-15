// Gespeicherte Standortdaten für die Deutschlandkarte auf der Urkunde.
import type { CertificateMapData } from "$lib/certificates/mapRender";
import { certificateMapData, loadLocationData, type LocationData } from "$lib/workflows/certificateMap";

export class MapLocations {
	data = $state.raw<LocationData | null>(null);
	loaded = $state(false);
	available = $derived(this.data !== null);

	load(): Promise<void> {
		return loadLocationData().then(
			(data) => {
				this.data = data;
				this.loaded = true;
			},
			() => {
				this.loaded = true;
			}
		);
	}

	mapData(names: readonly string[]): CertificateMapData | undefined {
		return certificateMapData(names, this.data);
	}
}
