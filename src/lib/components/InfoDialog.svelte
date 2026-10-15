<script lang="ts">
	import ExternalLinkIcon from "@lucide/svelte/icons/external-link";
	import RefreshCwIcon from "@lucide/svelte/icons/refresh-cw";
	import { toast } from "svelte-sonner";
	import UpdateChannelSwitch from "$lib/components/UpdateChannelSwitch.svelte";
	import { Badge } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import * as Dialog from "$lib/components/ui/dialog";
	import { APP_NAME, AUTHOR, isPrerelease, openProjectPage, PROJECT_URL } from "$lib/release/about";
	import { updater } from "$lib/release/updater.svelte";
	import { cn } from "$lib/utils.js";
	import { APP_VERSION } from "$lib/version";

	let { open = $bindable(false) }: { open: boolean } = $props();

	const checking = $derived(updater.phase === "checking");

	async function searchUpdates() {
		const phase = await updater.check();
		if (phase === "upToDate") toast.success("Wettkampftools ist auf dem neuesten Stand.");
		else if (phase === "error" && updater.error) toast.error(updater.error);
		else if (phase === "available") open = false;
	}

	async function openLink() {
		try {
			await openProjectPage();
		} catch {
			toast.error("Die Seite konnte nicht geöffnet werden.");
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-sm">
		<Dialog.Header class="items-center text-center">
			<img src="/logo.png" alt="" class="size-16" />
			<Dialog.Title class="text-xl">{APP_NAME}</Dialog.Title>
			<Dialog.Description>Vorbereitung, Auswertung und Urkunden für den DLRG Wellenwettkampf.</Dialog.Description>
		</Dialog.Header>
		<dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
			<dt class="text-muted-foreground">Version</dt>
			<dd class="flex items-center gap-2 tabular-nums">
				{APP_VERSION}
				{#if isPrerelease(APP_VERSION)}<Badge variant="outline">Beta</Badge>{/if}
			</dd>
			<dt class="text-muted-foreground">Autor</dt>
			<dd>{AUTHOR}</dd>
			<dt class="text-muted-foreground">Projektseite</dt>
			<dd>
				<button type="button" class="text-start underline underline-offset-2" onclick={openLink}>
					{PROJECT_URL.replace("https://", "")}
					<ExternalLinkIcon class="inline size-3.5" aria-hidden="true" />
				</button>
			</dd>
		</dl>
		<UpdateChannelSwitch />
		<Dialog.Footer>
			<Button variant="outline" disabled={checking} onclick={searchUpdates}>
				<RefreshCwIcon data-icon="inline-start" class={cn(checking && "animate-spin")} />
				{checking ? "Wird gesucht …" : "Nach Updates suchen"}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
