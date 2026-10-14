<script lang="ts">
	import TriangleAlertIcon from "@lucide/svelte/icons/triangle-alert";
	import * as Alert from "$lib/components/ui/alert";
	import type { Ranking } from "$lib/wwk/scoring";
	import StandingItem from "./StandingItem.svelte";

	interface Props {
		ranking: Ranking;
	}

	let { ranking }: Props = $props();
</script>

<div class="flex flex-col gap-3">
	{#if ranking.tieForFirst}
		<Alert.Root variant="destructive">
			<TriangleAlertIcon />
			<Alert.Title>Gleichstand um Platz 1 – Entscheidung durch die Wettkampfleitung</Alert.Title>
			<Alert.Description>Mehrere Ortsgruppen haben gleich viele Pokalpunkte.</Alert.Description>
		</Alert.Root>
	{/if}

	{#if ranking.standings.length === 0}
		<p class="text-sm text-muted-foreground">In dieser Wertung gibt es keine gewerteten Mannschaften.</p>
	{:else}
		<div
			class="grid grid-cols-[4rem_1fr_auto_1.5rem] gap-3 px-3 text-xs font-medium text-muted-foreground"
			aria-hidden="true"
		>
			<span>Platz</span>
			<span>Ortsgruppe</span>
			<span class="text-right">Pokalpunkte</span>
		</div>
		<ol class="flex flex-col gap-2" aria-label="Rangliste">
			{#each ranking.standings as standing (standing.organisation)}
				<li><StandingItem {standing} /></li>
			{/each}
		</ol>
		<p class="text-xs text-muted-foreground">Zeile anklicken, um die Rechnung je Mannschaft zu sehen.</p>
	{/if}
</div>
