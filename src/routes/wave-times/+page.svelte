<script lang="ts">
	import ChartLineIcon from "@lucide/svelte/icons/chart-line";
	import { onMount } from "svelte";
	import { toast } from "svelte-sonner";
	import Dropzone from "$lib/components/Dropzone.svelte";
	import type { CheckedFile } from "$lib/components/fileCheck";
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import * as Dialog from "$lib/components/ui/dialog";
	import { Label } from "$lib/components/ui/label";
	import * as Select from "$lib/components/ui/select";
	import WaveEstimateCard from "$lib/components/waveTimes/WaveEstimateCard.svelte";
	import {
		applyFilter,
		chartSeries,
		disciplinesLabel,
		EMPTY_FILTER,
		filterOptions,
		GENDER_LABELS,
		MAX_SERIES,
		type WaveFilter
	} from "$lib/components/waveTimes/waveTimesFilter";
	import WaveTimesChart from "$lib/components/waveTimes/WaveTimesChart.svelte";
	import WaveTimesTable from "$lib/components/waveTimes/WaveTimesTable.svelte";
	import type { RecordGender } from "$lib/records/rulebookRecords";
	import { EMPTY_WAVE_RECORDS, importBestTimesFile, loadWaveRecords, type WaveRecords } from "$lib/workflows/records";

	const ALL = "__all__";

	let records = $state.raw<WaveRecords>(EMPTY_WAVE_RECORDS);
	let filter = $state<WaveFilter>({ ...EMPTY_FILTER });
	let chartOpen = $state(false);

	const options = $derived(filterOptions(records.statistics));
	const filtered = $derived(applyFilter(records.statistics, filter));
	const series = $derived(chartSeries(records.history, filtered, filter));
	const first = $derived(records.years[0]);
	const last = $derived(records.years.at(-1));

	const fromSelect = (value: string): string | null => (value === ALL ? null : value);

	const MAIN_DISCIPLINE = "4*50m Retten in der Welle";

	async function refresh() {
		try {
			records = await loadWaveRecords();
			if (filter.disciplines.length === 0 && records.statistics.length > 0) {
				const options = filterOptions(records.statistics);
				filter.disciplines = [options.disciplines.includes(MAIN_DISCIPLINE) ? MAIN_DISCIPLINE : options.disciplines[0]];
			}
		} catch {
			toast.error("Die Wellen-Zeiten konnten nicht gelesen werden.");
		}
	}

	async function importFile(file: CheckedFile) {
		const outcome = await importBestTimesFile(file);
		if (!outcome.ok) {
			toast.error(outcome.message);
			return;
		}
		toast.success(`Wellen-Zeiten ${outcome.year} gespeichert`, { description: `${outcome.entries} Einträge.` });
		await refresh();
	}

	onMount(refresh);
</script>

<div class="page-width flex flex-col gap-6">
	<header class="flex flex-col gap-1">
		<h1 class="text-2xl font-bold">Wellen-Zeiten</h1>
		<p class="text-muted-foreground">
			{#if records.years.length > 0}
				Rekorde, Durchschnitt und längste Zeiten aus {records.years.length} Wettkämpfen ({first} bis {last}). Der Rekord
				ist die schnellste Zeit ohne Strafe und wird beim Regelwerk fürs neue Jahr vorgeschlagen; Durchschnitt und
				längste Zeit zählen alle Mannschaften und helfen beim Zeitplan.
			{:else}
				Noch keine Wellen-Zeiten bekannt. Ergebnisdateien zählen automatisch, sobald sie bei Auswertung oder Urkunden
				geladen werden.
			{/if}
		</p>
	</header>

	<Card.Root>
		<Card.Header>
			<Card.Title>Zeiten je Altersklasse</Card.Title>
			<Card.Description>Rekord, Durchschnitt und längste Zeit über alle Jahre.</Card.Description>
			{#if filtered.length > 0}
				<Card.Action>
					<Button variant="outline" size="sm" onclick={() => (chartOpen = true)}>
						<ChartLineIcon data-icon="inline-start" />
						Verlauf als Grafik
					</Button>
				</Card.Action>
			{/if}
		</Card.Header>
		<Card.Content class="flex flex-col gap-4">
			<div class="flex flex-wrap gap-4">
				<div class="flex flex-col gap-2">
					<Label for="filter-age-group">Altersklasse</Label>
					<Select.Root
						type="single"
						value={filter.ageGroup ?? ALL}
						onValueChange={(value) => (filter.ageGroup = fromSelect(value))}
					>
						<Select.Trigger id="filter-age-group" class="w-44">{filter.ageGroup ?? "Alle"}</Select.Trigger>
						<Select.Content>
							<Select.Item value={ALL} label="Alle">Alle</Select.Item>
							{#each options.ageGroups as ageGroup (ageGroup)}
								<Select.Item value={ageGroup} label={ageGroup}>{ageGroup}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
				<div class="flex flex-col gap-2">
					<Label for="filter-gender">Geschlecht</Label>
					<Select.Root
						type="single"
						value={filter.gender ?? ALL}
						onValueChange={(value) => (filter.gender = fromSelect(value) as RecordGender | null)}
					>
						<Select.Trigger id="filter-gender" class="w-36">
							{filter.gender ? GENDER_LABELS[filter.gender] : "Beide"}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value={ALL} label="Beide">Beide</Select.Item>
							<Select.Item value="female" label="weiblich">weiblich</Select.Item>
							<Select.Item value="male" label="männlich">männlich</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>
				<div class="flex flex-col gap-2">
					<Label for="filter-disciplines">Disziplinen</Label>
					<Select.Root
						type="multiple"
						value={filter.disciplines}
						onValueChange={(value) => (filter.disciplines = value)}
					>
						<Select.Trigger id="filter-disciplines" class="w-80">
							{disciplinesLabel(filter.disciplines, options.disciplines)}
						</Select.Trigger>
						<Select.Content>
							{#each options.disciplines as discipline (discipline)}
								<Select.Item value={discipline} label={discipline}>{discipline}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			</div>
			<WaveTimesTable statistics={filtered} />
		</Card.Content>
	</Card.Root>

	<WaveEstimateCard statistics={records.statistics} disciplines={records.disciplines} />

	<Dropzone
		kinds={["excel"]}
		title="Ergebnisdatei eines früheren Jahres nachtragen"
		hint="Excel-Export aus JAuswertung; das Jahr wird aus dem Dateidatum bestimmt."
		compact
		onfile={importFile}
	/>
</div>

<Dialog.Root bind:open={chartOpen}>
	<Dialog.Content class="sm:max-w-4xl">
		<Dialog.Header>
			<Dialog.Title>Verlauf über die Jahre</Dialog.Title>
			<Dialog.Description>
				{#if filtered.length === 1}
					Schnellste, Durchschnitt und längste Zeit je Jahr für die gewählte Gruppe.
				{:else}
					Durchschnitt je Gruppe{filtered.length > MAX_SERIES ? `, höchstens ${MAX_SERIES} Linien` : ""}. Für Schnellste
					und Längste eine einzelne Altersklasse mit Geschlecht und Disziplin wählen.
				{/if}
			</Dialog.Description>
		</Dialog.Header>
		<WaveTimesChart {series} />
	</Dialog.Content>
</Dialog.Root>
