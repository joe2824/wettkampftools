<script lang="ts">
	import DownloadIcon from "@lucide/svelte/icons/download";
	import RotateCcwIcon from "@lucide/svelte/icons/rotate-ccw";
	import SaveIcon from "@lucide/svelte/icons/save";
	import UploadIcon from "@lucide/svelte/icons/upload";
	import { toast } from "svelte-sonner";
	import * as AlertDialog from "$lib/components/ui/alert-dialog";
	import { Badge } from "$lib/components/ui/badge";
	import { Button, buttonVariants } from "$lib/components/ui/button";
	import { settingsStore } from "$lib/settings/settingsStore.svelte";
	import { exportSettings, saveSettings } from "$lib/workflows/settings";
	import ImportDialog from "./ImportDialog.svelte";

	let saving = $state(false);
	let importOpen = $state(false);

	async function save() {
		saving = true;
		try {
			await saveSettings(settingsStore);
			toast.success("Einstellungen gespeichert");
		} catch {
			toast.error("Die Einstellungen konnten nicht gespeichert werden. Bitte erneut versuchen.");
		} finally {
			saving = false;
		}
	}

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
	<Button onclick={save} disabled={!settingsStore.dirty || saving}>
		<SaveIcon data-icon="inline-start" />
		{saving ? "Wird gespeichert …" : "Speichern"}
	</Button>
	{#if settingsStore.dirty}
		<Badge variant="secondary" role="status">Nicht gespeichert</Badge>
	{/if}
	<div class="ms-auto flex flex-wrap gap-2">
		<AlertDialog.Root>
			<AlertDialog.Trigger class={buttonVariants({ variant: "ghost" })}>
				<RotateCcwIcon data-icon="inline-start" />
				Auf Standard zurücksetzen
			</AlertDialog.Trigger>
			<AlertDialog.Content>
				<AlertDialog.Header>
					<AlertDialog.Title>Alle Einstellungen zurücksetzen?</AlertDialog.Title>
					<AlertDialog.Description>
						Altersklassen, Veranstaltung und Urkunden-Einstellungen bekommen wieder die Standardwerte.
						Unterschriften bleiben erhalten. Übernommen wird erst beim Speichern.
					</AlertDialog.Description>
				</AlertDialog.Header>
				<AlertDialog.Footer>
					<AlertDialog.Cancel>Abbrechen</AlertDialog.Cancel>
					<AlertDialog.Action onclick={reset}>Zurücksetzen</AlertDialog.Action>
				</AlertDialog.Footer>
			</AlertDialog.Content>
		</AlertDialog.Root>
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
