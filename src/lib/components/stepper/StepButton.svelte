<script lang="ts">
	import CheckIcon from "@lucide/svelte/icons/check";
	import * as Tooltip from "$lib/components/ui/tooltip";
	import { cn } from "$lib/utils.js";
	import type { Step } from "./stepper";

	interface Props {
		step: Step;
		number: number;
		active: boolean;
		onselect: () => void;
	}

	let { step, number, active, onselect }: Props = $props();

	const locked = $derived(step.status === "locked");
	const STATUS_TEXT: Record<Step["status"], string> = {
		done: "erledigt",
		warning: "bitte prüfen",
		open: "offen",
		locked: "gesperrt"
	};
</script>

{#snippet button(props: Record<string, unknown> = {})}
	<button
		{...props}
		type="button"
		class={cn(
			"group flex shrink-0 items-center gap-2 rounded-md px-1.5 py-1 text-left text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
			locked ? "cursor-not-allowed text-muted-foreground/70" : "hover:bg-muted",
			active && "font-semibold"
		)}
		aria-current={active ? "step" : undefined}
		aria-disabled={locked}
		aria-label="Schritt {number}: {step.label} ({STATUS_TEXT[step.status]})"
		onclick={() => !locked && onselect()}
	>
		<span
			class={cn(
				"relative flex size-8 items-center justify-center rounded-full border text-sm font-semibold tabular-nums transition-colors",
				step.status === "done" && "border-primary bg-primary text-primary-foreground",
				step.status !== "done" && "border-border bg-muted text-muted-foreground",
				active && step.status !== "done" && "border-primary bg-background text-foreground",
				active && "ring-3 ring-ring/40",
				locked && "opacity-60"
			)}
			aria-hidden="true"
		>
			{#if step.status === "done"}
				<CheckIcon class="size-4" />
			{:else}
				{number}
			{/if}
			{#if step.status === "warning"}
				<span class="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-destructive ring-2 ring-background"></span>
			{/if}
		</span>
		<span class={cn("whitespace-nowrap", !active && !locked && "text-muted-foreground group-hover:text-foreground")}>
			{step.label}
		</span>
	</button>
{/snippet}

{#if locked && step.lockedReason}
	<Tooltip.Root>
		<Tooltip.Trigger>
			{#snippet child({ props })}
				{@render button(props)}
			{/snippet}
		</Tooltip.Trigger>
		<Tooltip.Content>{step.lockedReason}</Tooltip.Content>
	</Tooltip.Root>
{:else}
	{@render button()}
{/if}
