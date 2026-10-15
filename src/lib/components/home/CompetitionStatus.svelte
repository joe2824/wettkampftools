<script lang="ts">
	import SaveIcon from "@lucide/svelte/icons/save";
	import { toast } from "svelte-sonner";
	import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
	import { competitionStore } from "$lib/workflows/competitionStore.svelte";
	import { formatGermanDateTime } from "$lib/format/date";
	import { session } from "$lib/session.svelte";
	import { nextCompetitionHint } from "$lib/settings/eventInfo";
	import { settingsStore } from "$lib/settings/settingsStore.svelte";

	const hasData = $derived(session.hasRegistration || session.hasResults);
	const savedAt = $derived(competitionStore.savedAt);
	const eventHint = $derived(nextCompetitionHint(settingsStore.settings.event));

	async function startNew() {
		await competitionStore.newCompetition();
		toast.success("Bereit für einen neuen Wettkampf", {
			description: "Tipp: Vorher die Rec-Werte fürs neue Jahr aktualisieren."
		});
	}
</script>

<section aria-label="Wettkampfstand" class="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 p-3">
	<SaveIcon class="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
	<p class="min-w-0 flex-1 text-sm text-muted-foreground">
		{#if savedAt}
			Gespeicherter Stand vom {formatGermanDateTime(savedAt)}
		{:else}
			Noch kein Wettkampf geladen. Geladene Dateien bleiben bis zum nächsten Wettkampf gespeichert.
		{/if}
	</p>
	<ConfirmDialog
		triggerLabel="Neuer Wettkampf"
		triggerVariant="outline"
		triggerSize="sm"
		disabled={!hasData}
		title="Neuen Wettkampf beginnen?"
		confirmLabel="Neuen Wettkampf beginnen"
		onconfirm={startNew}
	>
		Alle geladenen Meldungen und Ergebnisse werden entfernt. {eventHint} Titel, Ausrichter, Ort, Unterzeichner,
		Einstellungen und Layout bleiben erhalten.
	</ConfirmDialog>
</section>
