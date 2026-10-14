<script lang="ts">
	import CalendarXIcon from "@lucide/svelte/icons/calendar-x";
	import FileSpreadsheetIcon from "@lucide/svelte/icons/file-spreadsheet";
	import { toast } from "svelte-sonner";
	import * as Alert from "$lib/components/ui/alert";
	import { Badge } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import Dropzone from "$lib/components/Dropzone.svelte";
	import type { CheckedFile } from "$lib/components/fileCheck";
	import type { SessionResults } from "$lib/session.svelte";
	import { loadResultsFile } from "$lib/workflows/results";

	interface Props {
		results: SessionResults | null;
	}

	let { results }: Props = $props();

	let replacing = $state(false);
	let yearWarning = $state<number | null>(null);
	let loadError = $state<string | null>(null);

	const KIND_LABELS = { team: "Mannschaftswettkampf", individual: "Einzelwettkampf" } as const;

	async function handleFile(file: CheckedFile) {
		const outcome = await loadResultsFile(file);
		if (!outcome.ok) {
			loadError = outcome.message;
			return;
		}
		loadError = null;
		replacing = false;
		yearWarning = outcome.summary.yearWarning;
		toast.success("Ergebnisdatei geladen", { description: `${outcome.summary.rowCount} Einträge gelesen.` });
	}
</script>

<div class="flex flex-col gap-3">
	{#if results && !replacing}
		<div class="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 p-3">
			<FileSpreadsheetIcon class="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
			<div class="flex min-w-0 flex-1 flex-col">
				<span class="truncate font-medium" title={results.fileName}>Ergebnisdatei: {results.fileName}</span>
				<span class="text-sm text-muted-foreground">{results.rows.length} Einträge</span>
			</div>
			<Badge variant="secondary">{KIND_LABELS[results.kind]}</Badge>
			<Button variant="outline" size="sm" onclick={() => (replacing = true)}>Andere Datei laden</Button>
		</div>
	{:else}
		<Dropzone
			kinds={["excel"]}
			title="Ergebnisdatei aus JAuswertung"
			hint="Excel-Export aus JAuswertung (mit Blatt „Daten“) hierher ziehen oder auswählen."
			compact={results !== null}
			onfile={handleFile}
		/>
		{#if results}
			<Button variant="ghost" size="sm" class="self-start" onclick={() => (replacing = false)}>
				Bei {results.fileName} bleiben
			</Button>
		{/if}
	{/if}

	{#if loadError}
		<Alert.Root variant="destructive">
			<Alert.Title>Ergebnisdatei nicht übernommen</Alert.Title>
			<Alert.Description>{loadError}</Alert.Description>
		</Alert.Root>
	{/if}

	{#if yearWarning !== null && results && !replacing}
		<Alert.Root>
			<CalendarXIcon />
			<Alert.Title>Die Datei stammt aus {yearWarning} – richtige Datei?</Alert.Title>
			<Alert.Description>Die Ergebnisdatei ist nicht aus diesem Jahr. Bitte kurz prüfen.</Alert.Description>
		</Alert.Root>
	{/if}
</div>
