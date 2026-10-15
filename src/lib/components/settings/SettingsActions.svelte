<script lang="ts">
	import DownloadIcon from "@lucide/svelte/icons/download";
	import UploadIcon from "@lucide/svelte/icons/upload";
	import { toast } from "svelte-sonner";
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

<div
	class="sticky bottom-0 z-10 -mx-6 mt-8 flex flex-wrap items-center gap-2 border-t border-border bg-background/95 px-6 py-3 backdrop-blur"
>
	<SaveButton
		dirty={settingsStore.dirty}
		onsave={() => saveSettings(settingsStore)}
		successMessage="Einstellungen gespeichert"
		errorMessage="Die Einstellungen konnten nicht gespeichert werden. Bitte erneut versuchen."
	/>
	<div class="ms-auto flex flex-wrap gap-2">
		<ConfirmDialog
			triggerLabel="Auf Standard zurücksetzen"
			title="Alle Einstellungen zurücksetzen?"
			confirmLabel="Zurücksetzen"
			onconfirm={reset}
		>
			Altersklassen, Veranstaltung und Urkunden-Einstellungen bekommen wieder die Standardwerte. Unterschriften bleiben
			erhalten. Übernommen wird erst beim Speichern.
		</ConfirmDialog>
		<Button variant="outline" onclick={exportFile}>
			<DownloadIcon data-icon="inline-start" />
			Exportieren
		</Button>
		<Button variant="outline" onclick={() => (importOpen = true)}>
			<UploadIcon data-icon="inline-start" />
			Importieren
		</Button>
	</div>
</div>

<ImportDialog bind:open={importOpen} />
