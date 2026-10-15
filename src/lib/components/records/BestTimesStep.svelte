<script lang="ts">
	import * as Alert from "$lib/components/ui/alert";
	import { Label } from "$lib/components/ui/label";
	import * as Select from "$lib/components/ui/select";
	import Dropzone from "$lib/components/Dropzone.svelte";
	import type { CheckedFile } from "$lib/components/fileCheck";
	import type { BestTimes } from "$lib/records/bestTimes";

	interface Props {
		years: number[];
		/** Gewähltes Jahr als Text, leer ohne Auswahl. */
		year: string;
		bestTimes: BestTimes | null;
		/** Vorjahr des neuen Regelwerks. */
		expectedYear: number;
		onimport: (file: CheckedFile) => void;
	}

	let { years, year = $bindable(), bestTimes, expectedYear, onimport }: Props = $props();
</script>

<div class="flex flex-col gap-4">
	{#if years.length > 0}
		<div class="flex flex-col gap-2">
			<Label for="best-times-year">Bestzeiten aus dem Jahr</Label>
			<Select.Root type="single" bind:value={year}>
				<Select.Trigger id="best-times-year" class="w-40">{year || "Jahr wählen"}</Select.Trigger>
				<Select.Content>
					{#each years as option (option)}
						<Select.Item value={String(option)} label={String(option)}>{option}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
			{#if bestTimes}
				<p class="text-sm text-muted-foreground">{bestTimes.entries.length} Bestzeiten gespeichert.</p>
			{/if}
		</div>
	{/if}

	{#if !years.includes(expectedYear)}
		<Alert.Root>
			<Alert.Title>Keine Bestzeiten aus {expectedYear}</Alert.Title>
			<Alert.Description>
				Bestzeiten werden gespeichert, sobald die Ergebnisdatei bei Auswertung oder Urkunden geladen wird. Eine
				ältere Ergebnisdatei kann auch hier nachgetragen werden.
			</Alert.Description>
		</Alert.Root>
	{/if}

	<Dropzone
		kinds={["excel"]}
		title="Ergebnisdatei nachtragen"
		hint="Excel-Export aus JAuswertung; das Jahr wird aus dem Dateidatum bestimmt."
		compact
		onfile={onimport}
	/>
</div>
