<script lang="ts">
	import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
	import * as Collapsible from "$lib/components/ui/collapsible";
	import * as Table from "$lib/components/ui/table";
	import {
		distinctNames,
		rescueRecords,
		setAgeGroupMapping,
		setDisciplineAlias,
		type RecMapping
	} from "$lib/records/mapping";
	import type { RulebookRecord } from "$lib/records/rulebookRecords";
	import MappingSelect from "./MappingSelect.svelte";

	interface Props {
		mapping: RecMapping;
		club: readonly RulebookRecord[];
		official: readonly RulebookRecord[] | null;
		onchange: (mapping: RecMapping) => void;
	}

	let { mapping, club, official, onchange }: Props = $props();

	const clubRescue = $derived(rescueRecords(club));
	const clubAgeGroups = $derived(distinctNames(clubRescue, "ageGroup"));
	const clubDisciplines = $derived(distinctNames(clubRescue, "discipline"));
	const officialAgeGroups = $derived(official ? distinctNames(official, "ageGroup") : []);
	const officialDisciplines = $derived(official ? distinctNames(official, "discipline") : []);
</script>

<Collapsible.Root class="rounded-lg border">
	<Collapsible.Trigger
		class="group flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
	>
		Zuordnung zum offiziellen Regelwerk
		<ChevronDownIcon
			class="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
			aria-hidden="true"
		/>
	</Collapsible.Trigger>
	<Collapsible.Content class="flex flex-col gap-4 border-t p-3">
		<p class="text-sm text-muted-foreground">
			Welche offizielle Altersklasse und Disziplin liefert den Rec-Wert? Die Zuordnung wird gespeichert.
		</p>
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>Altersklasse im Verein</Table.Head>
					<Table.Head>Offizielle Altersklasse</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each clubAgeGroups as ageGroup (ageGroup)}
					<Table.Row>
						<Table.Cell>{ageGroup}</Table.Cell>
						<Table.Cell>
							<MappingSelect
								label="Offizielle Altersklasse für {ageGroup}"
								value={mapping.ageGroups[ageGroup] ?? null}
								options={officialAgeGroups}
								emptyLabel="Gleicher Name"
								onchange={(value) => onchange(setAgeGroupMapping(mapping, ageGroup, value))}
							/>
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>Disziplin im Verein</Table.Head>
					<Table.Head>Offizielle Disziplin</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each clubDisciplines as discipline (discipline)}
					<Table.Row>
						<Table.Cell>{discipline}</Table.Cell>
						<Table.Cell>
							<MappingSelect
								label="Offizielle Disziplin für {discipline}"
								value={mapping.disciplineAliases[discipline] ?? null}
								options={officialDisciplines}
								emptyLabel="Gleicher Name"
								onchange={(value) => onchange(setDisciplineAlias(mapping, discipline, value))}
							/>
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</Collapsible.Content>
</Collapsible.Root>
