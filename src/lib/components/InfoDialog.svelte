<script lang="ts">
	import ScaleIcon from "@lucide/svelte/icons/scale";
	import RefreshCwIcon from "@lucide/svelte/icons/refresh-cw";
	import { toast } from "svelte-sonner";
	import ExternalLink from "$lib/components/ExternalLink.svelte";
	import LicensesDialog from "$lib/components/licenses/LicensesDialog.svelte";
	import UpdateChannelSwitch from "$lib/components/UpdateChannelSwitch.svelte";
	import { Badge } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import * as Dialog from "$lib/components/ui/dialog";
	import { APP_NAME, AUTHOR, isPrerelease, PROJECT_URL } from "$lib/release/about";
	import { updater } from "$lib/release/updater.svelte";
	import { cn } from "$lib/utils.js";
	import { APP_VERSION } from "$lib/version";

	let { open = $bindable(false) }: { open: boolean } = $props();

	let licensesOpen = $state(false);

	const checking = $derived(updater.phase === "checking");

	async function searchUpdates() {
		const phase = await updater.check();
		if (phase === "upToDate") toast.success("Wettkampftools ist auf dem neuesten Stand.");
		else if (phase === "error" && updater.error) toast.error(updater.error);
		else if (phase === "available") open = false;
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
				<ExternalLink url={PROJECT_URL}>{PROJECT_URL.replace("https://", "")}</ExternalLink>
			</dd>
		</dl>
		<UpdateChannelSwitch />
		<Dialog.Footer>
			<Button variant="ghost" onclick={() => (licensesOpen = true)}>
				<ScaleIcon data-icon="inline-start" />
				Lizenzen und Quellen
			</Button>
			<Button variant="outline" disabled={checking} onclick={searchUpdates}>
				<RefreshCwIcon data-icon="inline-start" class={cn(checking && "animate-spin")} />
				{checking ? "Wird gesucht …" : "Nach Updates suchen"}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<LicensesDialog bind:open={licensesOpen} />
