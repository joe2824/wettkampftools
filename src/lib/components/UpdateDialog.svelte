<script lang="ts">
	import * as Alert from "$lib/components/ui/alert";
	import { Badge } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import * as Dialog from "$lib/components/ui/dialog";
	import { Progress } from "$lib/components/ui/progress";
	import { isPrerelease } from "$lib/release/about";
	import { UNKNOWN_PROGRESS, updater } from "$lib/release/updater.svelte";

	const downloading = $derived(updater.phase === "downloading");
	const unknownSize = $derived(updater.progress === UNKNOWN_PROGRESS);
	const prerelease = $derived(isPrerelease(updater.version ?? ""));

	function handleOpenChange(open: boolean) {
		if (!open && !downloading) updater.postpone();
	}
</script>

<Dialog.Root open={updater.dialogOpen && updater.version !== null} onOpenChange={handleOpenChange}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				Neue Version verfügbar
				{#if prerelease}<Badge variant="outline">Beta</Badge>{/if}
			</Dialog.Title>
			<Dialog.Description>
				DLRG Dorheim Wettkampftools {updater.version} kann jetzt installiert werden. Die Anwendung startet danach neu.
				{#if prerelease}
					Das ist eine Vorabversion zum Ausprobieren; sie kann noch Fehler enthalten.
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		{#if updater.notes}
			<div class="max-h-40 overflow-y-auto rounded-lg border border-border bg-muted/30 p-3 text-sm whitespace-pre-line">
				{updater.notes}
			</div>
		{/if}

		{#if downloading}
			<div class="flex flex-col gap-1.5" role="status">
				<Progress value={unknownSize ? null : updater.progress} max={100} aria-label="Fortschritt des Updates" />
				<p class="text-xs text-muted-foreground">
					{unknownSize ? "Wird geladen …" : `${updater.progress} %`}
				</p>
			</div>
		{/if}

		{#if updater.phase === "error" && updater.error}
			<Alert.Root variant="destructive">
				<Alert.Description>{updater.error}</Alert.Description>
			</Alert.Root>
		{/if}

		<Dialog.Footer>
			<Button variant="outline" disabled={downloading} onclick={() => updater.postpone()}>Später</Button>
			<Button disabled={downloading} onclick={() => updater.install()}>
				{downloading ? "Wird installiert …" : "Jetzt aktualisieren"}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
