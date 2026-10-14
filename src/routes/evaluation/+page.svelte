<script lang="ts">
	import AwardIcon from "@lucide/svelte/icons/award";
	import InfoIcon from "@lucide/svelte/icons/info";
	import EvaluationActions from "$lib/components/evaluation/EvaluationActions.svelte";
	import NotScoredCard from "$lib/components/evaluation/NotScoredCard.svelte";
	import RulesCard from "$lib/components/evaluation/RulesCard.svelte";
	import StandingsList from "$lib/components/evaluation/StandingsList.svelte";
	import ResultsSource from "$lib/components/ResultsSource.svelte";
	import StepHeader from "$lib/components/StepHeader.svelte";
	import * as Alert from "$lib/components/ui/alert";
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import * as Tabs from "$lib/components/ui/tabs";
	import { session } from "$lib/session.svelte";
	import { settingsStore } from "$lib/settings/settingsStore.svelte";
	import { computeEvaluation } from "$lib/workflows/evaluation";
	import { needsYearConfirmation, YEAR_CONFIRMATION_HINT } from "$lib/workflows/results";
	import { trophyRulesText } from "$lib/wwk/rulesText";

	const settings = $derived(settingsStore.settings);
	const results = $derived(session.results);
	// Rechnet bei geänderten Einstellungen (Altersklassen, Ausschluss) automatisch neu.
	const evaluationState = $derived(results ? computeEvaluation(results, settings) : null);
	const evaluation = $derived(evaluationState?.status === "ready" ? evaluationState.evaluation : null);
	const locked = $derived(needsYearConfirmation(results));
	const rules = $derived(trophyRulesText({ excludeUnplaced: settings.excludeUnplacedTeams }));
</script>

<div class="mx-auto flex max-w-5xl flex-col gap-6">
	<header class="flex flex-col gap-1">
		<h1 class="text-2xl font-bold">Auswertung</h1>
		<p class="text-muted-foreground">
			Gesamtpokale für Rettungs- und Wellenwertung aus der JAuswertung-Ergebnisdatei berechnen.
		</p>
	</header>

	<Card.Root>
		<Card.Content class="flex flex-col gap-4">
			<StepHeader
				step={1}
				title="Ergebnisdatei"
				description="Excel-Export aus JAuswertung laden – er wird danach auch für die Urkunden genutzt."
				done={evaluation !== null && !locked}
			/>
			<ResultsSource {results} />
			{#if evaluationState?.status === "individualOnly"}
				<Alert.Root>
					<InfoIcon />
					<Alert.Title>Keine Pokalwertung</Alert.Title>
					<Alert.Description>
						<p>{evaluationState.message}</p>
						<Button href="/certificates" size="sm" class="mt-2">
							<AwardIcon data-icon="inline-start" />
							Zu den Urkunden
						</Button>
					</Alert.Description>
				</Alert.Root>
			{/if}
		</Card.Content>
	</Card.Root>

	{#if evaluation && results && locked}
		<p class="text-sm text-muted-foreground">{YEAR_CONFIRMATION_HINT}</p>
	{:else if evaluation && results}
		<Card.Root>
			<Card.Content class="flex flex-col gap-4">
				<StepHeader
					step={2}
					title="Gesamtwertung prüfen"
					description="Pokalpunkte je Ortsgruppe. Eine Zeile aufklappen, um die Rechnung zu sehen."
				/>
				<Tabs.Root value="rescue">
					<Tabs.List>
						<Tabs.Trigger value="rescue">Rettungswertung</Tabs.Trigger>
						<Tabs.Trigger value="wave">Wellenwertung</Tabs.Trigger>
					</Tabs.List>
					<Tabs.Content value="rescue" class="pt-3">
						<StandingsList ranking={evaluation.rescue} />
					</Tabs.Content>
					<Tabs.Content value="wave" class="pt-3">
						<StandingsList ranking={evaluation.wave} />
					</Tabs.Content>
				</Tabs.Root>
			</Card.Content>
		</Card.Root>

		{#if evaluation.notScored.length > 0}
			<NotScoredCard entries={evaluation.notScored} />
		{/if}

		<Card.Root>
			<Card.Content class="flex flex-col gap-4">
				<StepHeader
					step={3}
					title="Speichern"
					description="Aushang zum Ausdrucken und Excel-Datei für die Unterlagen."
				/>
				<EvaluationActions {results} {evaluation} />
			</Card.Content>
		</Card.Root>

		<RulesCard paragraphs={rules} />
	{/if}
</div>
