<script lang="ts">
	import { toast } from "svelte-sonner";
	import Dropzone from "$lib/components/Dropzone.svelte";
	import type { CheckedFile } from "$lib/components/fileCheck";
	import * as Alert from "$lib/components/ui/alert";
	import { Button } from "$lib/components/ui/button";
	import * as Dialog from "$lib/components/ui/dialog";
	import { settingsStore } from "$lib/settings/settingsStore.svelte";
	import { importSettings, type ImportOutcome } from "$lib/workflows/settings";

	let { open = $bindable(false) }: { open: boolean } = $props();
	let outcome = $state<ImportOutcome | null>(null);

	function handleFile(file: CheckedFile) {
		outcome = importSettings(settingsStore, file.bytes);
		if (!outcome.applied) return;
		toast.success("Einstellungen übernommen", { description: "Zum Behalten bitte speichern." });
		if (outcome.messages.length === 0) open = false;
	}

	function handleOpenChange(value: boolean) {
		open = value;
		if (!value) outcome = null;
	}
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Einstellungen importieren</Dialog.Title>
			<Dialog.Description>
				Eine zuvor exportierte Einstellungsdatei laden. Unterschriften sind darin nicht enthalten.
			</Dialog.Description>
		</Dialog.Header>
		<Dropzone kinds={["json"]} compact title="Einstellungsdatei" onfile={handleFile} />
		{#if outcome && outcome.messages.length > 0}
			<Alert.Root variant={outcome.applied ? "default" : "destructive"}>
				<Alert.Title>{outcome.applied ? "Mit Hinweisen übernommen" : "Nicht übernommen"}</Alert.Title>
				<Alert.Description>
					<ul class="list-disc ps-4">
						{#each outcome.messages as message (message)}
							<li>{message}</li>
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
