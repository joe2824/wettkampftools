<script lang="ts">
	import RotateCcwIcon from "@lucide/svelte/icons/rotate-ccw";
	import SaveIcon from "@lucide/svelte/icons/save";
	import { toast } from "svelte-sonner";
	import * as AlertDialog from "$lib/components/ui/alert-dialog";
	import { buttonVariants } from "$lib/components/ui/button";
	import { competitionStore } from "$lib/competition/competitionStore.svelte";
	import { formatGermanDateTime } from "$lib/format/date";
	import { session } from "$lib/session.svelte";
	import { nextCompetitionHint } from "$lib/settings/eventInfo";
	import { settingsStore } from "$lib/settings/settingsStore.svelte";

	const hasData = $derived(session.hasRegistration || session.hasResults);
	const savedAt = $derived(competitionStore.savedAt);
	const eventHint = $derived(nextCompetitionHint(settingsStore.settings.event));

	async function startNew() {
		await competitionStore.newCompetition();
		toast.success("Bereit für einen neuen Wettkampf");
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
	<AlertDialog.Root>
		<AlertDialog.Trigger class={buttonVariants({ variant: "outline", size: "sm" })} disabled={!hasData}>
			<RotateCcwIcon data-icon="inline-start" />
			Neuer Wettkampf
		</AlertDialog.Trigger>
		<AlertDialog.Content>
			<AlertDialog.Header>
				<AlertDialog.Title>Neuen Wettkampf beginnen?</AlertDialog.Title>
				<AlertDialog.Description>
					Alle geladenen Meldungen und Ergebnisse werden entfernt. {eventHint} Titel, Ausrichter, Ort,
					Unterzeichner, Einstellungen und Layout bleiben erhalten.
				</AlertDialog.Description>
			</AlertDialog.Header>
			<AlertDialog.Footer>
				<AlertDialog.Cancel>Abbrechen</AlertDialog.Cancel>
				<AlertDialog.Action onclick={startNew}>Neuen Wettkampf beginnen</AlertDialog.Action>
			</AlertDialog.Footer>
		</AlertDialog.Content>
	</AlertDialog.Root>
</section>
