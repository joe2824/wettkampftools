<script lang="ts">
	import InfoIcon from "@lucide/svelte/icons/info";
	import { toast } from "svelte-sonner";
	import * as Alert from "$lib/components/ui/alert";
	import type { CheckedFile } from "$lib/components/fileCheck";
	import {
		downloadOfficialRulebook,
		readRulebookFile,
		type LoadedRulebook,
		type RulebookOutcome
	} from "$lib/workflows/records";
	import DownloadButton from "./DownloadButton.svelte";
	import RulebookSource from "./RulebookSource.svelte";

	interface Props {
		official: LoadedRulebook | null;
		/** Jahr des neuen Regelwerks. */
		year: number;
	}

	let { official = $bindable(), year }: Props = $props();

	let downloading = $state(false);

	async function handleFile(file: CheckedFile): Promise<RulebookOutcome> {
		const outcome = readRulebookFile(file.name, file.bytes);
		if (outcome.ok) official = outcome.rulebook;
		return outcome;
	}

	async function download() {
		downloading = true;
		const outcome = await downloadOfficialRulebook(year);
		downloading = false;
		if (!outcome.ok) {
			toast.error(outcome.message);
			return;
		}
		official = outcome.rulebook;
		toast.success(`Offizielles Regelwerk ${year} geladen`);
	}
</script>

<div class="flex flex-col gap-4">
	<RulebookSource
		rulebook={official}
		title="Offizielles Regelwerk (.rwm)"
		hint="Datei aus dem JAuswertung-Projekt, z. B. „DLRG {year}.rwm“."
		onfile={handleFile}
	>
		{#snippet actions()}
			<DownloadButton {downloading} onclick={download}>„DLRG {year}“ aus dem Internet laden</DownloadButton>
		{/snippet}
	</RulebookSource>

	<Alert.Root>
		<InfoIcon aria-hidden="true" />
		<Alert.Title>Woher kommen die Werte?</Alert.Title>
		<Alert.Description>
			<p>
				Die Rettungsdisziplinen übernehmen die Rec-Werte aus dem offiziellen DLRG-Regelwerk. Für die Wellendisziplinen
				gilt der Rekord aller bisherigen Wettkämpfe (Werkzeuge → Wellen-Zeiten).
			</p>
			<p>
				Das Regelwerk für das Jahr {year} („DLRG {year}.rwm“) lädt die App aus dem Internet, aus dem öffentlichen
				JAuswertung-Projekt auf GitHub; eine Installation von JAuswertung ist dafür nicht nötig. Ist es dort noch nicht
				veröffentlicht, erscheint ein Hinweis – dann später erneut versuchen oder die Datei aus einem
				JAuswertung-Programmordner wählen.
			</p>
		</Alert.Description>
	</Alert.Root>
</div>
