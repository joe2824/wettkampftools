<script lang="ts">
	import type { CertificateEntry } from "$lib/certificates/model";
	import { Badge } from "$lib/components/ui/badge";
	import { Checkbox } from "$lib/components/ui/checkbox";
	import * as Table from "$lib/components/ui/table";
	import { formatCompetitionPoints } from "$lib/format/points";
	import type { CompetitionKind } from "$lib/wwk/results";
	import { KIND_FILTER_LABELS, groupState, selectedEntries, withIds, type EntryGroup } from "$lib/certificates/selection";

	interface Props {
		groups: EntryGroup[];
		competition: CompetitionKind;
		excluded: ReadonlySet<string>;
		onchange: (excluded: Set<string>) => void;
	}

	let { groups, competition, excluded, onchange }: Props = $props();

	const isTeam = $derived(competition === "team");
	// Auswahl, Platz, Name, Gliederung, Punkte; bei Mannschaften zusätzlich Mitglieder.
	const BASE_COLUMNS = 5;
	const columnCount = $derived(isTeam ? BASE_COLUMNS + 1 : BASE_COLUMNS);

	function setEntry(entry: CertificateEntry, checked: boolean) {
		onchange(withIds(excluded, [entry.id], !checked));
	}

	function toggleGroup(group: EntryGroup) {
		const ids = group.entries.map((entry) => entry.id);
		onchange(withIds(excluded, ids, groupState(group.entries, excluded) === "all"));
	}
</script>

<div class="max-h-[32rem] overflow-auto rounded-lg border">
	<Table.Root>
		<Table.Header class="sticky top-0 z-10 bg-background">
			<Table.Row>
				<Table.Head class="w-10"><span class="sr-only">Auswahl</span></Table.Head>
				<Table.Head class="w-16 text-right">Platz</Table.Head>
				<Table.Head>Name</Table.Head>
				<Table.Head>Gliederung</Table.Head>
				<Table.Head class="text-right">Wettkampfpunkte</Table.Head>
				{#if isTeam}
					<Table.Head class="text-right">Mitglieder</Table.Head>
				{/if}
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each groups as group (group.key)}
				{@const state = groupState(group.entries, excluded)}
				<Table.Row class="bg-muted/50 hover:bg-muted/50">
					<Table.Cell>
						<Checkbox
							checked={state === "all"}
							indeterminate={state === "some"}
							onCheckedChange={() => toggleGroup(group)}
							aria-label={`Alle in ${group.label} auswählen`}
						/>
					</Table.Cell>
					<Table.Cell colspan={columnCount - 1}>
						<div class="flex items-center gap-2">
							<span class="font-semibold">{group.label}</span>
							<Badge variant="outline">{KIND_FILTER_LABELS[group.kind]}</Badge>
							<span class="text-sm text-muted-foreground">
								{selectedEntries(group.entries, excluded).length} von {group.entries.length} ausgewählt
							</span>
						</div>
					</Table.Cell>
				</Table.Row>
				{#each group.entries as entry (entry.id)}
					<Table.Row data-state={excluded.has(entry.id) ? undefined : "selected"}>
						<Table.Cell>
							<Checkbox
								checked={!excluded.has(entry.id)}
								onCheckedChange={(checked) => setEntry(entry, checked)}
								aria-label={`${entry.row.name} auswählen`}
							/>
						</Table.Cell>
						<Table.Cell class="text-right tabular-nums">{entry.place}.</Table.Cell>
						<Table.Cell class="font-medium">{entry.row.name}</Table.Cell>
						<Table.Cell class="text-muted-foreground">{entry.row.organisation}</Table.Cell>
						<Table.Cell class="text-right tabular-nums">{formatCompetitionPoints(entry.row.competitionPoints)}</Table.Cell>
						{#if isTeam}
							<Table.Cell class="text-right tabular-nums">{entry.row.members.length}</Table.Cell>
						{/if}
					</Table.Row>
				{/each}
			{:else}
				<Table.Row>
					<Table.Cell colspan={columnCount} class="py-8 text-center text-muted-foreground">
						Keine Einträge für diese Filter.
					</Table.Cell>
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
</div>
