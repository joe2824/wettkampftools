<script lang="ts">
	import { toast } from "svelte-sonner";
	import type { CheckedFile } from "$lib/components/fileCheck";
	import JsonImportDialog from "$lib/components/JsonImportDialog.svelte";
	import MessageListAlert from "$lib/components/MessageListAlert.svelte";
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
</script>

<JsonImportDialog
	bind:open
	title="Einstellungen importieren"
	description="Eine zuvor exportierte Einstellungsdatei laden. Unterschriften sind darin nicht enthalten."
	fileTitle="Einstellungsdatei"
	onfile={handleFile}
	onclose={() => (outcome = null)}
>
	{#if outcome && outcome.messages.length > 0}
		<MessageListAlert
			variant={outcome.applied ? "default" : "destructive"}
			title={outcome.applied ? "Mit Hinweisen übernommen" : "Nicht übernommen"}
			messages={outcome.messages}
		/>
	{/if}
</JsonImportDialog>
