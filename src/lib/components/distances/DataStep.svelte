<script lang="ts">
	import RefreshCwIcon from "@lucide/svelte/icons/refresh-cw";
	import WifiOffIcon from "@lucide/svelte/icons/wifi-off";
	import * as Alert from "$lib/components/ui/alert";
	import { Button } from "$lib/components/ui/button";
	import { cn } from "$lib/utils.js";
	import { formatDataDate, type OrganisationData } from "$lib/workflows/distances";

	interface Props {
		organisations: OrganisationData | null;
		loading: boolean;
		onrefresh: () => void;
	}

	let { organisations, loading, onrefresh }: Props = $props();

	const data = $derived(organisations?.data ?? null);
	const status = $derived(organisations?.status ?? null);
</script>

<div class="flex flex-col gap-3">
	<div class="flex flex-wrap items-center gap-3">
		<p class="text-sm" role="status">
			{#if loading}
				Standortdaten werden geladen …
			{:else if data}
				{data.organisations.length.toLocaleString("de-DE")} Gliederungen, Stand vom {formatDataDate(data.fetchedAt)}
			{:else}
				Noch keine Standortdaten vorhanden.
			{/if}
		</p>
		<Button variant="outline" size="sm" disabled={loading} onclick={onrefresh}>
			<RefreshCwIcon data-icon="inline-start" class={cn(loading && "animate-spin")} />
			Aktualisieren
		</Button>
	</div>
	{#if status === "offline" && data}
		<Alert.Root>
			<WifiOffIcon />
			<Alert.Title>Keine Verbindung zum DLRG-Standortdienst</Alert.Title>
			<Alert.Description>Es werden die gespeicherten Daten verwendet (Stand vom {formatDataDate(data.fetchedAt)}).</Alert.Description>
		</Alert.Root>
	{:else if status === "unavailable"}
		<Alert.Root variant="destructive">
			<WifiOffIcon />
			<Alert.Title>Standortdaten nicht verfügbar</Alert.Title>
			<Alert.Description>Bitte die Internetverbindung prüfen und „Aktualisieren“ wählen.</Alert.Description>
		</Alert.Root>
	{/if}
</div>
