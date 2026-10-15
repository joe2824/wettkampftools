<script lang="ts">
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import type { RecMapping } from "$lib/records/mapping";
	import type { EditedRecRow } from "$lib/records/proposal";
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

	const changed = $derived(rows.filter((row) => row.newRec !== row.oldRec).length);
	const missing = $derived(rows.filter((row) => row.source === "unchanged" && !row.edited).length);
</script>

<div class="flex flex-col gap-4">
	<div class="flex flex-wrap items-end gap-6">
		<div class="flex flex-col gap-2">
			<Label for="wave-surcharge">Zuschlag auf die Bestzeit (Sekunden)</Label>
			<Input id="wave-surcharge" type="number" min="0" step="0.5" class="w-32" bind:value={surcharge} />
		</div>
		<p class="text-sm text-muted-foreground" aria-live="polite">
			{changed} von {rows.length} Werten ändern sich.
			{#if missing > 0}
				<span class="font-medium text-destructive">{missing} ohne Quelle – bitte prüfen.</span>
			{/if}
		</p>
	</div>

	<MappingEditor {mapping} {club} {official} onchange={onmapping} />

	<ProposalTable {rows} {onedit} />
</div>
