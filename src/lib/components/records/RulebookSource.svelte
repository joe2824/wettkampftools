<script lang="ts">
	import FileCogIcon from "@lucide/svelte/icons/file-cog";
	import type { Snippet } from "svelte";
	import * as Alert from "$lib/components/ui/alert";
	import { Button } from "$lib/components/ui/button";
	import Dropzone from "$lib/components/Dropzone.svelte";
	import LoadedFileCard from "$lib/components/LoadedFileCard.svelte";
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
		<LoadedFileCard
			icon={FileCogIcon}
			title={rulebook.name}
			tooltip={rulebook.name}
			onreplace={() => (replacing = true)}
		>
			{#snippet details()}„{rulebook.description}“ · {rulebook.records.length} Rec-Werte{/snippet}
		</LoadedFileCard>
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
