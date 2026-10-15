<script lang="ts">
	import { layoutStore } from "$lib/certificates/layoutStore.svelte";
	import { buildCertificatePages, eligibleEntries } from "$lib/certificates/model";
	import CertificateActions from "$lib/components/certificates/CertificateActions.svelte";
	import CertificateOptions from "$lib/components/certificates/CertificateOptions.svelte";
	import CertificatePreview from "$lib/components/certificates/CertificatePreview.svelte";
	import { certificateSteps } from "$lib/components/certificates/certificateSteps";
	import EntryFilters from "$lib/components/certificates/EntryFilters.svelte";
	import EntryTable from "$lib/components/certificates/EntryTable.svelte";
	import MissingDateAlert from "$lib/components/MissingDateAlert.svelte";
	import ResultsSource from "$lib/components/ResultsSource.svelte";
	import {
		filterOptions,
		groupEntries,
		selectedEntries,
		visibleEntries
	} from "$lib/certificates/selection";
	import { certificateSelection as selection } from "$lib/certificates/selectionState.svelte";
	import Stepper from "$lib/components/stepper/Stepper.svelte";
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

	const steps = $derived(
		certificateSteps({
			hasResults: results !== null,
			yearPending: needsYearConfirmation(results),
			entryCount: entries.length,
			selectedCount: selected.length
		})
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

	<Stepper page="certificates" {steps}>
		{#snippet children(step)}
			{#if step.id === "results"}
				<ResultsSource {results} />
			{:else if step.id === "select"}
				{#if entries.length === 0}
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
			{:else if step.id === "preview"}
				<CertificateOptions {competition} namesShortfall={preview.namesShortfall} />
				<CertificatePreview
					pages={preview.pages}
					layout={layoutStore.layouts[competition]}
					withMemberNames={settings.certificates.withMemberNames}
				/>
			{:else if step.id === "print"}
				<CertificateActions
					entries={selected}
					{competition}
					pageCount={preview.pages.length}
					locked={needsYearConfirmation(results)}
				/>
			{/if}
		{/snippet}
	</Stepper>
</div>
