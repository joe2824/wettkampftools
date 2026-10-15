<script lang="ts">
	import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
	import * as Collapsible from "$lib/components/ui/collapsible";
	import {
		distinctNames,
		rescueRecords,
		setAgeGroupMapping,
		setDisciplineAlias,
		type RecMapping
	} from "$lib/records/mapping";
	import type { RulebookRecord } from "$lib/records/rulebookRecords";
	import MappingTable from "./MappingTable.svelte";

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
		<MappingTable
			clubHeading="Altersklasse im Verein"
			officialHeading="Offizielle Altersklasse"
			selectLabel="Offizielle Altersklasse für"
			names={clubAgeGroups}
			options={officialAgeGroups}
			valueOf={(ageGroup) => mapping.ageGroups[ageGroup] ?? null}
			onselect={(ageGroup, value) => onchange(setAgeGroupMapping(mapping, ageGroup, value))}
		/>
		<MappingTable
			clubHeading="Disziplin im Verein"
			officialHeading="Offizielle Disziplin"
			selectLabel="Offizielle Disziplin für"
			names={clubDisciplines}
			options={officialDisciplines}
			valueOf={(discipline) => mapping.disciplineAliases[discipline] ?? null}
			onselect={(discipline, value) => onchange(setDisciplineAlias(mapping, discipline, value))}
		/>
	</Collapsible.Content>
</Collapsible.Root>
