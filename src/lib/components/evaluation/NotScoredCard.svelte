<script lang="ts">
	import * as Card from "$lib/components/ui/card";
	import * as Table from "$lib/components/ui/table";
	import type { NotScored } from "$lib/wwk/scoring";

	interface Props {
		entries: NotScored[];
	}

	let { entries }: Props = $props();
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Nicht gewertet</Card.Title>
		<Card.Description>Diese Einträge zählen nicht für die Pokalwertung.</Card.Description>
	</Card.Header>
	<Card.Content>
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>Mannschaft</Table.Head>
					<Table.Head>Gliederung</Table.Head>
					<Table.Head>AK</Table.Head>
					<Table.Head>Grund</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each entries as entry (entry.row.sourceRow)}
					<Table.Row>
						<Table.Cell class="font-medium">{entry.row.name}</Table.Cell>
						<Table.Cell>{entry.row.organisation}</Table.Cell>
						<Table.Cell>{entry.row.ageGroupRaw}</Table.Cell>
						<Table.Cell class="text-muted-foreground">{entry.message}</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</Card.Content>
</Card.Root>
