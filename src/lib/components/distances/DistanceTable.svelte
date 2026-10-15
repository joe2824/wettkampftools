<script lang="ts">
	import CopyIcon from "@lucide/svelte/icons/copy";
	import { toast } from "svelte-sonner";
	import * as Alert from "$lib/components/ui/alert";
	import { Badge } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import * as Table from "$lib/components/ui/table";
	import type { DistanceResult } from "$lib/distance/matching";
	import { cn } from "$lib/utils.js";
	import { distanceSummary, distanceTableText, formatKm } from "$lib/workflows/distances";
	import AmbiguousList from "./AmbiguousList.svelte";
	import ChoiceSelect from "./ChoiceSelect.svelte";

	interface Props {
		result: DistanceResult;
		onchoose: (name: string, id: string) => void;
	}

	let { result, onchoose }: Props = $props();

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
	<div class="flex flex-wrap items-center justify-between gap-3">
		<p class="text-sm text-muted-foreground" role="status">{distanceSummary(result)}</p>
		{#if result.matched.length > 0}
			<Button variant="outline" size="sm" onclick={copy}>
				<CopyIcon data-icon="inline-start" />
				Tabelle kopieren
			</Button>
		{/if}
	</div>
	{#if result.ambiguous.length > 0}
		<AmbiguousList names={result.ambiguous} {onchoose} />
	{/if}
	{#if result.matched.length > 0}
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
					<Table.Row class={cn(row.choice && "bg-muted/60")}>
						<Table.Cell class="text-right tabular-nums">{index + 1}</Table.Cell>
						<Table.Cell>
							{#if row.choice}
								<div class="flex flex-col gap-1.5">
									<div class="flex flex-wrap items-center gap-2">
										<span>{row.name}</span>
										{#if row.choice.automatic}
											<Badge variant="outline">automatisch zugeordnet – prüfen</Badge>
										{/if}
									</div>
									<ChoiceSelect
										name={row.name}
										candidates={row.choice.candidates}
										selectedId={row.choice.selectedId}
										onchoose={(id) => onchoose(row.name, id)}
									/>
								</div>
							{:else}
								{row.name}
							{/if}
						</Table.Cell>
						<Table.Cell class="text-right tabular-nums">{formatKm(row.km)}</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	{:else if result.ambiguous.length === 0}
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
