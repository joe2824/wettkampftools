<script lang="ts">
	import TrophyIcon from "@lucide/svelte/icons/trophy";
	import * as Alert from "$lib/components/ui/alert";
	import { formatRecTime } from "$lib/format/time";
	import type { RecordGender } from "$lib/records/rulebookRecords";
	import type { NewWaveRecord } from "$lib/records/waveRecords";
	import type { SessionResults } from "$lib/session.svelte";
	import { findNewWaveRecords } from "$lib/workflows/results";

	// Zeigt nach dem Laden der Ergebnisdatei, welche Wellen-Zeiten einen Rekord aller bisherigen Jahre unterbieten.
	interface Props {
		results: SessionResults;
	}

	let { results }: Props = $props();

	const GENDER_LABELS: Record<RecordGender, string> = { female: "weiblich", male: "männlich" };

	const pending = $derived(findNewWaveRecords(results));

	function previousText({ previous }: NewWaveRecord): string {
		if (previous === null) return "bisher kein Rekord";
		return `bisher ${formatRecTime(previous.time)} aus ${previous.year}`;
	}
</script>

{#await pending then records}
	{#if records.length > 0}
		<Alert.Root class="border-primary/40 bg-primary/5">
			<TrophyIcon />
			<Alert.Title class="text-base">
				{records.length === 1 ? "Neuer Rekord in der Welle" : `${records.length} neue Rekorde in der Welle`}
			</Alert.Title>
			<Alert.Description>
				<ul class="list-disc pl-4">
					{#each records as entry (`${entry.record.ageGroup}|${entry.record.gender}|${entry.record.discipline}`)}
						<li>
							<span class="font-medium text-foreground">
								{entry.record.ageGroup}
								{GENDER_LABELS[entry.record.gender]} · {entry.record.discipline}: {formatRecTime(entry.record.time)}
							</span>
							({previousText(entry)})
						</li>
					{/each}
				</ul>
				<p class="mt-1">Die Rekorde sind gespeichert und stehen beim Regelwerk fürs neue Jahr bereit.</p>
			</Alert.Description>
		</Alert.Root>
	{/if}
{/await}
