<script lang="ts">
	import MessageListAlert from "$lib/components/MessageListAlert.svelte";
	import * as Table from "$lib/components/ui/table";
	import type { ExpectedCounts, VerificationResult } from "$lib/wwk/registrationExport";

	interface Props {
		expected: ExpectedCounts;
		verification: VerificationResult;
	}

	let { expected, verification }: Props = $props();
</script>

<section
	class="flex flex-col gap-4 rounded-xl border-2 border-primary bg-primary/5 p-6"
	aria-labelledby="import-count-title"
>
	<div class="flex flex-col gap-1">
		<h3 id="import-count-title" class="text-xl font-semibold">
			JAuswertung muss genau <span class="text-3xl font-bold text-primary tabular-nums">{expected.total}</span> Meldungen
			importieren
		</h3>
		<p class="text-sm text-muted-foreground">
			Nach dem Import in JAuswertung die Anzahl je Altersklasse und Geschlecht mit dieser Tabelle vergleichen.
		</p>
	</div>

	<Table.Root>
		<Table.Header>
			<Table.Row>
				<Table.Head>Altersklasse</Table.Head>
				<Table.Head>Geschlecht</Table.Head>
				<Table.Head class="text-right">Anzahl</Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each expected.byGroup as group (`${group.ageGroup}|${group.gender}`)}
				<Table.Row>
					<Table.Cell>{group.ageGroup}</Table.Cell>
					<Table.Cell>{group.gender}</Table.Cell>
					<Table.Cell class="text-right tabular-nums">{group.count}</Table.Cell>
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>

	{#if !verification.ok}
		<MessageListAlert
			variant="destructive"
			withIcon
			title="Die gespeicherte Datei weicht ab"
			messages={verification.problems}
		/>
	{/if}
</section>
