<script lang="ts">
	import { onMount } from "svelte";
	import { toast } from "svelte-sonner";
	import StepHeader from "$lib/components/StepHeader.svelte";
	import type { CheckedFile } from "$lib/components/fileCheck";
	import BestTimesStep from "$lib/components/records/BestTimesStep.svelte";
	import OfficialRulebookStep from "$lib/components/records/OfficialRulebookStep.svelte";
	import ProposalStep from "$lib/components/records/ProposalStep.svelte";
	import RulebookSource from "$lib/components/records/RulebookSource.svelte";
	import SaveStep from "$lib/components/records/SaveStep.svelte";
	import * as Card from "$lib/components/ui/card";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import type { BestTimes } from "$lib/records/bestTimes";
	import { DEFAULT_REC_MAPPING, type RecMapping } from "$lib/records/mapping";
	import { applyRecOverrides, buildRecProposal, DEFAULT_WAVE_SURCHARGE_S } from "$lib/records/proposal";
	import {
		listBestTimeYears,
		loadBestTimes,
		loadRecMapping,
		loadWaveSurcharge,
		saveRecMapping,
		saveWaveSurcharge
	} from "$lib/records/storage";
	import {
		importBestTimesFile,
		officialRulebookName,
		restoreClubRulebook,
		useClubRulebook,
		type LoadedRulebook,
		type RulebookOutcome
	} from "$lib/workflows/records";

	const currentYear = new Date().getFullYear();

	let yearInput = $state<number | null>(currentYear);
	let club = $state.raw<LoadedRulebook | null>(null);
	let official = $state.raw<LoadedRulebook | null>(null);
	let years = $state.raw<number[]>([]);
	let bestYear = $state("");
	let bestTimes = $state.raw<BestTimes | null>(null);
	let mapping = $state.raw<RecMapping>(DEFAULT_REC_MAPPING);
	let surcharge = $state<number | null>(DEFAULT_WAVE_SURCHARGE_S);
	let surchargeEnabled = $state(true);
	let surchargeLoaded = false;
	let overrides = $state.raw<ReadonlyMap<string, number>>(new Map());
	let savedPath = $state<string | null>(null);

	const year = $derived(yearInput !== null && Number.isInteger(yearInput) ? yearInput : currentYear);
	const rows = $derived(
		club
			? applyRecOverrides(
					buildRecProposal({
						club: club.records,
						official: official?.records ?? null,
						officialName: officialRulebookName(official),
						bestTimes,
						mapping,
						waveSurchargeS: surchargeEnabled ? (surcharge ?? 0) : 0
					}),
					overrides
				)
			: []
	);

	async function refreshYears(preferred: number) {
		years = await listBestTimeYears();
		bestYear = String(years.includes(preferred) ? preferred : (years[0] ?? ""));
	}

	$effect(() => {
		const selected = Number(bestYear);
		if (!selected) {
			bestTimes = null;
			return;
		}
		void loadBestTimes(selected).then((loaded) => (bestTimes = loaded));
	});

	// Zuschlag-Einstellung merken, sobald sie geladen ist.
	$effect(() => {
		const current = { enabled: surchargeEnabled, seconds: surcharge ?? 0 };
		if (surchargeLoaded) void saveWaveSurcharge(current);
	});

	onMount(async () => {
		club = await restoreClubRulebook();
		mapping = await loadRecMapping();
		const stored = await loadWaveSurcharge();
		surchargeEnabled = stored.enabled;
		surcharge = stored.seconds;
		surchargeLoaded = true;
		await refreshYears(year - 1);
	});

	async function handleClub(file: CheckedFile): Promise<RulebookOutcome> {
		const outcome = await useClubRulebook(file);
		if (outcome.ok) {
			club = outcome.rulebook;
			overrides = new Map();
			savedPath = null;
		}
		return outcome;
	}

	async function importBestTimes(file: CheckedFile) {
		const outcome = await importBestTimesFile(file);
		if (!outcome.ok) {
			toast.error(outcome.message);
			return;
		}
		toast.success(`Bestzeiten ${outcome.year} gespeichert`, { description: `${outcome.entries} Bestzeiten.` });
		await refreshYears(outcome.year);
	}

	function changeMapping(next: RecMapping) {
		mapping = next;
		saveRecMapping(next).catch(() => toast.error("Die Zuordnung konnte nicht gespeichert werden."));
	}

	function edit(key: string, rec: number | null) {
		const next = new Map(overrides);
		if (rec === null) next.delete(key);
		else next.set(key, rec);
		overrides = next;
	}
</script>

<div class="page-width flex flex-col gap-6">
	<header class="flex flex-wrap items-end justify-between gap-4">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">Rec-Werte</h1>
			<p class="text-muted-foreground">Neue Rec-Werte ins Vereins-Regelwerk übernehmen, zum Import in JAuswertung.</p>
			<p class="text-sm font-medium" aria-live="polite">Regelwerk für das Jahr {year} (Rec-Werte aus {year - 1})</p>
		</div>
		<div class="flex flex-col gap-2">
			<Label for="target-year">Regelwerk für das Jahr</Label>
			<Input id="target-year" type="number" min="2000" max="2100" class="w-28" bind:value={yearInput} />
		</div>
	</header>

	<Card.Root>
		<Card.Header>
			<StepHeader
				step={1}
				title="Vereins-Regelwerk"
				description="Das bisherige Regelwerk des Wellenwettkampfs."
				done={club !== null}
			/>
		</Card.Header>
		<Card.Content>
			<RulebookSource
				rulebook={club}
				title="Vereins-Regelwerk (.rwm)"
				hint="Wird gespeichert und beim nächsten Mal wieder angeboten."
				onfile={handleClub}
			/>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<StepHeader
				step={2}
				title="Offizielles DLRG-Regelwerk"
				description="Liefert die Rec-Werte der Rettungsdisziplinen."
				done={official !== null}
			/>
		</Card.Header>
		<Card.Content>
			<OfficialRulebookStep bind:official {year} />
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<StepHeader
				step={3}
				title="Bestzeiten des Vorjahres"
				description="Grundlage für die Wellendisziplinen."
				done={bestTimes !== null}
			/>
		</Card.Header>
		<Card.Content>
			<BestTimesStep {years} bind:year={bestYear} {bestTimes} expectedYear={year - 1} onimport={importBestTimes} />
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<StepHeader step={4} title="Vergleich" description="Alte und neue Werte; jeder neue Wert lässt sich ändern." />
		</Card.Header>
		<Card.Content>
			{#if club}
				<ProposalStep
					{rows}
					{mapping}
					club={club.records}
					official={official?.records ?? null}
					bind:surcharge
					bind:surchargeEnabled
					onmapping={changeMapping}
					onedit={edit}
				/>
			{:else}
				<p class="text-sm text-muted-foreground">Zuerst das Vereins-Regelwerk laden.</p>
			{/if}
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<StepHeader
				step={5}
				title="Neues Regelwerk speichern"
				description="Gleicher Aufbau wie bisher, nur Rec-Werte und Beschreibung sind neu."
				done={savedPath !== null}
			/>
		</Card.Header>
		<Card.Content>
			<SaveStep {club} {rows} {year} bind:savedPath />
		</Card.Content>
	</Card.Root>
</div>
