<script lang="ts">
	import FileCogIcon from "@lucide/svelte/icons/file-cog";
	import type { Snippet } from "svelte";
	import * as Alert from "$lib/components/ui/alert";
	import { Button } from "$lib/components/ui/button";
	import Dropzone from "$lib/components/Dropzone.svelte";
	import type { CheckedFile } from "$lib/components/fileCheck";
	import type { LoadedRulebook, RulebookOutcome } from "$lib/workflows/records";

	interface Props {
		rulebook: LoadedRulebook | null;
		title: string;
		hint: string;
		onfile: (file: CheckedFile) => Promise<RulebookOutcome>;
		/** Weitere Wege, ein Regelwerk zu bekommen (z. B. Download). */
		actions?: Snippet;
	}

	let { rulebook, title, hint, onfile, actions }: Props = $props();

	let replacing = $state(false);
	let error = $state<string | null>(null);

	async function handleFile(file: CheckedFile) {
		const outcome = await onfile(file);
		error = outcome.ok ? null : outcome.message;
		if (outcome.ok) replacing = false;
	}
</script>

<div class="flex flex-col gap-3">
	{#if rulebook && !replacing}
		<div class="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 p-3">
			<FileCogIcon class="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
			<div class="flex min-w-0 flex-1 flex-col">
				<span class="truncate font-medium" title={rulebook.name}>{rulebook.name}</span>
				<span class="text-sm text-muted-foreground">
					„{rulebook.description}“ · {rulebook.records.length} Rec-Werte
				</span>
			</div>
			<Button variant="outline" size="sm" onclick={() => (replacing = true)}>Andere Datei laden</Button>
		</div>
	{:else}
		<Dropzone kinds={["rulebook"]} {title} {hint} compact={rulebook !== null} onfile={handleFile} />
		{#if rulebook}
			<Button variant="ghost" size="sm" class="self-start" onclick={() => (replacing = false)}>
				Bei {rulebook.name} bleiben
			</Button>
		{/if}
	{/if}

	{@render actions?.()}

	{#if error}
		<Alert.Root variant="destructive">
			<Alert.Title>Regelwerk nicht übernommen</Alert.Title>
			<Alert.Description>{error}</Alert.Description>
		</Alert.Root>
	{/if}
</div>
