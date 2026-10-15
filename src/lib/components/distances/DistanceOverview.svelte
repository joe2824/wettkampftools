<script lang="ts">
	import type { DistanceRow } from "$lib/distance/matching";
	import { distanceOverview } from "$lib/distance/overview";
	import { formatKm } from "$lib/format/distance";

	interface Props {
		rows: DistanceRow[];
	}

	let { rows }: Props = $props();

	const overview = $derived(distanceOverview(rows));
</script>

<dl class="grid grid-cols-2 gap-3">
	<div class="rounded-lg border p-3">
		<dt class="text-xs text-muted-foreground">Gliederungen</dt>
		<dd class="text-2xl font-semibold tabular-nums">{overview.count}</dd>
	</div>
	<div class="rounded-lg border p-3">
		<dt class="text-xs text-muted-foreground">Durchschnitt</dt>
		<dd class="text-2xl font-semibold tabular-nums">
			{overview.averageKm === null ? "–" : `${formatKm(overview.averageKm)} km`}
		</dd>
	</div>
	<div class="rounded-lg border p-3">
		<dt class="text-xs text-muted-foreground">Weiteste Anreise</dt>
		<dd class="font-semibold">
			{#if overview.farthest}
				{overview.farthest.name}
				<span class="block text-sm font-normal text-muted-foreground tabular-nums">
					{formatKm(overview.farthest.km)} km
				</span>
			{:else}
				–
			{/if}
		</dd>
	</div>
	<div class="rounded-lg border p-3">
		<dt class="text-xs text-muted-foreground">Bundesländer</dt>
		<dd class="font-semibold tabular-nums">
			{overview.states.length}
			{#if overview.states.length > 0}
				<span class="block text-sm font-normal text-muted-foreground">{overview.states.join(", ")}</span>
			{/if}
		</dd>
	</div>
</dl>
