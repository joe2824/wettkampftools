<script lang="ts">
	import { toast } from "svelte-sonner";
	import { layoutStore } from "$lib/certificates/layoutStore.svelte";
	import Dropzone from "$lib/components/Dropzone.svelte";
	import type { CheckedFile } from "$lib/components/fileCheck";
	import * as Alert from "$lib/components/ui/alert";
	import { Button } from "$lib/components/ui/button";
	import * as Dialog from "$lib/components/ui/dialog";
	import { importLayout } from "$lib/workflows/layoutEditor";

	let { open = $bindable(false) }: { open: boolean } = $props();
	let issues = $state<string[]>([]);

	function handleFile(file: CheckedFile) {
		issues = importLayout(layoutStore, file.bytes);
		if (issues.length > 0) return;
		toast.success("Layout übernommen", { description: "Zum Behalten bitte speichern." });
		open = false;
	}

	function handleOpenChange(value: boolean) {
		open = value;
		if (!value) issues = [];
	}
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Layout importieren</Dialog.Title>
			<Dialog.Description>
				Eine zuvor exportierte Layout-Datei laden. Sie enthält nur Positionen, Texte und Schriften – keine
				Unterschriften und keinen Hintergrund-Scan.
			</Dialog.Description>
		</Dialog.Header>
		<Dropzone kinds={["json"]} compact title="Layout-Datei" onfile={handleFile} />
		{#if issues.length > 0}
			<Alert.Root>
				<Alert.Title>Hinweise zum Import</Alert.Title>
				<Alert.Description>
					<ul class="list-disc ps-4">
						{#each issues as issue (issue)}
							<li>{issue}</li>
						{/each}
					</ul>
				</Alert.Description>
			</Alert.Root>
		{/if}
		<Dialog.Footer>
			<Button variant="outline" onclick={() => handleOpenChange(false)}>Schließen</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
