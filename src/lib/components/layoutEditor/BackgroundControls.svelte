<script lang="ts">
	import Trash2Icon from "@lucide/svelte/icons/trash-2";
	import { toast } from "svelte-sonner";
	import { layoutStore } from "$lib/certificates/layoutStore.svelte";
	import FilePickButton from "$lib/components/FilePickButton.svelte";
	import type { CheckedFile } from "$lib/components/fileCheck";
	import { Button } from "$lib/components/ui/button";
	import { Label } from "$lib/components/ui/label";
	import { Slider } from "$lib/components/ui/slider";
	import { Switch } from "$lib/components/ui/switch";
	import { storeBackground } from "$lib/workflows/layoutEditor";

	interface Props {
		visible: boolean;
		/** Deckkraft in Prozent */
		opacityPercent: number;
	}

	let { visible = $bindable(), opacityPercent = $bindable() }: Props = $props();

	const OPACITY_STEP = 5;
	const hasBackground = $derived(layoutStore.images.background !== null);

	async function handleFile(file: CheckedFile) {
		const error = await storeBackground(layoutStore, file.bytes);
		if (error) {
			toast.error(error);
			return;
		}
		visible = true;
		toast.success("Hintergrund-Scan geladen");
	}

	async function remove() {
		try {
			await layoutStore.removeImage("background");
		} catch {
			toast.error("Der Hintergrund-Scan konnte nicht entfernt werden.");
		}
	}
</script>

<div class="flex flex-col gap-3">
	<div class="flex flex-col gap-0.5">
		<h3 class="text-sm font-semibold">Hintergrund-Scan</h3>
		<p class="text-xs text-muted-foreground">Nur zum Ausrichten – wird nie gedruckt.</p>
	</div>
	{#if hasBackground}
		<div class="flex items-center justify-between gap-3">
			<Label for="background-visible" class="text-sm">Anzeigen</Label>
			<Switch id="background-visible" bind:checked={visible} />
		</div>
		<div class="flex flex-col gap-2">
			<Label id="background-opacity" class="text-sm">Deckkraft: {opacityPercent} %</Label>
			<Slider
				type="single"
				bind:value={opacityPercent}
				min={0}
				max={100}
				step={OPACITY_STEP}
				disabled={!visible}
				aria-labelledby="background-opacity"
			/>
		</div>
		<Button variant="ghost" size="sm" class="self-start" onclick={remove}>
			<Trash2Icon data-icon="inline-start" />
			Entfernen
		</Button>
	{:else}
		<FilePickButton kinds={["image"]} onfile={handleFile} onerror={(message) => toast.error(message)}>
			Scan laden …
		</FilePickButton>
	{/if}
</div>
