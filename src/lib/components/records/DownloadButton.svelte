<script lang="ts">
	import DownloadIcon from "@lucide/svelte/icons/download";
	import LoaderCircleIcon from "@lucide/svelte/icons/loader-circle";
	import type { Snippet } from "svelte";
	import { Button } from "$lib/components/ui/button";

	// Lädt eine offizielle Datei von JAuswertung herunter.
	interface Props {
		downloading: boolean;
		onclick: () => void;
		children: Snippet;
	}

	let { downloading, onclick, children }: Props = $props();
</script>

<Button variant="outline" class="self-start" {onclick} disabled={downloading}>
	{#if downloading}
		<LoaderCircleIcon class="animate-spin" data-icon="inline-start" />
	{:else}
		<DownloadIcon data-icon="inline-start" />
	{/if}
	{@render children()}
</Button>
