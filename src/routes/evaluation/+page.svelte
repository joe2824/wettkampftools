<script lang="ts">
	import AwardIcon from "@lucide/svelte/icons/award";
	import InfoIcon from "@lucide/svelte/icons/info";
	import EvaluationActions from "$lib/components/evaluation/EvaluationActions.svelte";
	import { evaluationSteps } from "$lib/components/evaluation/evaluationSteps";
	import NotScoredCard from "$lib/components/evaluation/NotScoredCard.svelte";
	import RulesCard from "$lib/components/evaluation/RulesCard.svelte";
	import StandingsList from "$lib/components/evaluation/StandingsList.svelte";
	import ResultsSource from "$lib/components/ResultsSource.svelte";
	import Stepper from "$lib/components/stepper/Stepper.svelte";
	import * as Alert from "$lib/components/ui/alert";
	import { Button } from "$lib/components/ui/button";
	import * as Tabs from "$lib/components/ui/tabs";
	import { session } from "$lib/session.svelte";
	import { settingsStore } from "$lib/settings/settingsStore.svelte";
	import { computeEvaluation } from "$lib/workflows/evaluation";
	import { needsYearConfirmation } from "$lib/workflows/results";
	import { trophyRulesText } from "$lib/wwk/rulesText";

	const settings = $derived(settingsStore.settings);
	const results = $derived(session.results);
	// Rechnet bei geänderten Einstellungen (Altersklassen, Ausschluss) automatisch neu.
	const evaluationState = $derived(results ? computeEvaluation(results, settings) : null);
	const evaluation = $derived(evaluationState?.status === "ready" ? evaluationState.evaluation : null);
	const steps = $derived(
		evaluationSteps({
			hasResults: results !== null,
			yearPending: needsYearConfirmation(results),
			individualOnly: evaluationState?.status === "individualOnly"
		})
	);
	const rules = $derived(trophyRulesText({ excludeUnplaced: settings.excludeUnplacedTeams }));
</script>

<div class="mx-auto flex max-w-5xl flex-col gap-6">
	<header class="flex flex-col gap-1">
		<h1 class="text-2xl font-bold">Auswertung</h1>
		<p class="text-muted-foreground">
			Gesamtpokale für Rettungs- und Wellenwertung aus der JAuswertung-Ergebnisdatei berechnen.
		</p>
	</header>

	<Stepper page="evaluation" {steps}>
		{#snippet children(step)}
			{#if step.id === "results"}
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
			{:else if step.id === "standings" && evaluation}
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
				{#if evaluation.notScored.length > 0}
					<NotScoredCard entries={evaluation.notScored} />
				{/if}
				<RulesCard paragraphs={rules} />
			{:else if step.id === "save" && evaluation && results}
				<EvaluationActions {results} {evaluation} />
			{/if}
		{/snippet}
	</Stepper>
</div>
