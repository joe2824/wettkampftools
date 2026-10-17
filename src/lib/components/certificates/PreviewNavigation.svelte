<script lang="ts">
	import ChevronLeftIcon from "@lucide/svelte/icons/chevron-left";
	import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
	import ChevronsLeftIcon from "@lucide/svelte/icons/chevrons-left";
	import ChevronsRightIcon from "@lucide/svelte/icons/chevrons-right";
	import SkipBackIcon from "@lucide/svelte/icons/skip-back";
	import SkipForwardIcon from "@lucide/svelte/icons/skip-forward";
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { parsePageNumber } from "./certificatePreview";

	interface Props {
		/** Aktuelle Seite ab 0. */
		index: number;
		count: number;
		/** Seiten des vorherigen und nächsten Platzes; null ohne Sprungziel oder ohne Mehrfach-Urkunden. */
		previousEntry: number | null;
		nextEntry: number | null;
		onchange: (index: number) => void;
	}

	let { index, count, previousEntry, nextEntry, onchange }: Props = $props();

	const entryJumps = $derived(previousEntry !== null || nextEntry !== null);

	const atStart = $derived(index <= 0);
	const atEnd = $derived(index >= count - 1);

	function jump(event: Event & { currentTarget: HTMLInputElement }) {
		const target = parsePageNumber(event.currentTarget.value, count);
		if (target === null) event.currentTarget.value = String(index + 1);
		else onchange(target);
	}
</script>

<div class="flex flex-wrap items-center justify-center gap-2">
	<Button variant="outline" size="icon" aria-label="Erste Seite" disabled={atStart} onclick={() => onchange(0)}>
		<ChevronsLeftIcon />
	</Button>
	{#if entryJumps}
		<Button
			variant="outline"
			disabled={previousEntry === null || previousEntry === index}
			onclick={() => previousEntry !== null && onchange(previousEntry)}
		>
			<SkipBackIcon data-icon="inline-start" />
			Vorheriger Platz
		</Button>
	{/if}
	<Button variant="outline" disabled={atStart} onclick={() => onchange(index - 1)}>
		<ChevronLeftIcon data-icon="inline-start" />
		Vorherige
	</Button>
	<div class="flex items-center gap-2 text-sm">
		<Label for="preview-page" class="font-normal">Seite</Label>
		<Input
			id="preview-page"
			type="number"
			min={1}
			max={count}
			value={index + 1}
			class="w-20 tabular-nums"
			onchange={jump}
		/>
		<span class="text-muted-foreground tabular-nums">von {count}</span>
	</div>
	<Button variant="outline" disabled={atEnd} onclick={() => onchange(index + 1)}>
		Nächste
		<ChevronRightIcon data-icon="inline-end" />
	</Button>
	{#if entryJumps}
		<Button
			variant="outline"
			disabled={nextEntry === null || nextEntry === index}
			onclick={() => nextEntry !== null && onchange(nextEntry)}
		>
			Nächster Platz
			<SkipForwardIcon data-icon="inline-end" />
		</Button>
	{/if}
	<Button variant="outline" size="icon" aria-label="Letzte Seite" disabled={atEnd} onclick={() => onchange(count - 1)}>
		<ChevronsRightIcon />
	</Button>
</div>
