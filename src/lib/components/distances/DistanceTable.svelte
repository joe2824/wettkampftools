<script lang="ts">
	import CopyIcon from "@lucide/svelte/icons/copy";
	import { toast } from "svelte-sonner";
	import * as Alert from "$lib/components/ui/alert";
	import { Button } from "$lib/components/ui/button";
	import * as Table from "$lib/components/ui/table";
	import type { DistanceResult } from "$lib/distance/dlrgPoi";
	import { distanceTableText, formatKm } from "$lib/workflows/distances";

	let { result }: { result: DistanceResult } = $props();

	async function copy() {
		try {
			await navigator.clipboard.writeText(distanceTableText(result));
			toast.success("Tabelle kopiert", { description: "Sie kann jetzt z. B. in Excel eingefügt werden." });
		} catch {
			toast.error("Die Tabelle konnte nicht kopiert werden.");
		}
	}
</script>

<div class="flex flex-col gap-4">
	{#if result.matched.length > 0}
		<div class="flex justify-end">
			<Button variant="outline" size="sm" onclick={copy}>
				<CopyIcon data-icon="inline-start" />
				Tabelle kopieren
			</Button>
		</div>
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head class="w-16 text-right">Platz</Table.Head>
					<Table.Head>Gliederung</Table.Head>
					<Table.Head class="text-right">Entfernung (km)</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each result.matched as row, index (row.name)}
					<Table.Row>
						<Table.Cell class="text-right tabular-nums">{index + 1}</Table.Cell>
						<Table.Cell>{row.name}</Table.Cell>
						<Table.Cell class="text-right tabular-nums">{formatKm(row.km)}</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	{:else}
		<p class="text-sm text-muted-foreground">Keine der Gliederungen wurde in den Standortdaten gefunden.</p>
	{/if}
	{#if result.unmatched.length > 0}
		<Alert.Root>
			<Alert.Title>Nicht gefunden ({result.unmatched.length})</Alert.Title>
			<Alert.Description>
				<p>Diese Gliederungen stehen unter anderem Namen oder gar nicht in den DLRG-Standortdaten:</p>
				<ul class="mt-1 list-disc ps-4">
					{#each result.unmatched as name (name)}
						<li>{name}</li>
					{/each}
				</ul>
			</Alert.Description>
		</Alert.Root>
	{/if}
</div>
