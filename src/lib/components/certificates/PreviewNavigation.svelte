<script lang="ts">
	import ChevronLeftIcon from "@lucide/svelte/icons/chevron-left";
	import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
	import ChevronsLeftIcon from "@lucide/svelte/icons/chevrons-left";
	import ChevronsRightIcon from "@lucide/svelte/icons/chevrons-right";
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { parsePageNumber } from "./certificatePreview";

	interface Props {
		/** Aktuelle Seite ab 0. */
		index: number;
		count: number;
		onchange: (index: number) => void;
	}

	let { index, count, onchange }: Props = $props();

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
	<Button variant="outline" size="icon" aria-label="Letzte Seite" disabled={atEnd} onclick={() => onchange(count - 1)}>
		<ChevronsRightIcon />
	</Button>
</div>
