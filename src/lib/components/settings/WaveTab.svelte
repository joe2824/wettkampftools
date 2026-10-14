<script lang="ts">
	import { Label } from "$lib/components/ui/label";
	import * as Select from "$lib/components/ui/select";
	import { settingsStore } from "$lib/settings/settingsStore.svelte";
	import SettingSwitch from "./SettingSwitch.svelte";

	const settings = $derived(settingsStore.settings);
</script>

<div class="flex flex-col gap-4">
	<div class="flex flex-col gap-2 rounded-lg border border-border p-4">
		<Label for="wave-start">Wellen-Starterlaubnis ab</Label>
		<Select.Root type="single" bind:value={settings.waveStartAgeGroup}>
			<Select.Trigger id="wave-start" class="w-56" aria-describedby="wave-start-hint">
				{settings.waveStartAgeGroup || "Altersklasse wählen"}
			</Select.Trigger>
			<Select.Content>
				{#each settings.ageGroups as ageGroup (ageGroup)}
					<Select.Item value={ageGroup} label={ageGroup}>{ageGroup}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
		<p id="wave-start-hint" class="text-sm text-muted-foreground">
			Mannschaften ab dieser Altersklasse dürfen in der Welle starten.
		</p>
	</div>
	<SettingSwitch
		id="simplify-seniors"
		label="Senioren-Altersklassen zu „AK Senioren“ zusammenfassen"
		description="Senioren-Mannschaften werden gemeinsam unter „AK Senioren“ geführt statt einzeln nach Altersklasse."
		bind:checked={settings.simplifySeniorAgeGroups}
	/>
	<SettingSwitch
		id="exclude-unplaced"
		label="Nicht angetretene Teams bei der Auswertung ausschließen"
		description="Mannschaften ohne Platz zählen bei den Pokalpunkten nicht mit."
		bind:checked={settings.excludeUnplacedTeams}
	/>
</div>
