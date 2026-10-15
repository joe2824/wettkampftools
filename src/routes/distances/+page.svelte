<script lang="ts">
	import { onMount } from "svelte";
	import { toast } from "svelte-sonner";
	import StepHeader from "$lib/components/StepHeader.svelte";
	import * as Card from "$lib/components/ui/card";
	import DataStep from "$lib/components/distances/DataStep.svelte";
	import DistanceTable from "$lib/components/distances/DistanceTable.svelte";
	import SourceStep from "$lib/components/distances/SourceStep.svelte";
	import type { ChoiceMap } from "$lib/distance/matching";
	import { settingsStore } from "$lib/settings/settingsStore.svelte";
	import {
		computeDistances,
		loadChoices,
		loadOrganisations,
		saveChoice,
		type DistanceSource,
		type OrganisationData
	} from "$lib/workflows/distances";

	let source = $state.raw<DistanceSource | null>(null);
	let choices = $state.raw<ChoiceMap>({});
	let sourceLabel = $state<string | null>(null);
	let organisations = $state.raw<OrganisationData | null>(null);
	let loading = $state(false);

	const result = $derived(
		source && organisations?.data
			? computeDistances(source, organisations.data, { choices, overrides: settingsStore.settings.teamNameOverrides })
			: null
	);

	async function load(refresh: boolean) {
		loading = true;
		try {
			organisations = await loadOrganisations({ refresh });
			if (refresh && organisations.status === "fresh") toast.success("Standortdaten aktualisiert");
		} catch {
			toast.error("Die Standortdaten konnten nicht geladen werden.");
		} finally {
			loading = false;
		}
	}

	function handleSource(next: DistanceSource, label: string) {
		source = next;
		sourceLabel = label;
	}

	async function choose(name: string, id: string) {
		try {
			choices = await saveChoice(choices, name, id);
		} catch {
			toast.error("Die Zuordnung konnte nicht gespeichert werden.");
		}
	}

	onMount(() => {
		void load(false);
		loadChoices()
			.then((stored) => (choices = stored))
			.catch(() => toast.error("Die gemerkten Zuordnungen konnten nicht gelesen werden."));
	});
</script>

<div class="mx-auto flex max-w-4xl flex-col gap-6">
	<header class="flex flex-col gap-1">
		<h1 class="text-2xl font-bold">Entfernungen</h1>
		<p class="text-muted-foreground">Wie weit reisen die Gliederungen nach Bad Nauheim an?</p>
	</header>

	<Card.Root>
		<Card.Header>
			<StepHeader
				step={1}
				title="Gliederungen wählen"
				description="Aus der Vorbereitung übernehmen oder eine Meldedatei laden."
				done={source !== null}
			/>
		</Card.Header>
		<Card.Content>
			<SourceStep {sourceLabel} onnames={handleSource} />
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<StepHeader
				step={2}
				title="Standortdaten"
				description="Öffentliche Standorte der DLRG-Gliederungen. Werden für die Nutzung ohne Internet gespeichert."
				done={organisations?.data != null}
			/>
		</Card.Header>
		<Card.Content>
			<DataStep {organisations} {loading} onrefresh={() => load(true)} />
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<StepHeader step={3} title="Ergebnis" description="Sortiert nach Entfernung, die weiteste Anreise zuerst." />
		</Card.Header>
		<Card.Content>
			{#if result}
				<DistanceTable {result} onchoose={choose} />
			{:else}
				<p class="text-sm text-muted-foreground">
					{source === null ? "Zuerst die Gliederungen wählen." : "Es fehlen noch die Standortdaten."}
				</p>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
