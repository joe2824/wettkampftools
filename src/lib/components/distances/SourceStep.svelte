<script lang="ts">
	import ClipboardListIcon from "@lucide/svelte/icons/clipboard-list";
	import Dropzone from "$lib/components/Dropzone.svelte";
	import type { CheckedFile } from "$lib/components/fileCheck";
	import { Button } from "$lib/components/ui/button";
	import { session } from "$lib/session.svelte";
	import { organisationsFromCsv, organisationsFromTeams } from "$lib/workflows/distances";

	interface Props {
		sourceLabel: string | null;
		onnames: (names: string[], sourceLabel: string) => void;
	}

	let { sourceLabel, onnames }: Props = $props();
	let error = $state<string | null>(null);

	function useSession() {
		const registration = session.registration;
		if (!registration) return;
		error = null;
		onnames(organisationsFromTeams(registration.teams), registration.fileName);
	}

	function handleFile(file: CheckedFile) {
		let outcome;
		try {
			outcome = organisationsFromCsv(file.bytes);
		} catch {
			error = "Die Datei konnte nicht gelesen werden.";
			return;
		}
		if (!outcome.ok) {
			error = outcome.message;
			return;
		}
		error = null;
		onnames(outcome.names, file.name);
	}
</script>

<div class="flex flex-col gap-4">
	<div class="flex flex-wrap items-center gap-3">
		<Button variant="outline" disabled={!session.hasRegistration} onclick={useSession}>
			<ClipboardListIcon data-icon="inline-start" />
			Gliederungen aus der Vorbereitung verwenden
		</Button>
		{#if !session.hasRegistration}
			<span class="text-sm text-muted-foreground">Dafür zuerst in der Vorbereitung eine Meldedatei laden.</span>
		{/if}
	</div>
	<Dropzone
		kinds={["csv"]}
		compact
		title="Oder Meldedatei hier ablegen"
		hint="Mannschaften-Export aus dem DLRG-Meldeportal (.csv)."
		onfile={handleFile}
	/>
	{#if error}
		<p class="text-sm text-destructive" role="alert">{error}</p>
	{/if}
	{#if sourceLabel}
		<p class="text-sm text-muted-foreground" role="status">Verwendet: <span class="font-medium text-foreground">{sourceLabel}</span></p>
	{/if}
</div>
