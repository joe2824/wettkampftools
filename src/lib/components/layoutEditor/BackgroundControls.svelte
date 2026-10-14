<script lang="ts">
	import Trash2Icon from "@lucide/svelte/icons/trash-2";
	import { toast } from "svelte-sonner";
	import { layoutStore } from "$lib/certificates/layoutStore.svelte";
	import Dropzone from "$lib/components/Dropzone.svelte";
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
		<h3 class="font-semibold">Hintergrund-Scan</h3>
		<p class="text-sm text-muted-foreground">
			Scan der vorbedruckten Urkunde zum Ausrichten. Er wird nie gedruckt und nie exportiert.
		</p>
	</div>
	{#if hasBackground}
		<div class="flex items-center justify-between gap-3">
			<Label for="background-visible">Hintergrund zeigen</Label>
			<Switch id="background-visible" bind:checked={visible} />
		</div>
		<div class="flex flex-col gap-2">
			<Label id="background-opacity">Deckkraft: {opacityPercent} %</Label>
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
		<Button variant="ghost" class="self-start" onclick={remove}>
			<Trash2Icon data-icon="inline-start" />
			Hintergrund-Scan entfernen
		</Button>
	{:else}
		<Dropzone
			kinds={["image"]}
			compact
			title="Hintergrund-Scan laden"
			hint="PNG oder JPEG, am besten als ganze A4-Seite gescannt."
			onfile={handleFile}
		/>
	{/if}
</div>
