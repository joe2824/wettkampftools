<script lang="ts">
	import DownloadIcon from "@lucide/svelte/icons/download";
	import UploadIcon from "@lucide/svelte/icons/upload";
	import { toast } from "svelte-sonner";
	import ActionBar from "$lib/components/ActionBar.svelte";
	import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
	import SaveButton from "$lib/components/SaveButton.svelte";
	import { Button } from "$lib/components/ui/button";
	import { settingsStore } from "$lib/settings/settingsStore.svelte";
	import { exportSettings, saveSettings } from "$lib/workflows/settings";
	import ImportDialog from "./ImportDialog.svelte";

	let importOpen = $state(false);

	async function exportFile() {
		try {
			const path = await exportSettings(settingsStore);
			if (path) toast.success("Einstellungen exportiert");
		} catch {
			toast.error("Die Datei konnte nicht gespeichert werden.");
		}
	}

	function reset() {
		settingsStore.resetToDefaults();
		toast.info("Standardwerte eingesetzt", { description: "Zum Übernehmen bitte speichern." });
	}
</script>

<ActionBar label="Einstellungen speichern">
	{#snippet start()}
		<SaveButton
			dirty={settingsStore.dirty}
			onsave={() => saveSettings(settingsStore)}
			successMessage="Einstellungen gespeichert"
			errorMessage="Die Einstellungen konnten nicht gespeichert werden. Bitte erneut versuchen."
		/>
	{/snippet}
	{#snippet end()}
		<ConfirmDialog
			triggerLabel="Auf Standard zurücksetzen"
			title="Einstellungen zurücksetzen?"
			confirmLabel="Zurücksetzen"
			onconfirm={reset}
		>
			Altersklassen, Wellen- und Urkunden-Einstellungen bekommen wieder die Standardwerte. Veranstaltung,
			Unterschriften, eigene Mannschaftsnamen und Regelwerk bleiben erhalten. Übernommen wird erst beim Speichern.
		</ConfirmDialog>
		<Button variant="outline" onclick={exportFile}>
			<DownloadIcon data-icon="inline-start" />
			Exportieren
		</Button>
		<Button variant="outline" onclick={() => (importOpen = true)}>
			<UploadIcon data-icon="inline-start" />
			Importieren
		</Button>
	{/snippet}
</ActionBar>

<ImportDialog bind:open={importOpen} />
