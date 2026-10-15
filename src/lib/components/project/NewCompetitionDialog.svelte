<script lang="ts">
	import { toast } from "svelte-sonner";
	import * as AlertDialog from "$lib/components/ui/alert-dialog";
	import { nextCompetitionHint } from "$lib/settings/eventInfo";
	import { settingsStore } from "$lib/settings/settingsStore.svelte";
	import { competitionStore } from "$lib/workflows/competitionStore.svelte";

	let { open = $bindable(false) }: { open?: boolean } = $props();

	const eventHint = $derived(nextCompetitionHint(settingsStore.settings.event));

	async function startNew() {
		await competitionStore.newCompetition();
		toast.success("Bereit für einen neuen Wettkampf", {
			description: "Tipp: Vorher die Rec-Werte fürs neue Jahr aktualisieren."
		});
	}
</script>

<AlertDialog.Root bind:open>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Neuen Wettkampf beginnen?</AlertDialog.Title>
			<AlertDialog.Description>
				Alle geladenen Meldungen und Ergebnisse werden entfernt. {eventHint} Titel, Ausrichter, Ort, Unterzeichner, Einstellungen
				und Layout bleiben erhalten.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Abbrechen</AlertDialog.Cancel>
			<AlertDialog.Action onclick={startNew}>Neuen Wettkampf beginnen</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
