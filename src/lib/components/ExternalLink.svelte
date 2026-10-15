<script lang="ts">
	import ExternalLinkIcon from "@lucide/svelte/icons/external-link";
	import type { Snippet } from "svelte";
	import { toast } from "svelte-sonner";
	import { openExternalUrl } from "$lib/release/about";

	let { url, children }: { url: string; children: Snippet } = $props();

	async function open() {
		try {
			await openExternalUrl(url);
		} catch {
			toast.error("Die Seite konnte nicht geöffnet werden.");
		}
	}
</script>

<button type="button" class="text-start underline underline-offset-2" onclick={open}>
	{@render children()}
	<ExternalLinkIcon class="inline size-3.5" aria-hidden="true" />
</button>
