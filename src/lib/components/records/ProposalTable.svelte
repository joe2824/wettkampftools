<script lang="ts">
	import RotateCcwIcon from "@lucide/svelte/icons/rotate-ccw";
	import { toast } from "svelte-sonner";
	import { Badge, type BadgeVariant } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import * as Table from "$lib/components/ui/table";
	import { formatRecDifference, formatRecTime, parseRecTime } from "$lib/format/time";
	import { difference, type EditedRecRow, type RecSource } from "$lib/records/proposal";
	import { recKey, type RecordGender } from "$lib/records/rulebookRecords";
	import { cn } from "$lib/utils.js";

	interface Props {
		rows: EditedRecRow[];
		/** null setzt den Vorschlag wieder ein. */
		onedit: (key: string, rec: number | null) => void;
	}

	let { rows, onedit }: Props = $props();

	const GENDER_LABELS: Record<RecordGender, string> = { female: "weiblich", male: "männlich" };
	const SOURCES: Record<RecSource, { label: string; variant: BadgeVariant }> = {
		official: { label: "DLRG (offiziell)", variant: "secondary" },
		bestTime: { label: "Welle: Bestzeit + Zuschlag", variant: "secondary" },
		unchanged: { label: "Keine Quelle", variant: "destructive" }
	};

	function commit(row: EditedRecRow, input: HTMLInputElement) {
		const rec = parseRecTime(input.value);
		if (rec === null) {
			toast.error("Bitte eine Zeit wie 58,17 oder 1:23,45 eingeben.");
			input.value = formatRecTime(row.newRec);
			return;
		}
		if (rec !== row.newRec) onedit(recKey(row), rec);
		input.value = formatRecTime(rec);
	}
</script>

<Table.Root>
	<Table.Header>
		<Table.Row>
			<Table.Head>Altersklasse</Table.Head>
			<Table.Head>Disziplin</Table.Head>
			<Table.Head class="text-right">Alt</Table.Head>
			<Table.Head class="w-36">Neu</Table.Head>
			<Table.Head class="text-right">Änderung</Table.Head>
			<Table.Head>Quelle</Table.Head>
		</Table.Row>
	</Table.Header>
	<Table.Body>
		{#each rows as row (recKey(row))}
			{@const source = SOURCES[row.source]}
			{@const change = difference(row)}
			<Table.Row
				class={cn(change !== 0 && "bg-primary/5", row.source === "unchanged" && !row.edited && "bg-destructive/5")}
			>
				<Table.Cell class="whitespace-nowrap">
					{row.ageGroup}
					<span class="text-muted-foreground">{GENDER_LABELS[row.gender]}</span>
				</Table.Cell>
				<Table.Cell>{row.discipline}</Table.Cell>
				<Table.Cell class="text-right tabular-nums text-muted-foreground">{formatRecTime(row.oldRec)}</Table.Cell>
				<Table.Cell>
					<div class="flex items-center gap-1">
						<Input
							class={cn("h-8 w-28 tabular-nums", change !== 0 && "font-semibold")}
							value={formatRecTime(row.newRec)}
							aria-label="Neuer Rec-Wert {row.ageGroup} {GENDER_LABELS[row.gender]} {row.discipline}"
							onchange={(event) => commit(row, event.currentTarget)}
						/>
						{#if row.edited}
							<Button
								variant="ghost"
								size="icon-sm"
								aria-label="Vorschlag wiederherstellen"
								onclick={() => onedit(recKey(row), null)}
							>
								<RotateCcwIcon />
							</Button>
						{/if}
					</div>
				</Table.Cell>
				<Table.Cell
					class={cn(
						"text-right whitespace-nowrap tabular-nums",
						change === 0 ? "text-muted-foreground" : "font-medium"
					)}
				>
					{formatRecDifference(change)}
				</Table.Cell>
				<Table.Cell>
					<div class="flex flex-col items-start gap-0.5">
						{#if row.edited}
							<Badge variant="outline">Eigener Wert</Badge>
						{:else}
							<Badge variant={source.variant}>{source.label}</Badge>
						{/if}
						{#if row.note}
							<span class="text-xs text-muted-foreground">{row.note}</span>
						{/if}
					</div>
				</Table.Cell>
			</Table.Row>
		{/each}
	</Table.Body>
</Table.Root>
