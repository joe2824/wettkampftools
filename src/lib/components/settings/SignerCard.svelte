<script lang="ts">
	import Trash2Icon from "@lucide/svelte/icons/trash-2";
	import { toast } from "svelte-sonner";
	import Dropzone from "$lib/components/Dropzone.svelte";
	import type { CheckedFile } from "$lib/components/fileCheck";
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { layoutStore } from "$lib/certificates/layoutStore.svelte";
	import { settingsStore } from "$lib/settings/settingsStore.svelte";
	import { storeSignature } from "$lib/workflows/settings";

	let { index }: { index: 0 | 1 } = $props();

	const slot = $derived(index === 0 ? "signature1" : "signature2");
	const signer = $derived(settingsStore.settings.event.signers[index]);
	const number = $derived(index + 1);
	let previewUrl = $state<string | null>(null);

	$effect(() => {
		const bytes = layoutStore.images[slot];
		if (!bytes) {
			previewUrl = null;
			return;
		}
		const url = URL.createObjectURL(new Blob([bytes as BlobPart]));
		previewUrl = url;
		return () => URL.revokeObjectURL(url);
	});

	async function handleFile(file: CheckedFile) {
		const error = await storeSignature(layoutStore, slot, file.bytes);
		if (error) toast.error(error);
		else toast.success("Unterschrift gespeichert");
	}

	async function remove() {
		try {
			await layoutStore.removeImage(slot);
			toast.success("Unterschrift entfernt");
		} catch {
			toast.error("Die Unterschrift konnte nicht entfernt werden.");
		}
	}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Unterzeichner {number}</Card.Title>
	</Card.Header>
	<Card.Content class="flex flex-col gap-4">
		<div class="flex flex-col gap-2">
			<Label for="signer-{index}-name">Name</Label>
			<Input id="signer-{index}-name" bind:value={signer.name} placeholder="z. B. Anna Meier" />
		</div>
		<div class="flex flex-col gap-2">
			<Label for="signer-{index}-role">Funktion</Label>
			<Input id="signer-{index}-role" bind:value={signer.role} />
		</div>
		<div class="flex flex-col gap-2">
			<span class="text-sm font-medium">Unterschrift</span>
			{#if previewUrl}
				<div class="flex items-center gap-3 rounded-lg border border-border bg-white p-3">
					<img src={previewUrl} alt="Unterschrift von Unterzeichner {number}" class="h-16 max-w-full object-contain" />
				</div>
				<Button variant="outline" size="sm" class="self-start" onclick={remove}>
					<Trash2Icon data-icon="inline-start" />
					Entfernen
				</Button>
			{/if}
			<Dropzone
				kinds={["image"]}
				compact
				title={previewUrl ? "Unterschrift ersetzen" : "Unterschrift hinzufügen"}
				hint="PNG oder JPEG, am besten mit hellem Hintergrund. Wird sofort gespeichert."
				onfile={handleFile}
			/>
		</div>
	</Card.Content>
</Card.Root>
