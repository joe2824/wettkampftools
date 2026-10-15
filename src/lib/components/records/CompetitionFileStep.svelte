<script lang="ts">
	import FileClockIcon from "@lucide/svelte/icons/file-clock";
	import InfoIcon from "@lucide/svelte/icons/info";
	import LoaderCircleIcon from "@lucide/svelte/icons/loader-circle";
	import RefreshCwIcon from "@lucide/svelte/icons/refresh-cw";
	import Dropzone from "$lib/components/Dropzone.svelte";
	import LoadedFileCard from "$lib/components/LoadedFileCard.svelte";
	import SaveResult from "$lib/components/SaveResult.svelte";
	import type { CheckedFile } from "$lib/components/fileCheck";
	import * as Alert from "$lib/components/ui/alert";
	import { Button } from "$lib/components/ui/button";
	import type { RecChange } from "$lib/records/proposal";
	import {
		MAX_COMPETITION_BYTES,
		saveUpdatedCompetition,
		type CompetitionSaveOutcome
	} from "$lib/workflows/competitionUpdate";
	import type { LoadedPenalties } from "$lib/workflows/penalties";
	import type { LoadedRulebook } from "$lib/workflows/records";

	interface Props {
		club: LoadedRulebook | null;
		penalties: LoadedPenalties | null;
		rows: readonly RecChange[];
		year: number;
	}

	let { club, penalties, rows, year }: Props = $props();

	let file = $state.raw<CheckedFile | null>(null);
	let busy = $state(false);
	let outcome = $state.raw<CompetitionSaveOutcome | null>(null);

	const missing = $derived(
		!club
			? "Zuerst das Vereins-Regelwerk laden (Schritt 1)."
			: !penalties
				? "Zuerst den Strafenkatalog laden (Schritt 5)."
				: null
	);

	function choose(next: CheckedFile) {
		file = next;
		outcome = null;
	}

	async function update() {
		if (!file || !club || !penalties) return;
		busy = true;
		outcome = await saveUpdatedCompetition(file, { club, penalties, rows, year });
		busy = false;
	}
</script>

<div class="flex flex-col gap-4">
	<Alert.Root>
		<InfoIcon aria-hidden="true" />
		<Alert.Title>Empfohlener Ablauf</Alert.Title>
		<Alert.Description>
			<ol class="list-decimal pl-4">
				<li>Wettkampfdatei des Vorjahres kopieren.</li>
				<li>Die Kopie in JAuswertung öffnen, alle Mannschaften und Ergebnisse entfernen und speichern.</li>
				<li>Die Kopie hier ablegen und „Wettkampfdatei fürs neue Jahr aktualisieren“ wählen.</li>
				<li>Die neue Datei in JAuswertung öffnen und die Meldungen importieren.</li>
			</ol>
			<p>Bahnen und andere Einstellungen bleiben erhalten; das Original wird nicht verändert.</p>
		</Alert.Description>
	</Alert.Root>

	{#if file}
		<LoadedFileCard icon={FileClockIcon} title={file.name} tooltip={file.name} onreplace={() => (file = null)}>
			{#snippet details()}JAuswertung-Wettkampf{/snippet}
		</LoadedFileCard>
	{:else}
		<Dropzone
			kinds={["competition"]}
			title="Wettkampfdatei (.wk)"
			hint="Kopie der Vorjahresdatei, ohne Mannschaften."
			maxBytes={MAX_COMPETITION_BYTES}
			onfile={choose}
		/>
	{/if}

	<Button class="self-start" onclick={update} disabled={!file || missing !== null || busy}>
		{#if busy}
			<LoaderCircleIcon class="animate-spin" data-icon="inline-start" />
		{:else}
			<RefreshCwIcon data-icon="inline-start" />
		{/if}
		Wettkampfdatei fürs neue Jahr aktualisieren
	</Button>
	{#if missing}
		<p class="text-sm text-muted-foreground">{missing}</p>
	{/if}

	{#if outcome && !outcome.ok}
		<Alert.Root variant="destructive">
			<Alert.Title>Wettkampfdatei nicht aktualisiert</Alert.Title>
			<Alert.Description>{outcome.message}</Alert.Description>
		</Alert.Root>
	{:else if outcome?.ok && outcome.path}
		<SaveResult path={outcome.path} label="Neue Wettkampfdatei gespeichert" />
		<p class="text-sm text-muted-foreground">
			Kontrolle bestanden: neuer Strafenkatalog, neue Rec-Werte, {outcome.ageGroups} Altersklassen und
			{outcome.teams} Mannschaften unverändert.
		</p>
	{/if}
</div>
