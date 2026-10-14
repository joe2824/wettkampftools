<script lang="ts">
	import { buildCertificatePages, eligibleEntries } from "$lib/certificates/model";
	import CertificateActions from "$lib/components/certificates/CertificateActions.svelte";
	import CertificateOptions from "$lib/components/certificates/CertificateOptions.svelte";
	import EntryFilters from "$lib/components/certificates/EntryFilters.svelte";
	import EntryTable from "$lib/components/certificates/EntryTable.svelte";
	import MissingDateAlert from "$lib/components/MissingDateAlert.svelte";
	import ResultsSource from "$lib/components/ResultsSource.svelte";
	import {
		filterOptions,
		groupEntries,
		selectedEntries,
		visibleEntries
	} from "$lib/components/certificates/certificateSelection";
	import { certificateSelection as selection } from "$lib/components/certificates/selectionState.svelte";
	import StepHeader from "$lib/components/StepHeader.svelte";
	import * as Card from "$lib/components/ui/card";
	import { session } from "$lib/session.svelte";
	import { settingsStore } from "$lib/settings/settingsStore.svelte";
	import { needsYearConfirmation } from "$lib/workflows/results";
	import { buildAgeGroupOrder } from "$lib/wwk/ageGroups";

	const settings = $derived(settingsStore.settings);
	const results = $derived(session.results);
	const competition = $derived(results?.kind ?? "team");
	const entries = $derived(results ? eligibleEntries(results.rows, buildAgeGroupOrder(settings)) : []);
	const options = $derived(filterOptions(entries));
	const visible = $derived(visibleEntries(entries, selection.hidden));
	const selected = $derived(selectedEntries(visible, selection.excluded));
	const preview = $derived(
		buildCertificatePages(selected, { competition, ...settings.certificates }, settings.event)
	);

	// An die Arbeitsmappe binden: das Bestätigen des Dateijahrs setzt die Auswahl nicht zurück.
	$effect.pre(() => selection.attach(results?.workbook ?? null));
</script>

<div class="mx-auto flex max-w-5xl flex-col gap-6">
	<header class="flex flex-col gap-1">
		<h1 class="text-2xl font-bold">Urkunden</h1>
		<p class="text-muted-foreground">
			Urkunden aus der JAuswertung-Ergebnisdatei auswählen und als druckfertiges PDF erzeugen.
		</p>
	</header>

	<MissingDateAlert message="Auf den Urkunden fehlt das Datum – in der Vorbereitung eintragen." withLink />

	<Card.Root>
		<Card.Content class="flex flex-col gap-4">
			<StepHeader
				step={1}
				title="Ergebnisdatei"
				description="Aus der Auswertung übernommen oder hier neu laden."
				done={results !== null}
			/>
			<ResultsSource {results} />
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Content class="flex flex-col gap-4">
			<StepHeader
				step={2}
				title="Auswählen"
				description="Filtern und einzelne Einträge an- oder abwählen – z. B. zwischendurch nur AK 10 und AK 12."
				done={selected.length > 0}
			/>
			{#if results === null}
				<p class="text-sm text-muted-foreground">Zuerst die Ergebnisdatei laden.</p>
			{:else if entries.length === 0}
				<p class="text-sm text-muted-foreground">
					Die Datei enthält keine Einträge mit Platz und bekannter Altersklasse. Bitte die Altersklassen in den
					Einstellungen prüfen.
				</p>
			{:else}
				<EntryFilters {options} hidden={selection.hidden} onchange={(next) => (selection.hidden = next)} />
				<EntryTable
					groups={groupEntries(visible)}
					{competition}
					excluded={selection.excluded}
					onchange={(next) => (selection.excluded = next)}
				/>
			{/if}
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Content class="flex flex-col gap-4">
			<StepHeader
				step={3}
				title="Drucken"
				description="Anzahl festlegen, PDF erzeugen und in tatsächlicher Größe drucken."
			/>
			{#if entries.length > 0}
				<CertificateOptions {competition} namesShortfall={preview.namesShortfall} />
				<CertificateActions
					entries={selected}
					{competition}
					pageCount={preview.pages.length}
					locked={needsYearConfirmation(results)}
				/>
			{:else}
				<p class="text-sm text-muted-foreground">Zuerst Einträge auswählen.</p>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
