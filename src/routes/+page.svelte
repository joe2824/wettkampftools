<script lang="ts">
	import ArrowRightIcon from "@lucide/svelte/icons/arrow-right";
	import { Badge } from "$lib/components/ui/badge";
	import { buttonVariants } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import CompetitionStatus from "$lib/components/home/CompetitionStatus.svelte";
	import EventSummary from "$lib/components/home/EventSummary.svelte";
	import ProjectDrop from "$lib/components/home/ProjectDrop.svelte";
	import RecUpdateHint from "$lib/components/records/RecUpdateHint.svelte";
	import { FOOTER_ITEMS, NAVIGATION_GROUPS } from "$lib/navigation";
	import { shouldShowRecUpdateHint } from "$lib/records/updateHint";
	import { session } from "$lib/session.svelte";
	import { settingsStore } from "$lib/settings/settingsStore.svelte";

	const [competition, toolGroup] = NAVIGATION_GROUPS;
	const tools = [...toolGroup.items, ...FOOTER_ITEMS];

	const STEP_DETAILS: Record<string, { description: string; loaded: () => boolean }> = {
		"/preparation": {
			description:
				"Veranstaltung eintragen, Meldedatei aus dem DLRG-Meldeportal aufbereiten und für JAuswertung speichern.",
			loaded: () => session.hasRegistration
		},
		"/evaluation": {
			description: "Ergebnisse aus JAuswertung laden und den Gesamtpokal berechnen.",
			loaded: () => session.hasResults
		},
		"/certificates": {
			description: "Urkunden auswählen, sortieren und drucken.",
			loaded: () => session.hasResults
		}
	};

	const showRecHint = $derived(
		shouldShowRecUpdateHint({
			hasResults: session.hasResults,
			eventDate: settingsStore.settings.event.date,
			today: new Date()
		})
	);

	const steps = $derived(
		competition.items.map((item, index) => ({
			...item,
			number: index + 1,
			description: STEP_DETAILS[item.href]?.description ?? "",
			loaded: STEP_DETAILS[item.href]?.loaded() ?? false
		}))
	);
</script>

<div class="page-width flex flex-col gap-8">
	<header class="flex items-center gap-4">
		<img src="/logo.png" alt="" class="size-14 shrink-0" />
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">Willkommen bei den Wettkampftools</h1>
			<p class="text-muted-foreground">
				Vorbereitung, Auswertung und Urkunden für den DLRG Wellenwettkampf – Schritt für Schritt.
			</p>
		</div>
	</header>

	<EventSummary />

	<CompetitionStatus />

	{#if showRecHint}
		<RecUpdateHint />
	{/if}

	<section aria-label="Ablauf des Wettkampfs" class="grid gap-4 md:grid-cols-3">
		{#each steps as step (step.href)}
			<Card.Root class="flex flex-col">
				<Card.Header>
					<div class="flex items-center justify-between gap-2">
						<span class="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
							<step.icon class="size-5" aria-hidden="true" />
						</span>
						<Badge variant={step.loaded ? "default" : "outline"}>{step.loaded ? "Datei geladen" : "offen"}</Badge>
					</div>
					<Card.Title class="mt-2">{step.number}. {step.label}</Card.Title>
					<Card.Description>{step.description}</Card.Description>
				</Card.Header>
				<Card.Footer class="mt-auto">
					<a href={step.href} class={buttonVariants({ variant: step.loaded ? "outline" : "default" })}>
						Öffnen
						<ArrowRightIcon data-icon="inline-end" />
					</a>
				</Card.Footer>
			</Card.Root>
		{/each}
	</section>

	<ProjectDrop />

	<section aria-labelledby="tools-heading" class="flex flex-col gap-3">
		<h2 id="tools-heading" class="text-sm font-medium text-muted-foreground">Werkzeuge</h2>
		<div class="flex flex-wrap gap-2">
			{#each tools as tool (tool.href)}
				<a href={tool.href} class={buttonVariants({ variant: "outline" })}>
					<tool.icon data-icon="inline-start" />
					{tool.label}
				</a>
			{/each}
		</div>
	</section>
</div>
