<script lang="ts">
	import PrinterIcon from "@lucide/svelte/icons/printer";
	import { toast } from "svelte-sonner";
	import { Button } from "$lib/components/ui/button";
	import * as Dialog from "$lib/components/ui/dialog";
	import { settingsStore } from "$lib/settings/settingsStore.svelte";
	import { printCalibration } from "$lib/workflows/layoutEditor";
	import { toOffsetMm } from "$lib/workflows/settings";
	import NumberField from "./NumberField.svelte";

	let { open = $bindable(false) }: { open?: boolean } = $props();

	const OFFSET_STEP_MM = 0.5;
	const offset = $derived(settingsStore.settings.certificates.printOffsetMm);

	let printing = $state(false);

	// Versatz sofort speichern, unabhängig vom Speichern des Layouts.
	function setOffset(axis: "x" | "y", value: number) {
		const certificates = settingsStore.settings.certificates;
		const printOffsetMm = { ...certificates.printOffsetMm, [axis]: toOffsetMm(value, certificates.printOffsetMm[axis]) };
		settingsStore.saveFields({ certificates: { ...certificates, printOffsetMm } });
	}

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

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Drucker ausrichten</Dialog.Title>
			<Dialog.Description>
				Kalibrierungsseite in Originalgröße drucken („Tatsächliche Größe“, nicht „An Seite anpassen“) und die
				Fadenkreuze mit den Linealen nachmessen.
			</Dialog.Description>
		</Dialog.Header>
		<div class="flex flex-col gap-4">
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
					onvalue={(value) => setOffset("x", value)}
				/>
				<NumberField
					id="offset-y"
					label="Versatz Y (mm)"
					value={offset.y}
					step={OFFSET_STEP_MM}
					onvalue={(value) => setOffset("y", value)}
				/>
			</div>
			<p class="text-sm text-muted-foreground">
				Gemessene Abweichung eintragen: druckt der Drucker 1,5 mm zu weit rechts, X = -1,5. Wird sofort gespeichert
				und gilt für alle Urkunden, nicht für die Vorschau.
			</p>
		</div>
	</Dialog.Content>
</Dialog.Root>
