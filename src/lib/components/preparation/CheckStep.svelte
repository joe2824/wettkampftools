<script lang="ts">
	import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
	import CircleAlertIcon from "@lucide/svelte/icons/circle-alert";
	import CircleCheckIcon from "@lucide/svelte/icons/circle-check";
	import TriangleAlertIcon from "@lucide/svelte/icons/triangle-alert";
	import * as Alert from "$lib/components/ui/alert";
	import { Button } from "$lib/components/ui/button";
	import * as Collapsible from "$lib/components/ui/collapsible";
	import * as Table from "$lib/components/ui/table";
	import type { Rename } from "$lib/wwk/registrations";
	import { uniqueIssueMessages, type PreparationCheck } from "$lib/workflows/preparation";

	interface Props {
		check: PreparationCheck;
		renames: Rename[];
	}

	let { check, renames }: Props = $props();

	let renamesOpen = $state(false);

	const errorMessages = $derived(uniqueIssueMessages(check.errors));
	const warningMessages = $derived(uniqueIssueMessages(check.warnings));
	const waveRows = $derived(check.rows.filter((row) => row.isWaveCopy).length);
</script>

<p class="text-sm text-muted-foreground">
	{check.rows.length} Meldungen geprüft, davon {waveRows} für den Wellenwettkampf.
</p>

{#if errorMessages.length === 0 && warningMessages.length === 0}
	<Alert.Root>
		<CircleCheckIcon class="text-primary" />
		<Alert.Title>Keine Auffälligkeiten</Alert.Title>
		<Alert.Description>Alle Meldungen sehen gut aus.</Alert.Description>
	</Alert.Root>
{/if}

{#if errorMessages.length > 0}
	<Alert.Root variant="destructive">
		<CircleAlertIcon />
		<Alert.Title>Fehler: {check.excludedRows.length} Meldungen würde JAuswertung verwerfen</Alert.Title>
		<Alert.Description>
			<ul class="list-disc space-y-1 pl-4">
				{#each errorMessages as message (message)}
					<li>{message}</li>
				{/each}
			</ul>
		</Alert.Description>
	</Alert.Root>
{/if}

{#if warningMessages.length > 0}
	<div class="flex flex-col gap-2 rounded-lg border bg-muted/30 p-4">
		<p class="flex items-center gap-2 text-sm font-medium">
			<TriangleAlertIcon class="size-4 text-muted-foreground" aria-hidden="true" />
			Hinweise ({warningMessages.length})
		</p>
		<ul class="list-disc space-y-1 pl-6 text-sm text-muted-foreground">
			{#each warningMessages as message (message)}
				<li>{message}</li>
			{/each}
		</ul>
	</div>
{/if}

{#if renames.length > 0}
	<Collapsible.Root bind:open={renamesOpen}>
		<Collapsible.Trigger>
			{#snippet child({ props })}
				<Button variant="ghost" size="sm" class="-ml-2" {...props}>
					<ChevronDownIcon class={renamesOpen ? "rotate-180 transition-transform" : "transition-transform"} />
					Mannschaftsnamen angepasst ({renames.length})
				</Button>
			{/snippet}
		</Collapsible.Trigger>
		<Collapsible.Content>
			<p class="mb-2 text-sm text-muted-foreground">
				Der Mannschaftsname ist immer die Gliederung; mehrere Mannschaften einer Gruppe werden durchnummeriert.
			</p>
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Bisheriger Name</Table.Head>
						<Table.Head>Neuer Name</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each renames as rename (rename.teamId)}
						<Table.Row>
							<Table.Cell class="text-muted-foreground">{rename.from || "(leer)"}</Table.Cell>
							<Table.Cell class="font-medium">{rename.to}</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</Collapsible.Content>
	</Collapsible.Root>
{/if}
