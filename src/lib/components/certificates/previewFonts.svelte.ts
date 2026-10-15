// Textmaße für die Vorschau, sobald die Schriften geladen sind.
import { createMetrics, type TextMetrics } from "$lib/certificates/fonts";
import { loadAppFonts } from "$lib/platform/assets";

export class PreviewFonts {
	metrics = $state.raw<TextMetrics | null>(null);
	failed = $state(false);

	load(): Promise<void> {
		return loadAppFonts().then(
			(fonts) => {
				this.metrics = createMetrics(fonts);
			},
			() => {
				this.failed = true;
			}
		);
	}
}
