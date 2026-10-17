<script lang="ts">
	import MapIcon from "@lucide/svelte/icons/map";
	import { onMount } from "svelte";
	import { toast } from "svelte-sonner";
	import StepHeader from "$lib/components/StepHeader.svelte";
	import * as Card from "$lib/components/ui/card";
	import DataStep from "$lib/components/distances/DataStep.svelte";
	import SetupRow from "$lib/components/distances/SetupRow.svelte";
	import DistanceMapPanel from "$lib/components/distances/DistanceMapPanel.svelte";
	import DistanceTable from "$lib/components/distances/DistanceTable.svelte";
	import { readMapVisible, writeMapVisible } from "$lib/components/distances/mapPreference";
	import { Button } from "$lib/components/ui/button";
	import { cn } from "$lib/utils.js";
	import SourceStep from "$lib/components/distances/SourceStep.svelte";
	import type { ChoiceMap } from "$lib/distance/matching";
	import { settingsStore } from "$lib/settings/settingsStore.svelte";
	import {
		computeDistances,
		distanceRowId,
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
	let highlighted = $state<string | null>(null);
	let mapVisible = $state(readMapVisible());
	// Nach der Wahl der Gliederungen rücken die ersten Schritte in eine Zeile zusammen.
	let editingSource = $state(false);

	const result = $derived(
		source && organisations?.data
			? computeDistances(source, organisations.data, { choices, overrides: settingsStore.settings.teamNameOverrides })
			: null
	);

	const withMap = $derived(mapVisible && result !== null && result.matched.length > 0);

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
		editingSource = false;
	}

	async function choose(name: string, id: string) {
		try {
			choices = await saveChoice(choices, name, id);
		} catch {
			toast.error("Die Zuordnung konnte nicht gespeichert werden.");
		}
	}

	function toggleMap() {
		mapVisible = !mapVisible;
		writeMapVisible(mapVisible);
	}

	function showRow(name: string) {
		highlighted = name;
		document.getElementById(distanceRowId(name))?.scrollIntoView({ block: "center", behavior: "smooth" });
	}

	onMount(() => {
		void load(false);
		loadChoices()
			.then((stored) => (choices = stored))
			.catch(() => toast.error("Die gemerkten Zuordnungen konnten nicht gelesen werden."));
	});
</script>

<div class="page-width flex flex-col gap-6">
	<header class="flex flex-col gap-1">
		<h1 class="text-2xl font-bold">Entfernungen</h1>
		<p class="text-muted-foreground">Wie weit reisen die Gliederungen nach Bad Nauheim an?</p>
	</header>

	{#if source !== null && !editingSource}
		<Card.Root class="gap-3 py-4">
			<Card.Content class="flex flex-col gap-3">
				<SetupRow label="Gliederungen" done>
					<span class="truncate text-muted-foreground" title={sourceLabel}>{sourceLabel}</span>
					<Button variant="ghost" size="sm" onclick={() => (editingSource = true)}>Ändern</Button>
				</SetupRow>
				<SetupRow label="Standortdaten" done={organisations?.data != null}>
					<DataStep {organisations} {loading} onrefresh={() => load(true)} />
				</SetupRow>
			</Card.Content>
		</Card.Root>
	{:else}
		<Card.Root>
			<Card.Header>
				<StepHeader
					step={1}
					title="Gliederungen wählen"
					description="Aus der Vorbereitung übernehmen oder eine Meldedatei laden."
					done={source !== null}
				/>
			</Card.Header>
			<Card.Content class="flex flex-col gap-3">
				<SourceStep {sourceLabel} onnames={handleSource} />
				{#if source !== null}
					<Button variant="ghost" size="sm" class="self-start" onclick={() => (editingSource = false)}>
						Bei {sourceLabel} bleiben
					</Button>
				{/if}
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
	{/if}

	<Card.Root>
		<Card.Header>
			<StepHeader step={3} title="Ergebnis" description="Sortiert nach Entfernung, die weiteste Anreise zuerst." />
			{#if result && result.matched.length > 0}
				<Card.Action>
					<Button variant="outline" size="sm" aria-pressed={mapVisible} onclick={toggleMap}>
						<MapIcon data-icon="inline-start" />
						{mapVisible ? "Karte ausblenden" : "Karte zeigen"}
					</Button>
				</Card.Action>
			{/if}
		</Card.Header>
		<Card.Content>
			{#if result}
				<div class={cn("grid items-start gap-6", withMap && "lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]")}>
					<DistanceTable {result} onchoose={choose} {highlighted} onhighlight={(name) => (highlighted = name)} />
					{#if withMap}
						<DistanceMapPanel
							rows={result.matched}
							{highlighted}
							onhighlight={(name) => (highlighted = name)}
							onselect={showRow}
						/>
					{/if}
				</div>
			{:else}
				<p class="text-sm text-muted-foreground">
					{source === null ? "Zuerst die Gliederungen wählen." : "Es fehlen noch die Standortdaten."}
				</p>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
