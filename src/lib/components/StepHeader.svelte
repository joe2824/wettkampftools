<script lang="ts">
	import CheckIcon from "@lucide/svelte/icons/check";
	import { cn } from "$lib/utils.js";

	interface Props {
		step: number;
		title: string;
		description?: string;
		done?: boolean;
	}

	let { step, title, description, done = false }: Props = $props();
</script>

<div class="flex items-start gap-3">
	<span
		class={cn(
			"flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold tabular-nums",
			done ? "border-brand bg-brand text-brand-foreground" : "border-border bg-muted text-muted-foreground"
		)}
	>
		{#if done}
			<CheckIcon class="size-4" aria-hidden="true" />
			<span class="sr-only">Schritt {step} erledigt</span>
		{:else}
			<span class="sr-only">Schritt</span>
			{step}
		{/if}
	</span>
	<div class="flex min-w-0 flex-col gap-0.5 pt-1">
		<h2 class="leading-tight font-semibold">{title}</h2>
		{#if description}
			<p class="text-sm text-muted-foreground">{description}</p>
		{/if}
	</div>
</div>
