<script lang="ts">
	import * as Table from "$lib/components/ui/table";
	import type { PenaltyChange } from "$lib/records/penaltyRules";
	import { changeValues } from "$lib/workflows/penalties";

	interface Props {
		changes: readonly PenaltyChange[];
	}

	let { changes }: Props = $props();
</script>

<Table.Root>
	<Table.Header>
		<Table.Row>
			<Table.Head>Code</Table.Head>
			<Table.Head>Name</Table.Head>
			<Table.Head>Bisher</Table.Head>
			<Table.Head>Neu</Table.Head>
		</Table.Row>
	</Table.Header>
	<Table.Body>
		{#each changes as change (change.code)}
			{@const values = changeValues(change)}
			<Table.Row>
				<Table.Cell class="font-medium whitespace-nowrap">{change.code}</Table.Cell>
				<Table.Cell class="whitespace-normal">{change.name}</Table.Cell>
				<Table.Cell class="whitespace-nowrap text-muted-foreground">{values.before}</Table.Cell>
				<Table.Cell class="font-medium whitespace-nowrap">{values.after}</Table.Cell>
			</Table.Row>
		{/each}
	</Table.Body>
</Table.Root>
