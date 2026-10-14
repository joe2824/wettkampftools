<script lang="ts">
	import SortableList from "$lib/components/SortableList.svelte";
	import { settingsStore } from "$lib/settings/settingsStore.svelte";

	const settings = $derived(settingsStore.settings);
</script>

<div class="flex max-w-lg flex-col gap-3">
	<p class="text-sm text-muted-foreground">
		Reihenfolge wie in der Auswertung. Ziehen oder die Pfeile nutzen, um umzusortieren.
	</p>
	<SortableList bind:items={settings.ageGroups} addLabel="Altersklasse hinzufügen" placeholder="z. B. AK 12" />
</div>
