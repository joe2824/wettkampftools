<script lang="ts">
	import SaveIcon from "@lucide/svelte/icons/save";
	import { competitionStore } from "$lib/workflows/competitionStore.svelte";
	import { formatGermanDateTime } from "$lib/format/date";

	const savedAt = $derived(competitionStore.savedAt);
</script>

<section aria-label="Wettkampfstand" class="flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
	<SaveIcon class="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
	<div class="flex min-w-0 flex-1 flex-col gap-1 text-sm text-muted-foreground">
		<p>
			{#if savedAt}
				Gespeicherter Stand vom {formatGermanDateTime(savedAt)}
			{:else}
				Noch kein Wettkampf geladen. Geladene Dateien bleiben bis zum nächsten Wettkampf gespeichert.
			{/if}
		</p>
		<p>Projekt speichern oder öffnen und Neuer Wettkampf: Menü „Datei“ oben links.</p>
	</div>
</section>
