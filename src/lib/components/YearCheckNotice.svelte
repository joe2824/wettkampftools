<script lang="ts">
	import CalendarCheckIcon from "@lucide/svelte/icons/calendar-check";
	import CalendarXIcon from "@lucide/svelte/icons/calendar-x";
	import CircleHelpIcon from "@lucide/svelte/icons/circle-help";
	import * as Alert from "$lib/components/ui/alert";
	import { Button } from "$lib/components/ui/button";
	import type { SessionResults } from "$lib/session.svelte";
	import { confirmResultsYear, needsYearConfirmation } from "$lib/workflows/results";

	interface Props {
		results: SessionResults;
		onreplace: () => void;
	}

	let { results, onreplace }: Props = $props();

	const pending = $derived(needsYearConfirmation(results));
</script>

{#if pending}
	<Alert.Root variant="destructive" class="border-2 border-destructive">
		<CalendarXIcon />
		<Alert.Title class="text-base">
			Diese Datei stammt aus {results.yearWarning}. Ist das wirklich die Ergebnisdatei des aktuellen Wettkampfs?
		</Alert.Title>
		<Alert.Description>
			<p>Auswertung und Druck sind gesperrt, bis die Datei bestätigt ist.</p>
			<div class="mt-2 flex flex-wrap gap-2">
				<Button variant="destructive" size="sm" onclick={confirmResultsYear}>Ja, Datei ist richtig</Button>
				<Button variant="outline" size="sm" onclick={onreplace}>Andere Datei laden</Button>
			</div>
		</Alert.Description>
	</Alert.Root>
{:else if results.yearWarning !== null}
	<p class="flex items-center gap-2 text-sm text-muted-foreground" role="status">
		<CalendarCheckIcon class="size-4 shrink-0" aria-hidden="true" />
		Datei aus {results.yearWarning} – als richtig bestätigt.
	</p>
{/if}

{#if results.creationUnknown}
	<p class="flex items-center gap-2 text-sm text-muted-foreground" role="status">
		<CircleHelpIcon class="size-4 shrink-0" aria-hidden="true" />
		Erstellungsdatum der Datei unbekannt – bitte prüfen, ob es die aktuelle Datei ist.
	</p>
{/if}
