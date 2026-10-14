<script lang="ts">
	import SortableList from "$lib/components/SortableList.svelte";
	import { settingsStore } from "$lib/settings/settingsStore.svelte";

	const settings = $derived(settingsStore.settings);
</script>

<p class="mb-4 text-sm text-muted-foreground">
	Diese Altersklassen gelten als Senioren und können in der Wellenwertung zusammengefasst werden.
</p>
<div class="grid gap-6 md:grid-cols-2">
	<section class="flex flex-col gap-3" aria-labelledby="seniors-team">
		<h3 id="seniors-team" class="font-medium">Mannschaft</h3>
		<SortableList bind:items={settings.seniorTeamAgeGroups} addLabel="Hinzufügen" placeholder="z. B. AK 100" />
	</section>
	<section class="flex flex-col gap-3" aria-labelledby="seniors-individual">
		<h3 id="seniors-individual" class="font-medium">Einzel</h3>
		<SortableList bind:items={settings.seniorIndividualAgeGroups} addLabel="Hinzufügen" placeholder="z. B. AK 25" />
	</section>
</div>
