<script lang="ts">
	import { onMount } from "svelte";
	import { toast } from "svelte-sonner";
	import StepHeader from "$lib/components/StepHeader.svelte";
	import * as Card from "$lib/components/ui/card";
	import DataStep from "$lib/components/distances/DataStep.svelte";
	import DistanceTable from "$lib/components/distances/DistanceTable.svelte";
	import SourceStep from "$lib/components/distances/SourceStep.svelte";
	import { computeDistances, loadOrganisations, type OrganisationData } from "$lib/workflows/distances";

	let names = $state.raw<string[] | null>(null);
	let sourceLabel = $state<string | null>(null);
	let organisations = $state.raw<OrganisationData | null>(null);
	let loading = $state(false);

	const result = $derived(names && organisations?.data ? computeDistances(names, organisations.data) : null);

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

	function handleNames(next: string[], label: string) {
		names = next;
		sourceLabel = label;
	}

	onMount(() => {
		void load(false);
	});
</script>

<div class="mx-auto flex max-w-4xl flex-col gap-6">
	<header class="flex flex-col gap-1">
		<h1 class="text-2xl font-bold">Entfernungen</h1>
		<p class="text-muted-foreground">Wie weit reisen die Gliederungen nach Bad Nauheim an?</p>
	</header>

	<Card.Root>
		<Card.Header>
			<StepHeader step={1} title="Gliederungen wählen" description="Aus der Vorbereitung übernehmen oder eine Meldedatei laden." done={names !== null} />
		</Card.Header>
		<Card.Content>
			<SourceStep {sourceLabel} onnames={handleNames} />
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
				<DistanceTable {result} />
			{:else}
				<p class="text-sm text-muted-foreground">
					{names === null ? "Zuerst die Gliederungen wählen." : "Es fehlen noch die Standortdaten."}
				</p>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
