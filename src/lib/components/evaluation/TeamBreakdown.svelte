<script lang="ts">
	import * as Table from "$lib/components/ui/table";
	import { formatTrophyPoints } from "$lib/format/points";
	import { displayAgeGroup } from "$lib/wwk/ageGroups";
	import type { ScoredTeam } from "$lib/wwk/scoring";

	interface Props {
		teams: ScoredTeam[];
	}

	let { teams }: Props = $props();
</script>

<Table.Root>
	<Table.Header>
		<Table.Row>
			<Table.Head>Mannschaft</Table.Head>
			<Table.Head>AK</Table.Head>
			<Table.Head>Geschlecht</Table.Head>
			<Table.Head class="text-right">Platz</Table.Head>
			<Table.Head class="text-right">Teams (n)</Table.Head>
			<Table.Head>Rechnung</Table.Head>
			<Table.Head class="text-right">Pokalpunkte</Table.Head>
		</Table.Row>
	</Table.Header>
	<Table.Body>
		{#each teams as team (team.row.sourceRow)}
			<Table.Row>
				<Table.Cell class="font-medium">{team.row.name}</Table.Cell>
				<Table.Cell>{displayAgeGroup(team.ageGroup)}</Table.Cell>
				<Table.Cell>{team.gender}</Table.Cell>
				<Table.Cell class="text-right tabular-nums">{team.place ?? "–"}</Table.Cell>
				<Table.Cell class="text-right tabular-nums">{team.n}</Table.Cell>
				<Table.Cell class="font-mono text-xs text-muted-foreground">{team.formula}</Table.Cell>
				<Table.Cell class="text-right font-semibold tabular-nums">{formatTrophyPoints(team.trophyPoints)}</Table.Cell>
			</Table.Row>
		{/each}
	</Table.Body>
</Table.Root>
