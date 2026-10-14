<script lang="ts">
	import PrinterIcon from "@lucide/svelte/icons/printer";
	import { toast } from "svelte-sonner";
	import { Button } from "$lib/components/ui/button";
	import { settingsStore } from "$lib/settings/settingsStore.svelte";
	import { printCalibration } from "$lib/workflows/layoutEditor";
	import { toOffsetMm } from "$lib/workflows/settings";
	import NumberField from "./NumberField.svelte";

	const OFFSET_STEP_MM = 0.5;
	const offset = $derived(settingsStore.settings.certificates.printOffsetMm);

	let printing = $state(false);

	async function print() {
		printing = true;
		try {
			const outcome = await printCalibration($state.snapshot(offset));
			if (outcome.status === "failed") toast.error(outcome.message);
			else if (outcome.status === "saved" && !outcome.opened) {
				toast.info("Kalibrierungsseite gespeichert", { description: "Bitte die Datei öffnen und drucken." });
			}
		} finally {
			printing = false;
		}
	}
</script>

<div class="flex flex-col gap-3">
	<div class="flex flex-col gap-0.5">
		<h3 class="font-semibold">Drucker ausrichten</h3>
		<p class="text-sm text-muted-foreground">
			Kalibrierungsseite in Originalgröße drucken („Tatsächliche Größe“, nicht „An Seite anpassen“) und die
			Fadenkreuze mit den Linealen nachmessen.
		</p>
	</div>
	<Button variant="outline" class="self-start" onclick={print} disabled={printing}>
		<PrinterIcon data-icon="inline-start" />
		{printing ? "Wird erzeugt …" : "Kalibrierungsseite drucken"}
	</Button>
	<div class="grid grid-cols-2 gap-3">
		<NumberField
			id="offset-x"
			label="Versatz X (mm)"
			value={offset.x}
			step={OFFSET_STEP_MM}
			onvalue={(value) => (settingsStore.settings.certificates.printOffsetMm.x = toOffsetMm(value, offset.x))}
		/>
		<NumberField
			id="offset-y"
			label="Versatz Y (mm)"
			value={offset.y}
			step={OFFSET_STEP_MM}
			onvalue={(value) => (settingsStore.settings.certificates.printOffsetMm.y = toOffsetMm(value, offset.y))}
		/>
	</div>
	<p class="text-sm text-muted-foreground">
		Gemessene Abweichung eintragen: druckt der Drucker 1,5 mm zu weit rechts, X = -1,5. Gilt für alle Urkunden,
		nicht für die Vorschau.
	</p>
</div>
