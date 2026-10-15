<script lang="ts">
	import { toast } from "svelte-sonner";
	import { layoutStore } from "$lib/certificates/layoutStore.svelte";
	import type { CheckedFile } from "$lib/components/fileCheck";
	import JsonImportDialog from "$lib/components/JsonImportDialog.svelte";
	import MessageListAlert from "$lib/components/MessageListAlert.svelte";
	import { importLayout } from "$lib/workflows/layoutEditor";

	let { open = $bindable(false) }: { open: boolean } = $props();
	let issues = $state<string[]>([]);

	function handleFile(file: CheckedFile) {
		issues = importLayout(layoutStore, file.bytes);
		if (issues.length > 0) return;
		toast.success("Layout übernommen", { description: "Zum Behalten bitte speichern." });
		open = false;
	}
</script>

<JsonImportDialog
	bind:open
	title="Layout importieren"
	description="Eine zuvor exportierte Layout-Datei laden. Sie enthält nur Positionen, Texte und Schriften – keine Unterschriften und keinen Hintergrund-Scan."
	fileTitle="Layout-Datei"
	onfile={handleFile}
	onclose={() => (issues = [])}
>
	{#if issues.length > 0}
		<MessageListAlert title="Hinweise zum Import" messages={issues} />
	{/if}
</JsonImportDialog>
