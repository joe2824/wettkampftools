<script lang="ts">
	import * as Table from "$lib/components/ui/table";
	import { formatRecTime } from "$lib/format/time";
	import type { WaveStatistic } from "$lib/records/waveRecords";
	import { GENDER_LABELS } from "./waveTimesFilter";

	interface Props {
		statistics: WaveStatistic[];
	}

	let { statistics }: Props = $props();

	const teamsPerYear = (value: number): string => value.toLocaleString("de-DE", { maximumFractionDigits: 1 });
</script>

{#if statistics.length === 0}
	<p class="text-sm text-muted-foreground">Keine Zeiten für diese Auswahl.</p>
{:else}
	<Table.Root>
		<Table.Header>
			<Table.Row>
				<Table.Head>Altersklasse</Table.Head>
				<Table.Head>Disziplin</Table.Head>
				<Table.Head class="text-right">Rekord</Table.Head>
				<Table.Head class="text-right">Durchschnitt</Table.Head>
				<Table.Head class="text-right">Längste</Table.Head>
				<Table.Head class="text-right">Mannschaften</Table.Head>
				<Table.Head class="text-right">Jahre</Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each statistics as statistic (`${statistic.ageGroup}|${statistic.gender}|${statistic.discipline}`)}
				<Table.Row>
					<Table.Cell class="whitespace-nowrap">
						{statistic.ageGroup}
						<span class="text-muted-foreground">{GENDER_LABELS[statistic.gender]}</span>
					</Table.Cell>
					<Table.Cell>{statistic.discipline}</Table.Cell>
					<Table.Cell class="text-right whitespace-nowrap tabular-nums">
						<span class="font-medium">{formatRecTime(statistic.record.time)}</span>
						<span class="text-xs text-muted-foreground">{statistic.record.year}</span>
					</Table.Cell>
					<Table.Cell class="text-right tabular-nums">{formatRecTime(statistic.average)}</Table.Cell>
					<Table.Cell class="text-right whitespace-nowrap tabular-nums">
						{formatRecTime(statistic.slowest)}
						<span class="text-xs text-muted-foreground">{statistic.slowestYear}</span>
					</Table.Cell>
					<Table.Cell class="text-right whitespace-nowrap tabular-nums">
						{teamsPerYear(statistic.teamsPerYear)}
						<span class="text-xs text-muted-foreground">je Wettkampf</span>
					</Table.Cell>
					<Table.Cell class="text-right tabular-nums text-muted-foreground">{statistic.years}</Table.Cell>
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
{/if}
