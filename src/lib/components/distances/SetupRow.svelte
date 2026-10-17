<script lang="ts">
	import CheckIcon from "@lucide/svelte/icons/check";
	import type { Snippet } from "svelte";
	import { cn } from "$lib/utils.js";

	// Erledigter Schritt in einer Zeile, damit die Liste darunter den Platz bekommt.
	interface Props {
		label: string;
		done: boolean;
		children: Snippet;
	}

	let { label, done, children }: Props = $props();
</script>

<div class="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
	<span
		class={cn(
			"flex size-6 shrink-0 items-center justify-center rounded-full border",
			done ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted text-muted-foreground"
		)}
		aria-hidden="true"
	>
		{#if done}
			<CheckIcon class="size-3.5" />
		{/if}
	</span>
	<span class="w-28 shrink-0 font-medium">{label}</span>
	<div class="flex min-w-0 flex-1 flex-wrap items-center gap-3">
		{@render children()}
	</div>
</div>
