<script lang="ts">
	import DownloadIcon from "@lucide/svelte/icons/download";
	import PrinterIcon from "@lucide/svelte/icons/printer";
	import UploadIcon from "@lucide/svelte/icons/upload";
	import { toast } from "svelte-sonner";
	import type { LayoutVariant } from "$lib/certificates/layout";
	import { layoutStore } from "$lib/certificates/layoutStore.svelte";
	import LayoutImportDialog from "$lib/components/layoutEditor/LayoutImportDialog.svelte";
	import PrintCalibration from "$lib/components/layoutEditor/PrintCalibration.svelte";
	import type { AutosaveStatus as Status } from "$lib/autosave.svelte";
	import AutosaveStatus from "$lib/components/AutosaveStatus.svelte";
	import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
	import { Button } from "$lib/components/ui/button";
	import * as ToggleGroup from "$lib/components/ui/toggle-group";
	import { exportLayout } from "$lib/workflows/layoutEditor";

	interface Props {
		variant: LayoutVariant;
		autosaveStatus: Status;
		/** Tastenkürzel für Rückgängig, z. B. „Strg+Z“ */
		undoShortcut: string;
		onreset: () => void;
	}

	let { variant = $bindable(), autosaveStatus, undoShortcut, onreset }: Props = $props();

	const VARIANT_LABELS: Record<LayoutVariant, string> = { team: "Mannschaft", individual: "Einzel" };

	let importOpen = $state(false);
	let calibrationOpen = $state(false);

	async function exportFile() {
		const outcome = await exportLayout(layoutStore);
		if (outcome.status === "saved") toast.success("Layout exportiert");
		else if (outcome.status === "failed") toast.error(outcome.message);
	}
</script>

<div class="flex flex-wrap items-center gap-2">
	<ToggleGroup.Root
		type="single"
		variant="outline"
		aria-label="Layout für"
		value={variant}
		onValueChange={(value) => value && (variant = value as LayoutVariant)}
	>
		{#each Object.entries(VARIANT_LABELS) as [value, label] (value)}
			<ToggleGroup.Item {value} class="px-3">{label}</ToggleGroup.Item>
		{/each}
	</ToggleGroup.Root>

	<AutosaveStatus status={autosaveStatus} idleText="Änderungen werden automatisch gespeichert." />

	<div class="ms-auto flex flex-wrap gap-2">
		<Button variant="outline" onclick={() => (calibrationOpen = true)}>
			<PrinterIcon data-icon="inline-start" />
			Drucker ausrichten
		</Button>
		<ConfirmDialog
			triggerLabel="Auf Standard zurücksetzen"
			title="Layout „{VARIANT_LABELS[variant]}“ zurücksetzen?"
			confirmLabel="Zurücksetzen"
			onconfirm={onreset}
		>
			Alle Elemente bekommen wieder Position, Text und Schrift der Word-Vorlage. Das andere Layout bleibt unverändert.
			Die Änderung wird sofort gespeichert und lässt sich mit {undoShortcut} rückgängig machen.
		</ConfirmDialog>
		<Button variant="outline" onclick={exportFile}>
			<DownloadIcon data-icon="inline-start" />
			Layout exportieren
		</Button>
		<Button variant="outline" onclick={() => (importOpen = true)}>
			<UploadIcon data-icon="inline-start" />
			Layout importieren
		</Button>
	</div>
</div>

<LayoutImportDialog bind:open={importOpen} />
<PrintCalibration bind:open={calibrationOpen} />
