<script lang="ts">
	import ExternalLink from "$lib/components/ExternalLink.svelte";
	import { parseMarkdown, type Inline } from "$lib/release/markdown";
	import { cn } from "$lib/utils.js";

	let { source, class: className }: { source: string; class?: string } = $props();

	const blocks = $derived(parseMarkdown(source));

	const HEADING_CLASS = { 1: "text-base font-semibold", 2: "text-sm font-semibold", 3: "text-sm font-medium" };
</script>

{#snippet inlines(nodes: Inline[])}
	{#each nodes as node, index (index)}
		{#if node.kind === "text"}{node.text}{:else if node.kind === "strong"}<strong class="font-semibold"
				>{@render inlines(node.children)}</strong
			>{:else if node.kind === "em"}<em>{@render inlines(node.children)}</em>{:else if node.kind === "code"}<code
				class="rounded bg-muted px-1 py-0.5 font-mono text-xs">{node.text}</code
			>{:else}<ExternalLink url={node.url}>{@render inlines(node.children)}</ExternalLink>{/if}
	{/each}
{/snippet}

<div class={cn("flex flex-col gap-2 text-sm", className)}>
	{#each blocks as block, index (index)}
		{#if block.kind === "heading"}
			<p class={cn(HEADING_CLASS[block.level], index > 0 && "pt-1")}>{@render inlines(block.children)}</p>
		{:else if block.kind === "list"}
			<svelte:element
				this={block.ordered ? "ol" : "ul"}
				class={cn("flex flex-col gap-1 ps-5", block.ordered ? "list-decimal" : "list-disc")}
			>
				{#each block.items as item, itemIndex (itemIndex)}
					<li>{@render inlines(item)}</li>
				{/each}
			</svelte:element>
		{:else}
			<p>{@render inlines(block.children)}</p>
		{/if}
	{/each}
</div>
