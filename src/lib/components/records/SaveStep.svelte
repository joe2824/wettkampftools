<script lang="ts">
	import SaveIcon from "@lucide/svelte/icons/save";
	import TriangleAlertIcon from "@lucide/svelte/icons/triangle-alert";
	import { toast } from "svelte-sonner";
	import SaveResult from "$lib/components/SaveResult.svelte";
	import * as Alert from "$lib/components/ui/alert";
	import { Button } from "$lib/components/ui/button";
	import type { RecChange } from "$lib/records/proposal";
	import type { LoadedPenalties } from "$lib/workflows/penalties";
	import {
		newPenaltyCatalogFileName,
		newRulebookFileName,
		penaltyDisqualifyingWarning,
		saveNewRulebook,
		type LoadedRulebook,
		type SavedRulebook
	} from "$lib/workflows/records";

	interface Props {
		club: LoadedRulebook | null;
		penalties: LoadedPenalties | null;
		rows: readonly RecChange[];
		year: number;
		saved: SavedRulebook | null;
	}

	let { club, penalties, rows, year, saved = $bindable() }: Props = $props();

	let saving = $state(false);

	const warning = $derived(club ? penaltyDisqualifyingWarning(club) : null);
	const penaltyName = $derived(saved?.penaltyPath ? (saved.penaltyPath.split(/[\\/]/).pop() ?? "") : "");

	async function save() {
		if (!club) return;
		saving = true;
		try {
			saved = (await saveNewRulebook(club, rows, year, penalties?.bytes ?? null)) ?? saved;
			if (saved?.penaltyError) toast.error(saved.penaltyError);
		} catch {
			toast.error("Das Regelwerk konnte nicht gespeichert werden.");
		} finally {
			saving = false;
		}
	}
</script>

<div class="flex flex-col gap-3">
	<Button class="self-start" onclick={save} disabled={!club || saving}>
		<SaveIcon data-icon="inline-start" />
		{newRulebookFileName(year)} speichern
	</Button>
	{#if !club}
		<p class="text-sm text-muted-foreground">Zuerst das Vereins-Regelwerk laden.</p>
	{:else if !penalties}
		<p class="text-sm text-muted-foreground">Ohne Strafenkatalog (Schritt 5) wird nur das Regelwerk gespeichert.</p>
	{:else}
		<p class="text-sm text-muted-foreground">
			Der Strafenkatalog wird als „{newPenaltyCatalogFileName(year)}“ in denselben Ordner gelegt.
		</p>
	{/if}
	{#if warning}
		<Alert.Root variant="destructive">
			<TriangleAlertIcon aria-hidden="true" />
			<Alert.Title>Strafpunkte wirken nicht überall</Alert.Title>
			<Alert.Description>{warning}</Alert.Description>
		</Alert.Root>
	{/if}
	<SaveResult path={saved?.rulebookPath ?? null} label="Regelwerk gespeichert" />
	{#if penaltyName}
		<p class="text-sm">Strafenkatalog daneben gespeichert: <span class="font-medium">{penaltyName}</span></p>
	{/if}
</div>
