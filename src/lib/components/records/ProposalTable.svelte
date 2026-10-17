<script lang="ts">
	import CheckIcon from "@lucide/svelte/icons/check";
	import RotateCcwIcon from "@lucide/svelte/icons/rotate-ccw";
	import { toast } from "svelte-sonner";
	import { Badge, type BadgeVariant } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import * as Table from "$lib/components/ui/table";
	import { formatRecDifference, formatRecTime, parseRecTime } from "$lib/format/time";
	import { difference, type RecStatus, type ResolvedRecRow } from "$lib/records/proposal";
	import { recKey, type RecordGender } from "$lib/records/rulebookRecords";
	import { cn } from "$lib/utils.js";

	interface Props {
		rows: ResolvedRecRow[];
		/** null setzt den Vorschlag wieder ein. */
		onedit: (key: string, rec: number | null) => void;
		/** Wellen-Rekord übernehmen. */
		onaccept: (key: string) => void;
	}

	let { rows, onedit, onaccept }: Props = $props();

	const GENDER_LABELS: Record<RecordGender, string> = { female: "weiblich", male: "männlich" };
	const STATUS: Record<RecStatus, { label: string; variant: BadgeVariant }> = {
		adopted: { label: "Übernommen", variant: "default" },
		unchanged: { label: "Unverändert", variant: "secondary" },
		record: { label: "Neuer Rekord", variant: "outline" },
		noRecord: { label: "Kein neuer Rekord", variant: "secondary" },
		missing: { label: "Bitte prüfen", variant: "destructive" },
		edited: { label: "Eigener Wert", variant: "outline" }
	};
	const ROW_CLASSES: Partial<Record<RecStatus, string>> = {
		adopted: "bg-primary/5",
		record: "bg-primary/10",
		missing: "bg-destructive/5",
		edited: "bg-primary/5"
	};

	/** Übernommene Rekorde und eigene Werte lassen sich auf den Vorschlag zurücksetzen. */
	const canRestore = (row: ResolvedRecRow): boolean =>
		row.status === "edited" || (row.status === "adopted" && row.source === "bestTime");

	function commit(row: ResolvedRecRow, input: HTMLInputElement) {
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
			<Table.Head class="w-56">Neu</Table.Head>
			<Table.Head class="text-right">Änderung</Table.Head>
			<Table.Head>Stand</Table.Head>
		</Table.Row>
	</Table.Header>
	<Table.Body>
		{#each rows as row (recKey(row))}
			{@const status = STATUS[row.status]}
			{@const change = difference(row)}
			<Table.Row class={ROW_CLASSES[row.status]} data-status={row.status}>
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
						{#if row.status === "record" && row.proposedRec !== null}
							<Button size="sm" onclick={() => onaccept(recKey(row))}>
								<CheckIcon data-icon="inline-start" />
								{formatRecTime(row.proposedRec)} übernehmen
							</Button>
						{:else if canRestore(row)}
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
						<Badge variant={status.variant}>{status.label}</Badge>
						{#if row.note}
							<span class="text-xs text-muted-foreground">{row.note}</span>
						{/if}
						{#if row.status === "edited" && change > 0}
							<span class="text-xs text-destructive">Langsamer als bisher.</span>
						{/if}
					</div>
				</Table.Cell>
			</Table.Row>
		{/each}
	</Table.Body>
</Table.Root>
