<script lang="ts">
	import ArrowLeftIcon from "@lucide/svelte/icons/arrow-left";
	import ArrowRightIcon from "@lucide/svelte/icons/arrow-right";
	import type { Snippet } from "svelte";
	import { untrack } from "svelte";
	import ActionBar from "$lib/components/ActionBar.svelte";
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import { cn } from "$lib/utils.js";
	import { activeSteps } from "./activeSteps.svelte";
	import StepButton from "./StepButton.svelte";
	import { canEnter, firstOpen, nextStep, prevStep, resolveActive, type Step } from "./stepper";

	interface Props {
		/** Seite, für die der aktive Schritt gemerkt wird. */
		page: string;
		steps: Step[];
		/** Inhalt eines Schritts; sichtbar ist nur der aktive. */
		children: Snippet<[Step]>;
		/** Seitenbezogene Aktionen in der Leiste unten, vor „Weiter“. */
		actions?: Snippet;
	}

	let { page, steps, children, actions }: Props = $props();

	// Anfangs der erste nicht erledigte Schritt; danach bestimmt nur der Benutzer den Schritt.
	untrack(() => {
		const initial = firstOpen(steps);
		if (initial) activeSteps.init(page, initial.id);
	});

	const activeId = $derived(resolveActive(steps, activeSteps.get(page)));
	const activeIndex = $derived(steps.findIndex((step) => step.id === activeId));
	const active = $derived(steps[activeIndex]);
	const previous = $derived(prevStep(steps, activeId));
	const next = $derived(nextStep(steps, activeId));

	let root = $state<HTMLElement | null>(null);

	function go(step: Step | null) {
		if (!step || !canEnter(steps, step.id) || step.id === activeId) return;
		activeSteps.set(page, step.id);
		// Nach „Weiter“ am Seitenende den neuen Schritt von oben zeigen.
		if (root && root.getBoundingClientRect().top < 0) root.scrollIntoView({ block: "start" });
	}
</script>

<div class="flex scroll-mt-4 flex-col gap-4" bind:this={root}>
	<nav aria-label="Schritte" class="overflow-x-auto">
		<ol class="flex min-w-max items-center gap-1 py-1 sm:min-w-0">
			{#each steps as step, index (step.id)}
				<li class={cn("flex items-center gap-1", index < steps.length - 1 && "sm:flex-1")}>
					<StepButton {step} number={index + 1} active={step.id === activeId} onselect={() => go(step)} />
					{#if index < steps.length - 1}
						<span
							class={cn(
								"h-px w-6 shrink-0 sm:w-auto sm:flex-1",
								step.status === "done" ? "bg-primary/60" : "bg-border"
							)}
							aria-hidden="true"
						></span>
					{/if}
				</li>
			{/each}
		</ol>
	</nav>

	{#if active}
		<Card.Root>
			<Card.Content class="flex flex-col gap-4">
				<div class="flex flex-col gap-0.5">
					<h2 class="text-lg leading-tight font-semibold">{active.label}</h2>
					{#if active.description}
						<p class="text-sm text-muted-foreground">{active.description}</p>
					{/if}
				</div>
				<!-- Betretbare Schritte bleiben eingehängt, damit Eingaben und Ergebnisse beim Wechseln erhalten bleiben. -->
				{#each steps as step (step.id)}
					{#if step.status !== "locked"}
						<div class={cn("flex-col gap-4", step.id === activeId ? "flex" : "hidden")}>
							{@render children(step)}
						</div>
					{/if}
				{/each}
			</Card.Content>
		</Card.Root>

		<ActionBar label="Schritt-Navigation">
			{#snippet start()}
				<Button variant="ghost" disabled={!previous} onclick={() => go(previous)}>
					<ArrowLeftIcon data-icon="inline-start" />
					Zurück
				</Button>
			{/snippet}
			{#snippet end()}
				{@render actions?.()}
				{#if next}
					{#if next.status === "locked" && next.lockedReason}
						<p class="text-sm text-muted-foreground">{next.lockedReason}</p>
					{/if}
					<Button disabled={next.status === "locked"} onclick={() => go(next)}>
						Weiter: {next.label}
						<ArrowRightIcon data-icon="inline-end" />
					</Button>
				{/if}
			{/snippet}
		</ActionBar>
	{/if}
</div>
