<script lang="ts">
	import CheckCheckIcon from "@lucide/svelte/icons/check-check";
	import TriangleAlertIcon from "@lucide/svelte/icons/triangle-alert";
	import * as Alert from "$lib/components/ui/alert";
	import { Button } from "$lib/components/ui/button";
	import { Label } from "$lib/components/ui/label";
	import { Switch } from "$lib/components/ui/switch";
	import type { RecMapping } from "$lib/records/mapping";
	import {
		displayRows,
		formatProposalSummary,
		openCount,
		summarizeProposal,
		type ResolvedRecRow
	} from "$lib/records/proposal";
	import type { RulebookRecord } from "$lib/records/rulebookRecords";
	import MappingEditor from "./MappingEditor.svelte";
	import ProposalTable from "./ProposalTable.svelte";

	interface Props {
		rows: ResolvedRecRow[];
		mapping: RecMapping;
		club: readonly RulebookRecord[];
		official: readonly RulebookRecord[] | null;
		onmapping: (mapping: RecMapping) => void;
		onedit: (key: string, rec: number | null) => void;
		onaccept: (key: string) => void;
		onacceptall: () => void;
	}

	let { rows, mapping, club, official, onmapping, onedit, onaccept, onacceptall }: Props = $props();

	let hideSettled = $state(false);

	const summary = $derived(summarizeProposal(rows));
	const open = $derived(openCount(summary));
	const visibleRows = $derived(displayRows(rows, hideSettled));
</script>

<div class="flex flex-col gap-4">
	<MappingEditor {mapping} {club} {official} onchange={onmapping} />

	<p class="text-sm text-muted-foreground">
		Rettungswerte kommen direkt aus dem DLRG-Regelwerk und gelten sofort. Für die Welle gilt der Rekord aller bisherigen
		Wettkämpfe; er wird erst per Klick übernommen, wenn er schneller ist als der bisherige Rec-Wert.
	</p>

	{#if open > 0}
		<Alert.Root>
			<TriangleAlertIcon aria-hidden="true" />
			<Alert.Title>Noch {open === 1 ? "ein Wert" : `${open} Werte`} offen</Alert.Title>
			<Alert.Description>
				<ul class="list-disc pl-4">
					{#if summary.record > 0}
						<li>
							{summary.record === 1 ? "Ein neuer Wellen-Rekord wartet" : `${summary.record} neue Wellen-Rekorde warten`}
							auf die Übernahme.
						</li>
					{/if}
					{#if summary.missing > 0}
						<li>
							{summary.missing === 1 ? "Ein Wert hat" : `${summary.missing} Werte haben`} keine Quelle: alten Wert behalten
							oder selbst eintragen.
						</li>
					{/if}
				</ul>
			</Alert.Description>
		</Alert.Root>
	{/if}

	<div class="flex flex-wrap items-center justify-between gap-3">
		<p class="text-sm text-muted-foreground" aria-live="polite">{formatProposalSummary(summary)}</p>
		<div class="flex flex-wrap items-center gap-4">
			{#if summary.record > 0}
				<Button variant="outline" size="sm" onclick={onacceptall}>
					<CheckCheckIcon data-icon="inline-start" />
					Alle Wellen-Rekorde übernehmen ({summary.record})
				</Button>
			{/if}
			<div class="flex items-center gap-2">
				<Switch id="hide-settled" bind:checked={hideSettled} />
				<Label for="hide-settled">Unveränderte ausblenden</Label>
			</div>
		</div>
	</div>

	<ProposalTable rows={visibleRows} {onedit} {onaccept} />
	{#if visibleRows.length === 0}
		<p class="text-sm text-muted-foreground">Keine geänderten oder offenen Werte.</p>
	{/if}
	<p class="text-xs text-muted-foreground">
		Jeder Wert in der Spalte „Neu“ lässt sich überschreiben; die Eingabe gilt nach Enter oder beim Verlassen des Felds
		und wird als „Eigener Wert“ angezeigt.
	</p>
</div>
