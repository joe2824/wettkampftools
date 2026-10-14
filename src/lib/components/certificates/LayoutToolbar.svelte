<script lang="ts">
	import DownloadIcon from "@lucide/svelte/icons/download";
	import PrinterIcon from "@lucide/svelte/icons/printer";
	import RotateCcwIcon from "@lucide/svelte/icons/rotate-ccw";
	import SaveIcon from "@lucide/svelte/icons/save";
	import UploadIcon from "@lucide/svelte/icons/upload";
	import { toast } from "svelte-sonner";
	import type { LayoutVariant } from "$lib/certificates/layout";
	import { layoutStore } from "$lib/certificates/layoutStore.svelte";
	import LayoutImportDialog from "$lib/components/layoutEditor/LayoutImportDialog.svelte";
	import PrintCalibration from "$lib/components/layoutEditor/PrintCalibration.svelte";
	import * as AlertDialog from "$lib/components/ui/alert-dialog";
	import { Badge } from "$lib/components/ui/badge";
	import { Button, buttonVariants } from "$lib/components/ui/button";
	import * as ToggleGroup from "$lib/components/ui/toggle-group";
	import { exportLayout } from "$lib/workflows/layoutEditor";

	interface Props {
		variant: LayoutVariant;
		dirty: boolean;
		onsave: () => Promise<void>;
		onreset: () => void;
	}

	let { variant = $bindable(), dirty, onsave, onreset }: Props = $props();

	const VARIANT_LABELS: Record<LayoutVariant, string> = { team: "Mannschaft", individual: "Einzel" };

	let saving = $state(false);
	let importOpen = $state(false);
	let calibrationOpen = $state(false);

	async function save() {
		saving = true;
		try {
			await onsave();
			toast.success("Layout gespeichert");
		} catch {
			toast.error("Das Layout konnte nicht gespeichert werden. Bitte erneut versuchen.");
		} finally {
			saving = false;
		}
	}

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

	<Button onclick={save} disabled={!dirty || saving}>
		<SaveIcon data-icon="inline-start" />
		{saving ? "Wird gespeichert …" : "Speichern"}
	</Button>
	{#if dirty}
		<Badge variant="secondary" role="status">Nicht gespeichert</Badge>
	{/if}

	<div class="ms-auto flex flex-wrap gap-2">
		<Button variant="outline" onclick={() => (calibrationOpen = true)}>
			<PrinterIcon data-icon="inline-start" />
			Drucker ausrichten
		</Button>
		<AlertDialog.Root>
			<AlertDialog.Trigger class={buttonVariants({ variant: "ghost" })}>
				<RotateCcwIcon data-icon="inline-start" />
				Auf Standard zurücksetzen
			</AlertDialog.Trigger>
			<AlertDialog.Content>
				<AlertDialog.Header>
					<AlertDialog.Title>Layout „{VARIANT_LABELS[variant]}“ zurücksetzen?</AlertDialog.Title>
					<AlertDialog.Description>
						Alle Elemente bekommen wieder Position, Text und Schrift der Word-Vorlage. Das andere Layout bleibt
						unverändert. Übernommen wird erst beim Speichern.
					</AlertDialog.Description>
				</AlertDialog.Header>
				<AlertDialog.Footer>
					<AlertDialog.Cancel>Abbrechen</AlertDialog.Cancel>
					<AlertDialog.Action onclick={onreset}>Zurücksetzen</AlertDialog.Action>
				</AlertDialog.Footer>
			</AlertDialog.Content>
		</AlertDialog.Root>
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
