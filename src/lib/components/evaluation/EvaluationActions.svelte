<script lang="ts">
	import FileDownIcon from "@lucide/svelte/icons/file-down";
	import FileSpreadsheetIcon from "@lucide/svelte/icons/file-spreadsheet";
	import LoaderCircleIcon from "@lucide/svelte/icons/loader-circle";
	import { toast } from "svelte-sonner";
	import MissingDateAlert from "$lib/components/MissingDateAlert.svelte";
	import SaveResult from "$lib/components/SaveResult.svelte";
	import { Button } from "$lib/components/ui/button";
	import type { SessionResults } from "$lib/session.svelte";
	import { settingsStore } from "$lib/settings/settingsStore.svelte";
	import { saveEvaluationExcel, saveNoticePdf, type Evaluation } from "$lib/workflows/evaluation";

	interface Props {
		results: SessionResults;
		evaluation: Evaluation;
	}

	let { results, evaluation }: Props = $props();

	let busy = $state<"excel" | "notice" | null>(null);
	let excelPath = $state<string | null>(null);
	let noticePath = $state<string | null>(null);

	async function saveExcel() {
		busy = "excel";
		try {
			const outcome = await saveEvaluationExcel(results, evaluation);
			if (outcome.status === "failed") toast.error(outcome.message);
			if (outcome.status !== "saved") return;
			excelPath = outcome.path;
			toast.success("Auswertung gespeichert");
		} finally {
			busy = null;
		}
	}

	async function saveNotice() {
		busy = "notice";
		try {
			const outcome = await saveNoticePdf(evaluation, $state.snapshot(settingsStore.settings));
			if (outcome.status === "failed") toast.error(outcome.message);
			if (outcome.status !== "saved") return;
			noticePath = outcome.path;
			const description = outcome.opened ? "Das PDF wird geöffnet." : "Das PDF konnte nicht automatisch geöffnet werden.";
			toast.success("Aushang gespeichert", { description });
		} finally {
			busy = null;
		}
	}
</script>

<div class="flex flex-col gap-4">
	<MissingDateAlert message="Auf dem Aushang fehlt das Datum – in der Vorbereitung eintragen." withLink />
	<div class="flex flex-wrap gap-3">
		<Button size="lg" disabled={busy !== null} onclick={saveNotice}>
			{#if busy === "notice"}
				<LoaderCircleIcon class="animate-spin" data-icon="inline-start" />
				Aushang wird erzeugt …
			{:else}
				<FileDownIcon data-icon="inline-start" />
				Aushang als PDF speichern &amp; öffnen
			{/if}
		</Button>
		<Button size="lg" variant="outline" disabled={busy !== null} onclick={saveExcel}>
			{#if busy === "excel"}
				<LoaderCircleIcon class="animate-spin" data-icon="inline-start" />
			{:else}
				<FileSpreadsheetIcon data-icon="inline-start" />
			{/if}
			Auswertung als Excel speichern
		</Button>
	</div>
	<p class="text-sm text-muted-foreground">
		Der Aushang enthält Ranglisten, Aufschlüsselung und Regeln – ohne Namen der Mitglieder.
	</p>
	<SaveResult path={noticePath} label="Aushang gespeichert" />
	<SaveResult path={excelPath} label="Auswertung gespeichert" />
</div>
