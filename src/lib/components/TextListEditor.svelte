<script lang="ts">
	import CheckIcon from "@lucide/svelte/icons/check";
	import CopyIcon from "@lucide/svelte/icons/copy";
	import { toast } from "svelte-sonner";
	import { Button } from "$lib/components/ui/button";
	import { Textarea } from "$lib/components/ui/textarea";
	import { formatTextList, parseTextList } from "./sortableList";

	interface Props {
		items: string[];
		label: string;
	}

	const MIN_ROWS = 6;

	let { items = $bindable(), label }: Props = $props();

	let text = $state("");
	let hint = $state<string | null>(null);
	let lastApplied = "";

	// Von außen geänderte Einträge übernehmen, solange nichts ungespeichert getippt wurde.
	$effect.pre(() => {
		const formatted = formatTextList(items);
		if (text === lastApplied && formatted !== lastApplied) {
			text = formatted;
			lastApplied = formatted;
		}
	});

	const changed = $derived(text !== formatTextList(items));
	const rows = $derived(Math.max(MIN_ROWS, text.split("\n").length + 1));

	function apply() {
		const result = parseTextList(text);
		items = result.list;
		text = formatTextList(result.list);
		lastApplied = text;
		hint =
			result.duplicates.length > 0
				? `${result.duplicates.length} doppelte ${result.duplicates.length === 1 ? "Zeile wurde" : "Zeilen wurden"} entfernt.`
				: null;
	}

	async function copy() {
		try {
			await navigator.clipboard.writeText(formatTextList(items));
			toast.success("Liste kopiert");
		} catch {
			toast.error("Kopieren hat nicht geklappt. Bitte den Text markieren und kopieren.");
		}
	}
</script>

<div class="flex flex-col gap-2">
	<Textarea
		bind:value={text}
		{rows}
		aria-label={label}
		class="font-mono text-sm"
		onblur={() => changed && apply()}
		oninput={() => (hint = null)}
	/>
	<p class="text-xs text-muted-foreground">Ein Eintrag pro Zeile. Leere Zeilen und doppelte Einträge werden entfernt.</p>
	<div class="flex flex-wrap items-center gap-2">
		<Button variant="outline" size="sm" disabled={!changed} onclick={apply}>
			<CheckIcon data-icon="inline-start" />
			Übernehmen
		</Button>
		<Button variant="ghost" size="sm" onclick={copy}>
			<CopyIcon data-icon="inline-start" />
			Kopieren
		</Button>
		{#if hint}
			<span class="text-xs text-muted-foreground" role="status">{hint}</span>
		{/if}
	</div>
</div>
