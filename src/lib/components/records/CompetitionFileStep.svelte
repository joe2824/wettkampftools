<script lang="ts">
	import FileClockIcon from "@lucide/svelte/icons/file-clock";
	import InfoIcon from "@lucide/svelte/icons/info";
	import LoaderCircleIcon from "@lucide/svelte/icons/loader-circle";
	import SparklesIcon from "@lucide/svelte/icons/sparkles";
	import Dropzone from "$lib/components/Dropzone.svelte";
	import LoadedFileCard from "$lib/components/LoadedFileCard.svelte";
	import SaveResult from "$lib/components/SaveResult.svelte";
	import type { CheckedFile } from "$lib/components/fileCheck";
	import * as Alert from "$lib/components/ui/alert";
	import { Button } from "$lib/components/ui/button";
	import type { RecChange } from "$lib/records/proposal";
	import type { EventInfo } from "$lib/settings/settings";
	import {
		competitionDate,
		competitionName,
		freshCompetitionFileName,
		MAX_COMPETITION_BYTES,
		saveFreshCompetition,
		type CompetitionSaveOutcome
	} from "$lib/workflows/freshCompetition";
	import type { LoadedPenalties } from "$lib/workflows/penalties";
	import type { LoadedRulebook } from "$lib/workflows/records";

	interface Props {
		club: LoadedRulebook | null;
		penalties: LoadedPenalties | null;
		rows: readonly RecChange[];
		year: number;
		event: EventInfo;
		/** Neue Wettkampfdatei wurde gespeichert. */
		onupdated?: () => void;
	}

	let { club, penalties, rows, year, event, onupdated }: Props = $props();

	let file = $state.raw<CheckedFile | null>(null);
	let busy = $state(false);
	let outcome = $state.raw<CompetitionSaveOutcome | null>(null);

	const missing = $derived(
		!club
			? "Zuerst das Vereins-Regelwerk laden (Schritt 1)."
			: !penalties
				? "Zuerst den Strafenkatalog laden (Schritt 4)."
				: null
	);
	const name = $derived(competitionName(event) || "Wettkampf ohne Titel");
	const date = $derived(competitionDate(event.date));

	function choose(next: CheckedFile) {
		file = next;
		outcome = null;
	}

	async function create() {
		if (!file || !club || !penalties) return;
		busy = true;
		outcome = await saveFreshCompetition({ previous: file, club, rows, penalties, event, year });
		busy = false;
		if (outcome.ok && outcome.path !== null) onupdated?.();
	}
</script>

<div class="flex flex-col gap-4">
	<Alert.Root>
		<InfoIcon aria-hidden="true" />
		<Alert.Title>So entsteht die Datei</Alert.Title>
		<Alert.Description>
			<p>
				Die Wettkampfdatei des Vorjahres hier ablegen, so wie sie ist. Die App erzeugt daraus eine neue Datei: mit dem
				neuen Regelwerk samt Altersklassen und Rec-Werten, dem neuen Strafenkatalog und den Angaben der Veranstaltung.
				Bahn-Einstellungen, Becken und Logo bleiben; Mannschaften, Ergebnisse, Strafen und Kampfrichter sind leer.
			</p>
			<p>Die neue Datei in JAuswertung öffnen und die Meldungen importieren. Das Original bleibt unverändert.</p>
		</Alert.Description>
	</Alert.Root>

	<dl class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-sm">
		<dt class="text-muted-foreground">Name</dt>
		<dd>{name}</dd>
		<dt class="text-muted-foreground">Datum</dt>
		<dd>{date || "noch kein Datum – in der Vorbereitung eintragen, sonst bleibt es in JAuswertung leer"}</dd>
		<dt class="text-muted-foreground">Ausrichter</dt>
		<dd>{event.host.trim() || "wie im Vorjahr"}</dd>
	</dl>

	{#if file}
		<LoadedFileCard icon={FileClockIcon} title={file.name} tooltip={file.name} onreplace={() => (file = null)}>
			{#snippet details()}Wettkampfdatei des Vorjahres{/snippet}
		</LoadedFileCard>
	{:else}
		<Dropzone
			kinds={["competition"]}
			title="Wettkampfdatei des Vorjahres (.wk)"
			hint="Darf Mannschaften und Ergebnisse enthalten; sie kommen nicht in die neue Datei."
			maxBytes={MAX_COMPETITION_BYTES}
			onfile={choose}
		/>
	{/if}

	<Button class="self-start" onclick={create} disabled={!file || missing !== null || busy}>
		{#if busy}
			<LoaderCircleIcon class="animate-spin" data-icon="inline-start" />
		{:else}
			<SparklesIcon data-icon="inline-start" />
		{/if}
		{freshCompetitionFileName(year)} erstellen
	</Button>
	{#if missing}
		<p class="text-sm text-muted-foreground">{missing}</p>
	{/if}

	{#if outcome && !outcome.ok}
		<Alert.Root variant="destructive">
			<Alert.Title>Wettkampfdatei nicht erstellt</Alert.Title>
			<Alert.Description>{outcome.message}</Alert.Description>
		</Alert.Root>
	{:else if outcome?.ok && outcome.path}
		<SaveResult path={outcome.path} label="Neue Wettkampfdatei gespeichert" />
		<p class="text-sm text-muted-foreground">
			Kontrolle bestanden: {outcome.ageGroups} Altersklassen, neuer Strafenkatalog, keine Mannschaften{outcome.hasLogo
				? ", Logo übernommen"
				: ""}. Bitte einmal in JAuswertung öffnen und die Eigenschaften prüfen.
		</p>
	{/if}
</div>
