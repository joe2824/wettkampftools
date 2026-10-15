<script lang="ts">
	import LightbulbIcon from "@lucide/svelte/icons/lightbulb";
	import { toast } from "svelte-sonner";
	import * as Alert from "$lib/components/ui/alert";
	import type { CheckedFile } from "$lib/components/fileCheck";
	import CheckStep from "$lib/components/preparation/CheckStep.svelte";
	import EventStep from "$lib/components/preparation/EventStep.svelte";
	import ExportStep from "$lib/components/preparation/ExportStep.svelte";
	import LoadStep from "$lib/components/preparation/LoadStep.svelte";
	import { preparationSteps } from "$lib/components/preparation/preparationSteps";
	import TeamNamesCard from "$lib/components/preparation/TeamNamesCard.svelte";
	import WaveStep from "$lib/components/preparation/WaveStep.svelte";
	import Stepper from "$lib/components/stepper/Stepper.svelte";
	import { session } from "$lib/session.svelte";
	import { settingsStore } from "$lib/settings/settingsStore.svelte";
	import { defaultWaveSelection } from "$lib/wwk/registrationExport";
	import {
		checkRegistration,
		loadRegistrations,
		registrationSettingsKey,
		registrationYearWarning,
		type PreparationCheck
	} from "$lib/workflows/preparation";
	import { refreshTeamNames } from "$lib/workflows/teamNames";

	let loadError = $state<string | null>(null);
	let fileYearWarning = $state<number | null>(null);
	let exportedFor = $state.raw<PreparationCheck | null>(null);

	const settings = $derived(settingsStore.settings);
	const registration = $derived(session.registration);
	const check = $derived(registration ? checkRegistration(registration, settings) : null);
	const settingsKey = $derived(registrationSettingsKey(settings));
	const steps = $derived(
		preparationSteps({
			event: settings.event,
			hasRegistration: registration !== null,
			errorCount: check?.errors.length ?? 0,
			exported: check !== null && exportedFor === check
		})
	);

	function load(bytes: Uint8Array, fileName: string): boolean {
		let outcome;
		try {
			outcome = loadRegistrations(bytes, fileName, settings);
		} catch {
			loadError = "Die Datei konnte nicht gelesen werden.";
			return false;
		}
		if (!outcome.ok) {
			loadError = outcome.message;
			return false;
		}
		loadError = null;
		session.setRegistration(outcome.registration);
		return true;
	}

	function handleFile(file: CheckedFile) {
		if (!load(file.bytes, file.name)) return;
		fileYearWarning = registrationYearWarning(file);
		toast.success("Meldedatei geladen");
	}

	// Geänderte Altersklassen-Einstellungen: Datei neu einlesen, Wellenauswahl neu vorbelegen.
	$effect(() => {
		const current = session.registration;
		if (!current || current.settingsKey === settingsKey) return;
		if (load(current.sourceBytes, current.fileName)) {
			toast.info("Einstellungen geändert", { description: "Die Meldedatei wurde neu eingelesen." });
		}
	});

	// Eigene Mannschaftsnamen sofort anwenden; Wellenauswahl bleibt.
	$effect(() => {
		const current = session.registration;
		if (!current || current.settingsKey !== settingsKey) return;
		const next = refreshTeamNames(current, settings.teamNameOverrides);
		if (next) session.setRegistration(next);
	});

	function resetWave() {
		if (registration) session.setWaveSelection(defaultWaveSelection(registration.teams, settings));
	}
</script>

<div class="page-width flex flex-col gap-6">
	<header class="flex flex-col gap-1">
		<h1 class="text-2xl font-bold">Vorbereitung</h1>
		<p class="text-muted-foreground">
			Meldungen aus dem DLRG-Meldeportal prüfen, Wellenstarter wählen und für JAuswertung speichern.
		</p>
	</header>

	{#if settings.rulebook === null}
		<Alert.Root>
			<LightbulbIcon />
			<Alert.Title>Tipp</Alert.Title>
			<Alert.Description>
				Regelwerk in den Einstellungen laden, dann prüft die App die Altersklassen wie JAuswertung.
			</Alert.Description>
		</Alert.Root>
	{/if}

	<Stepper page="preparation" {steps}>
		{#snippet children(step)}
			{#if step.id === "event"}
				<EventStep />
			{:else if step.id === "load"}
				<LoadStep {registration} error={loadError} yearWarning={fileYearWarning} onfile={handleFile} />
			{:else if step.id === "check" && registration && check}
				<CheckStep {check} renames={registration.renames} />
				<TeamNamesCard teams={registration.teams} />
			{:else if step.id === "wave" && registration}
				<WaveStep
					teams={registration.teams}
					selection={registration.waveSelection}
					eligible={defaultWaveSelection(registration.teams, settings)}
					onchange={(selection) => session.setWaveSelection(selection)}
					onreset={resetWave}
				/>
			{:else if step.id === "export" && check}
				<ExportStep {check} onexported={() => (exportedFor = check)} />
			{/if}
		{/snippet}
	</Stepper>
</div>
