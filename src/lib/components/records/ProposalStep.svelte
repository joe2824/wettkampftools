<script lang="ts">
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { Switch } from "$lib/components/ui/switch";
	import type { RecMapping } from "$lib/records/mapping";
	import { displayRows, formatProposalSummary, summarizeProposal, type EditedRecRow } from "$lib/records/proposal";
	import type { RulebookRecord } from "$lib/records/rulebookRecords";
	import MappingEditor from "./MappingEditor.svelte";
	import ProposalTable from "./ProposalTable.svelte";

	interface Props {
		rows: EditedRecRow[];
		mapping: RecMapping;
		club: readonly RulebookRecord[];
		official: readonly RulebookRecord[] | null;
		/** Zuschlag auf die Bestzeit in Sekunden. */
		surcharge: number | null;
		onmapping: (mapping: RecMapping) => void;
		onedit: (key: string, rec: number | null) => void;
	}

	let { rows, mapping, club, official, surcharge = $bindable(), onmapping, onedit }: Props = $props();

	let onlyChanges = $state(false);

	const summary = $derived(summarizeProposal(rows));
	const visibleRows = $derived(displayRows(rows, onlyChanges));
</script>

<div class="flex flex-col gap-4">
	<div class="flex flex-wrap items-end gap-6">
		<div class="flex flex-col gap-2">
			<Label for="wave-surcharge">Zuschlag auf die Bestzeit (Sekunden)</Label>
			<Input id="wave-surcharge" type="number" min="0" step="0.5" class="w-32" bind:value={surcharge} />
		</div>
	</div>

	<MappingEditor {mapping} {club} {official} onchange={onmapping} />

	<div class="flex flex-wrap items-center justify-between gap-3">
		<p class="text-sm text-muted-foreground" aria-live="polite">
			{formatProposalSummary(summary)}
			{#if summary.noSource > 0}
				<span class="font-medium text-destructive">– bitte die Werte ohne Quelle prüfen.</span>
			{/if}
		</p>
		<div class="flex items-center gap-2">
			<Switch id="only-changes" bind:checked={onlyChanges} />
			<Label for="only-changes">Nur Änderungen zeigen</Label>
		</div>
	</div>

	<ProposalTable rows={visibleRows} {onedit} />
	{#if visibleRows.length === 0}
		<p class="text-sm text-muted-foreground">Keine geänderten Werte.</p>
	{/if}
</div>
