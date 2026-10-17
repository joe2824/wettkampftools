<script lang="ts">
	import { onMount } from "svelte";
	import { toast } from "svelte-sonner";
	import type { CheckedFile } from "$lib/components/fileCheck";
	import CompetitionFileStep from "$lib/components/records/CompetitionFileStep.svelte";
	import OfficialRulebookStep from "$lib/components/records/OfficialRulebookStep.svelte";
	import PenaltyStep from "$lib/components/records/PenaltyStep.svelte";
	import ProposalStep from "$lib/components/records/ProposalStep.svelte";
	import RulebookSource from "$lib/components/records/RulebookSource.svelte";
	import { recordSteps } from "$lib/components/records/recordSteps";
	import SaveStep from "$lib/components/records/SaveStep.svelte";
	import Stepper from "$lib/components/stepper/Stepper.svelte";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { DEFAULT_REC_MAPPING, type RecMapping } from "$lib/records/mapping";
	import {
		buildRecProposal,
		EMPTY_DECISIONS,
		openCount,
		pendingRecordKeys,
		resolveRecRows,
		summarizeProposal,
		type RecDecisions
	} from "$lib/records/proposal";
	import { loadRecMapping, saveRecMapping } from "$lib/records/storage";
	import {
		EMPTY_WAVE_RECORDS,
		loadWaveRecords,
		officialRulebookName,
		restoreClubRulebook,
		useClubRulebook,
		type LoadedRulebook,
		type RulebookOutcome,
		type SavedRulebook,
		type WaveRecords
	} from "$lib/workflows/records";
	import type { LoadedPenalties } from "$lib/workflows/penalties";

	const currentYear = new Date().getFullYear();

	let yearInput = $state<number | null>(currentYear);
	let club = $state.raw<LoadedRulebook | null>(null);
	let official = $state.raw<LoadedRulebook | null>(null);
	let waveRecords = $state.raw<WaveRecords>(EMPTY_WAVE_RECORDS);
	let mapping = $state.raw<RecMapping>(DEFAULT_REC_MAPPING);
	let decisions = $state.raw<RecDecisions>(EMPTY_DECISIONS);
	let saved = $state.raw<SavedRulebook | null>(null);
	let penalties = $state.raw<LoadedPenalties | null>(null);
	let competitionUpdated = $state(false);

	const year = $derived(yearInput !== null && Number.isInteger(yearInput) ? yearInput : currentYear);
	const rows = $derived(
		club
			? resolveRecRows(
					buildRecProposal({
						club: club.records,
						official: official?.records ?? null,
						officialName: officialRulebookName(official),
						records: waveRecords.table,
						mapping
					}),
					decisions
				)
			: []
	);
	const steps = $derived(
		recordSteps({
			hasClub: club !== null,
			hasOfficial: official !== null,
			openValues: openCount(summarizeProposal(rows)),
			hasPenalties: penalties !== null,
			penaltyIssues: penalties?.issues.length ?? 0,
			saved: saved !== null,
			competitionUpdated
		})
	);

	onMount(async () => {
		club = await restoreClubRulebook();
		mapping = await loadRecMapping();
		waveRecords = await loadWaveRecords();
	});

	async function handleClub(file: CheckedFile): Promise<RulebookOutcome> {
		const outcome = await useClubRulebook(file);
		if (outcome.ok) {
			club = outcome.rulebook;
			decisions = EMPTY_DECISIONS;
			saved = null;
			competitionUpdated = false;
		}
		return outcome;
	}

	function changeMapping(next: RecMapping) {
		mapping = next;
		saveRecMapping(next).catch(() => toast.error("Die Zuordnung konnte nicht gespeichert werden."));
	}

	/** null setzt die Zeile auf den Vorschlag zurück, auch eine übernommene Bestzeit. */
	function edit(key: string, rec: number | null) {
		const overrides = new Map(decisions.overrides);
		const accepted = new Set(decisions.accepted);
		if (rec === null) {
			overrides.delete(key);
			accepted.delete(key);
		} else {
			overrides.set(key, rec);
		}
		decisions = { accepted, overrides };
	}

	function accept(keys: readonly string[]) {
		decisions = { ...decisions, accepted: new Set([...decisions.accepted, ...keys]) };
	}
</script>

<div class="page-width flex flex-col gap-6">
	<header class="flex flex-wrap items-end justify-between gap-4">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">Regelwerk fürs neue Jahr</h1>
			<p class="text-muted-foreground">
				Neue Rec-Werte und den aktuellen Strafenkatalog fürs Vereins-Regelwerk, zum Import in JAuswertung.
			</p>
			<p class="text-sm font-medium" aria-live="polite">Regelwerk für das Jahr {year}</p>
		</div>
		<div class="flex flex-col gap-2">
			<Label for="target-year">Regelwerk für das Jahr</Label>
			<Input id="target-year" type="number" min="2000" max="2100" class="w-28" bind:value={yearInput} />
		</div>
	</header>

	<Stepper page="records" {steps}>
		{#snippet children(step)}
			{#if step.id === "club"}
				<RulebookSource
					rulebook={club}
					title="Vereins-Regelwerk (.rwm)"
					hint="Wird gespeichert und beim nächsten Mal wieder angeboten."
					onfile={handleClub}
				/>
			{:else if step.id === "official"}
				<OfficialRulebookStep bind:official {year} />
			{:else if step.id === "proposal" && club}
				<ProposalStep
					{rows}
					{mapping}
					club={club.records}
					official={official?.records ?? null}
					onmapping={changeMapping}
					onedit={edit}
					onaccept={(key) => accept([key])}
					onacceptall={() => accept(pendingRecordKeys(rows))}
				/>
			{:else if step.id === "penalties"}
				<PenaltyStep bind:penalties />
			{:else if step.id === "save"}
				<SaveStep {club} {penalties} {rows} {year} bind:saved />
			{:else if step.id === "competition"}
				<CompetitionFileStep {club} {penalties} {rows} {year} onupdated={() => (competitionUpdated = true)} />
			{/if}
		{/snippet}
	</Stepper>
</div>
