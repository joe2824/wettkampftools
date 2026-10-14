<script lang="ts">
	import PenLineIcon from "@lucide/svelte/icons/pen-line";
	import PrinterIcon from "@lucide/svelte/icons/printer";
	import * as Alert from "$lib/components/ui/alert";

	interface Props {
		signaturesMissing: boolean;
	}

	let { signaturesMissing }: Props = $props();
</script>

<Alert.Root>
	<PrinterIcon />
	<Alert.Title>So wird gedruckt</Alert.Title>
	<Alert.Description>
		<p>
			Im PDF-Programm mit ‚Tatsächliche Größe‘ drucken. Der Stapel beginnt mit dem letzten Platz – so kann von
			hinten nach vorne vorgelesen werden.
		</p>
		<p>
			Sitzt der Druck nicht genau auf dem Vordruck: im
			<a href="/certificates/layout" class="font-medium text-foreground underline underline-offset-4">Urkunden-Layout</a>
			eine Kalibrierungsseite drucken und den Versatz eintragen.
		</p>
	</Alert.Description>
</Alert.Root>

{#if signaturesMissing}
	<Alert.Root>
		<PenLineIcon />
		<Alert.Title>Unterschriften fehlen</Alert.Title>
		<Alert.Description>
			<p>
				Nicht alle Unterschriften sind hinterlegt; fehlende bleiben auf den Urkunden frei. Bilder der Unterschriften
				lassen sich in den
				<a href="/settings" class="font-medium text-foreground underline underline-offset-4">Einstellungen</a>
				hinterlegen.
			</p>
		</Alert.Description>
	</Alert.Root>
{/if}
