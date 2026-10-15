<script lang="ts">
	import type { Snippet } from "svelte";

	interface Props {
		/** Name der Leiste für Screenreader. */
		label: string;
		/** Hauptaktion links. */
		start?: Snippet;
		/** Weitere Aktionen rechts. */
		end?: Snippet;
	}

	let { label, start, end }: Props = $props();
</script>

<div
	role="toolbar"
	aria-label={label}
	class="action-bar sticky bottom-0 z-10 mt-auto flex flex-wrap items-center gap-2 border-t border-border bg-background/95 py-3 backdrop-blur supports-backdrop-filter:bg-background/80"
>
	{#if start}
		<div data-slot="action-bar-start" class="flex flex-wrap items-center gap-2">
			{@render start()}
		</div>
	{/if}
	{#if end}
		<div data-slot="action-bar-end" class="ms-auto flex flex-wrap items-center justify-end gap-2">
			{@render end()}
		</div>
	{/if}
</div>

<style>
	/*
	 * Leiste reicht über die ganze Breite des Inhaltsbereichs (main ist Container mit p-6),
	 * die Knöpfe bleiben in der Spalte der Seite. Unten schließt sie bündig mit dem Fenster ab.
	 */
	.action-bar {
		--page-padding: 1.5rem;
		--bleed: calc(50cqw - 50% + var(--page-padding));
		margin-inline: calc(-1 * var(--bleed));
		margin-bottom: calc(-1 * var(--page-padding));
		padding-inline: var(--bleed);
	}
</style>
