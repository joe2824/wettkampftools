<script lang="ts">
	import LoaderCircleIcon from "@lucide/svelte/icons/loader-circle";
	import SaveIcon from "@lucide/svelte/icons/save";
	import { toast } from "svelte-sonner";
	import * as AlertDialog from "$lib/components/ui/alert-dialog";
	import { Button } from "$lib/components/ui/button";
	import SaveResult from "$lib/components/SaveResult.svelte";
	import { exportRegistrations, type ExportOutcome, type PreparationCheck } from "$lib/workflows/preparation";
	import CountCallout from "./CountCallout.svelte";

	interface Props {
		check: PreparationCheck;
		onexported: () => void;
	}

	let { check, onexported }: Props = $props();

	let saving = $state(false);
	let confirmOpen = $state(false);
	let result = $state.raw<{ check: PreparationCheck; outcome: Extract<ExportOutcome, { status: "saved" }> } | null>(null);

	// Ergebnis gilt nur, solange sich Meldungen und Auswahl nicht geändert haben.
	const saved = $derived(result?.check === check ? result.outcome : null);
	const excluded = $derived(check.excludedRows);

	function start() {
		if (excluded.length > 0) confirmOpen = true;
		else void run();
	}

	async function run() {
		confirmOpen = false;
		saving = true;
		const target = check;
		try {
			const outcome = await exportRegistrations(target.exportableRows);
			if (outcome.status === "cancelled") return;
			result = { check: target, outcome };
			onexported();
			if (outcome.verification.ok) toast.success("Meldungen gespeichert");
			else toast.error("Die gespeicherte Datei weicht ab", { description: "Bitte die Hinweise unten prüfen." });
		} catch {
			toast.error("Die Meldungen konnten nicht gespeichert werden.");
		} finally {
			saving = false;
		}
	}
</script>

<div class="flex flex-wrap items-center gap-3">
	<Button onclick={start} disabled={saving || check.exportableRows.length === 0}>
		{#if saving}
			<LoaderCircleIcon class="animate-spin" data-icon="inline-start" />
			Wird gespeichert …
		{:else}
			<SaveIcon data-icon="inline-start" />
			Meldungen speichern
		{/if}
	</Button>
	{#if check.exportableRows.length === 0}
		<p class="text-sm text-muted-foreground">Keine fehlerfreie Meldung vorhanden.</p>
	{:else if excluded.length > 0}
		<p class="text-sm text-muted-foreground">
			{excluded.length} fehlerhafte Meldungen werden nicht mitgespeichert.
		</p>
	{/if}
</div>

{#if saved}
	<SaveResult path={saved.path} label="Meldungen gespeichert" />
	<CountCallout expected={saved.expected} verification={saved.verification} />
{/if}

<AlertDialog.Root bind:open={confirmOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>{excluded.length} Meldungen werden NICHT exportiert</AlertDialog.Title>
			<AlertDialog.Description>
				Diese Meldungen enthalten Fehler und würden von JAuswertung verworfen. Alle anderen werden gespeichert.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<ul class="max-h-60 list-disc space-y-1 overflow-y-auto pl-5 text-sm">
			{#each excluded as row (row.id)}
				<li>{row.name || "(ohne Namen)"} · {row.ageGroup} · {row.gender || "(ohne Geschlecht)"}</li>
			{/each}
		</ul>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Abbrechen</AlertDialog.Cancel>
			<AlertDialog.Action onclick={run}>Ohne diese Meldungen speichern</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
