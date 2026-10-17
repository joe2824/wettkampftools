<script lang="ts">
	import ClipboardListIcon from "@lucide/svelte/icons/clipboard-list";
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import * as Select from "$lib/components/ui/select";
	import * as Table from "$lib/components/ui/table";
	import type { WaveStatistic } from "$lib/records/waveRecords";
	import { session } from "$lib/session.svelte";
	import { countWaveStarts, estimateWaveDuration, formatDuration } from "$lib/wwk/waveEstimate";
	import { disciplinesLabel } from "./waveTimesFilter";

	// Grobe Dauer der Welle aus den gemeldeten Wellen-Mannschaften (Vorbereitung) und den Durchschnittszeiten.
	interface Props {
		statistics: WaveStatistic[];
		disciplines: string[];
	}

	let { statistics, disciplines }: Props = $props();

	let teamsPerHeat = $state<number | null>(2);
	let pauseS = $state<number | null>(60);
	/** Abgewählte Disziplinen; neu dazukommende zählen automatisch mit. */
	let deselected = $state<string[]>([]);

	const active = $derived(disciplines.filter((discipline) => !deselected.includes(discipline)));

	const registration = $derived(session.registration);
	const starts = $derived(registration ? countWaveStarts(registration.teams, registration.waveSelection) : []);
	const estimate = $derived(
		estimateWaveDuration(starts, statistics, active, {
			teamsPerHeat: teamsPerHeat ?? 1,
			pauseS: pauseS ?? 0
		})
	);
	const heats = $derived(estimate.disciplines.reduce((sum, discipline) => sum + discipline.heats, 0));
	const unknownGroups = $derived([...new Set(estimate.disciplines.flatMap((d) => d.unknownGroups))]);
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Grobe Dauer der Welle</Card.Title>
		<Card.Description>
			Je Disziplin: Läufe mal Durchschnittszeit der Altersklasse plus Pause. Nur eine Schätzung fürs Planen.
		</Card.Description>
	</Card.Header>
	<Card.Content>
		{#if !registration}
			<div class="flex flex-col items-start gap-3">
				<p class="text-sm text-muted-foreground">
					Dafür zuerst in der Vorbereitung die Meldedatei laden und die Wellenstarter wählen.
				</p>
				<Button href="/preparation" variant="outline" size="sm">
					<ClipboardListIcon data-icon="inline-start" />
					Zur Vorbereitung
				</Button>
			</div>
		{:else}
			<div class="grid gap-6 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
				<div class="flex min-w-0 flex-col gap-4 rounded-lg border bg-muted/30 p-4">
					<p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">Annahmen</p>
					<div class="flex flex-col gap-2">
						<Label for="estimate-disciplines">Disziplinen</Label>
						<Select.Root
							type="multiple"
							value={active}
							onValueChange={(value) => (deselected = disciplines.filter((discipline) => !value.includes(discipline)))}
						>
							<Select.Trigger id="estimate-disciplines" class="w-full min-w-0 overflow-hidden">
								<span class="truncate">{disciplinesLabel(active, disciplines)}</span>
							</Select.Trigger>
							<Select.Content>
								{#each disciplines as discipline (discipline)}
									<Select.Item value={discipline} label={discipline}>{discipline}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
					<div class="flex flex-col gap-2">
						<Label for="teams-per-heat">Mannschaften je Lauf</Label>
						<Input id="teams-per-heat" type="number" min="1" max="8" step="1" bind:value={teamsPerHeat} />
					</div>
					<div class="flex flex-col gap-2">
						<Label for="pause-seconds">Pause zwischen den Läufen (Sekunden)</Label>
						<Input id="pause-seconds" type="number" min="0" max="600" step="10" bind:value={pauseS} />
					</div>
				</div>

				<div class="flex min-w-0 flex-col gap-4">
					<div class="flex flex-wrap items-end justify-between gap-4 rounded-lg border p-4">
						<div class="flex flex-col gap-1">
							<p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">Geschätzte Dauer</p>
							<p class="text-3xl font-bold tabular-nums">{formatDuration(estimate.duration)}</p>
						</div>
						<p class="text-sm text-muted-foreground">
							{estimate.teams} Wellen-Mannschaften · {heats} Läufe · aus {registration.fileName}
						</p>
					</div>

					{#if estimate.disciplines.length === 0}
						<p class="text-sm text-muted-foreground">
							{active.length === 0
								? "Keine Disziplin angewählt."
								: "Keine Erfahrungswerte zu den angewählten Disziplinen."}
						</p>
					{:else}
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head>Disziplin</Table.Head>
									<Table.Head class="w-32 text-right">Mannschaften</Table.Head>
									<Table.Head class="w-20 text-right">Läufe</Table.Head>
									<Table.Head class="w-28 text-right">Dauer</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each estimate.disciplines as discipline (discipline.discipline)}
									<Table.Row>
										<Table.Cell>{discipline.discipline}</Table.Cell>
										<Table.Cell class="text-right tabular-nums">{discipline.teams}</Table.Cell>
										<Table.Cell class="text-right tabular-nums">{discipline.heats}</Table.Cell>
										<Table.Cell class="text-right tabular-nums">{formatDuration(discipline.duration)}</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
						{#if unknownGroups.length > 0}
							<p class="text-xs text-muted-foreground">
								Ohne eigene Erfahrungswerte, gerechnet mit dem Durchschnitt der Disziplin: {unknownGroups.join(", ")}.
							</p>
						{/if}
					{/if}
				</div>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
