<script lang="ts">
	import FileDownIcon from "@lucide/svelte/icons/file-down";
	import ImageDownIcon from "@lucide/svelte/icons/image-down";
	import LoaderCircleIcon from "@lucide/svelte/icons/loader-circle";
	import { toast } from "svelte-sonner";
	import SaveResult from "$lib/components/SaveResult.svelte";
	import { Button } from "$lib/components/ui/button";
	import type { DistanceRow } from "$lib/distance/matching";
	import { saveMapPdf, saveMapPng, type MapSaveOutcome } from "$lib/workflows/distanceMap";

	interface Props {
		rows: DistanceRow[];
	}

	let { rows }: Props = $props();

	let busy = $state<"pdf" | "png" | null>(null);
	let savedPath = $state<string | null>(null);

	async function save(format: "pdf" | "png") {
		busy = format;
		try {
			const outcome: MapSaveOutcome = format === "pdf" ? await saveMapPdf(rows) : await saveMapPng(rows);
			if (outcome.status === "failed") toast.error(outcome.message);
			if (outcome.status !== "saved") return;
			savedPath = outcome.path;
			toast.success(format === "pdf" ? "Karte als PDF gespeichert" : "Karte als Bild gespeichert");
		} finally {
			busy = null;
		}
	}
</script>

<div class="flex flex-col gap-3">
	<div class="flex flex-wrap gap-2">
		<Button variant="outline" size="sm" disabled={busy !== null || rows.length === 0} onclick={() => save("png")}>
			{#if busy === "png"}
				<LoaderCircleIcon class="animate-spin" data-icon="inline-start" />
			{:else}
				<ImageDownIcon data-icon="inline-start" />
			{/if}
			Karte als Bild (PNG)
		</Button>
		<Button variant="outline" size="sm" disabled={busy !== null || rows.length === 0} onclick={() => save("pdf")}>
			{#if busy === "pdf"}
				<LoaderCircleIcon class="animate-spin" data-icon="inline-start" />
			{:else}
				<FileDownIcon data-icon="inline-start" />
			{/if}
			Karte als PDF
		</Button>
	</div>
	<SaveResult path={savedPath} label="Karte gespeichert" />
</div>
