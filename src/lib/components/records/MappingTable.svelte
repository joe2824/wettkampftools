<script lang="ts">
	import * as Table from "$lib/components/ui/table";
	import MappingSelect from "./MappingSelect.svelte";

	interface Props {
		clubHeading: string;
		officialHeading: string;
		/** Beschriftung der Auswahl, z. B. „Offizielle Disziplin für“. */
		selectLabel: string;
		names: readonly string[];
		options: readonly string[];
		valueOf: (name: string) => string | null;
		onselect: (name: string, value: string | null) => void;
	}

	let { clubHeading, officialHeading, selectLabel, names, options, valueOf, onselect }: Props = $props();
</script>

<Table.Root>
	<Table.Header>
		<Table.Row>
			<Table.Head>{clubHeading}</Table.Head>
			<Table.Head>{officialHeading}</Table.Head>
		</Table.Row>
	</Table.Header>
	<Table.Body>
		{#each names as name (name)}
			<Table.Row>
				<Table.Cell>{name}</Table.Cell>
				<Table.Cell>
					<MappingSelect
						label="{selectLabel} {name}"
						value={valueOf(name)}
						{options}
						emptyLabel="Gleicher Name"
						onchange={(value) => onselect(name, value)}
					/>
				</Table.Cell>
			</Table.Row>
		{/each}
	</Table.Body>
</Table.Root>
