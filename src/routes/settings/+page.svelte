<script lang="ts">
	import { beforeNavigate } from "$app/navigation";
	import * as Tabs from "$lib/components/ui/tabs";
	import AgeGroupsTab from "$lib/components/settings/AgeGroupsTab.svelte";
	import CertificatesTab from "$lib/components/settings/CertificatesTab.svelte";
	import RulebookTab from "$lib/components/settings/RulebookTab.svelte";
	import SeniorsTab from "$lib/components/settings/SeniorsTab.svelte";
	import SettingsActions from "$lib/components/settings/SettingsActions.svelte";
	import WaveTab from "$lib/components/settings/WaveTab.svelte";
	import { settingsStore } from "$lib/settings/settingsStore.svelte";

	const LEAVE_QUESTION = "Es gibt ungespeicherte Änderungen. Seite trotzdem verlassen?";

	const tabs = [
		{ value: "wave", label: "Wellenwettkampf", component: WaveTab },
		{ value: "ageGroups", label: "Altersklassen", component: AgeGroupsTab },
		{ value: "seniors", label: "Senioren", component: SeniorsTab },
		{ value: "certificates", label: "Urkunden", component: CertificatesTab },
		{ value: "rulebook", label: "Regelwerk", component: RulebookTab }
	];

	let active = $state("wave");

	// Schließen des Fensters ist ausgenommen: dort gibt es keine eigene Rückfrage.
	beforeNavigate(({ cancel, type }) => {
		if (type === "leave" || !settingsStore.dirty) return;
		if (!confirm(LEAVE_QUESTION)) cancel();
	});
</script>

<div class="page-width flex flex-col gap-6">
	<header class="flex flex-col gap-1">
		<h1 class="text-2xl font-bold">Einstellungen</h1>
		<p class="text-muted-foreground">
			Altersklassen, Wertung und Urkunden einstellen. Die Veranstaltung wird in der Vorbereitung eingetragen. Änderungen
			gelten nach dem Speichern.
		</p>
	</header>

	<Tabs.Root bind:value={active}>
		<Tabs.List class="h-auto flex-wrap">
			{#each tabs as tab (tab.value)}
				<Tabs.Trigger value={tab.value}>{tab.label}</Tabs.Trigger>
			{/each}
		</Tabs.List>
		{#each tabs as tab (tab.value)}
			<Tabs.Content value={tab.value} class="pt-4">
				<tab.component />
			</Tabs.Content>
		{/each}
	</Tabs.Root>

	<SettingsActions />
</div>
